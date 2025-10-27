import React, { useState, useEffect } from 'react';
import { usersAPI, User, UserCreate } from '../../api/users';
import { User as AuthUser } from '../../api/auth';
import { brandsAPI, Brand } from '../../api/brands';
import { rolesAPI, Role } from '../../api/roles';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState<number | null>(null);
  const [onlyEmployees, setOnlyEmployees] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const { user: currentUser, loading: authLoading } = useAuth();
  const perPage = 10;

  const employeeRole = roles.find(r => r.name === 'market_personel');

  useEffect(() => {
    if (authLoading) return; // Wait for auth to complete
    
    loadUsers();
    loadBrands();
    loadRoles();
  }, [page, roleFilter, brandFilter, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // When toggling onlyEmployees, set/clear roleFilter accordingly
    if (onlyEmployees && employeeRole) {
      setRoleFilter(employeeRole.display_name);
    } else if (onlyEmployees && !employeeRole) {
      toast.error('Çalışan rolü bulunamadı');
      setOnlyEmployees(false);
    } else if (!onlyEmployees) {
      setRoleFilter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyEmployees, employeeRole?.id]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers(page, perPage, roleFilter || undefined, brandFilter || undefined);
      setUsers(response.users);
      setTotal(response.total);
    } catch (error: any) {
      toast.error(error.message || 'Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getBrands(1, 1000);
      setBrands(response.brands);
    } catch {}
  };

  const loadRoles = async () => {
    try {
      const response = await rolesAPI.getRoles();
      setRoles(response.roles);
    } catch {}
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await usersAPI.createUser(userData as UserCreate);
      toast.success('Kullanıcı başarıyla oluşturuldu');
      setShowCreateModal(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Kullanıcı oluşturulamadı');
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!editingUser) return;
    try {
      // Şifre değişikliği yapılıyorsa mail gönder, yapılmıyorsa gönderme
      const hasPasswordChange = userData.password && userData.password.trim() !== '';
      await usersAPI.updateUser(editingUser.id, userData, hasPasswordChange);
      toast.success('Kullanıcı başarıyla güncellendi');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Kullanıcı güncellenemedi');
    }
  };

  const handleUpdateUserSilent = async (userData: any) => {
    if (!editingUser) return;
    try {
      await usersAPI.updateUser(editingUser.id, userData);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      throw error; // Re-throw to be handled by caller
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.is_active) {
        await usersAPI.deactivateUser(user.id);
        toast.success('Kullanıcı pasifleştirildi');
      } else {
        await usersAPI.activateUser(user.id);
        toast.success('Kullanıcı aktifleştirildi');
      }
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || 'Kullanıcı durumu güncellenemedi');
    }
  };


  const displayedUsers = users.filter(u => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q)
    );
  });

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
          <p className="text-gray-600">Sistem kullanıcılarını ve çalışanları yönetin</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={18} className="mr-2" />
          Kullanıcı Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="form-label">Arama</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" placeholder="Kullanıcılarda ara..." />
            </div>
          </div>
          <div>
            <label className="form-label">Rol</label>
            <select value={roleFilter} onChange={(e) => { setOnlyEmployees(false); setRoleFilter(e.target.value); }} className="form-input" disabled={onlyEmployees}>
              <option value="">Tüm Roller</option>
              {roles.map(role => (
                <option key={role.id} value={role.display_name}>{role.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Marka</label>
            <select value={brandFilter || ''} onChange={(e) => setBrandFilter(e.target.value ? Number(e.target.value) : null)} className="form-input">
              <option value="">Tüm Markalar</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button onClick={() => { setSearchTerm(''); setRoleFilter(''); setBrandFilter(null); setOnlyEmployees(false); }} className="btn btn-secondary w-full">Filtreleri Temizle</button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8"><div className="spinner"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Ad Soyad</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">E-posta</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Rol</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Markalar</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Durum</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Son Giriş</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {displayedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          {user.is_2fa_enabled && (
                            <span className="text-xs text-green-600">2FA Aktif</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {user.brand_ids && user.brand_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.brand_ids.map(brandId => {
                            const brand = brands.find(b => b.id === brandId);
                            return (
                              <span key={brandId} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {brand?.name || `Brand #${brandId}`}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Marka yok</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-sm">
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('tr-TR')
                        : 'Hiç'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingUser(user)} className="p-1 text-gray-400 hover:text-blue-600" title="Kullanıcıyı düzenle">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleToggleUserStatus(user)} className={`p-1 ${
                            user.is_active 
                              ? 'text-gray-400 hover:text-red-600' 
                              : 'text-gray-400 hover:text-green-600'
                          }`} title={user.is_active ? 'Kullanıcıyı pasifleştir' : 'Kullanıcıyı aktifleştir'}>
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > perPage && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {total} kullanıcıdan {((page - 1) * perPage) + 1}-{Math.min(page * perPage, total)} arası gösteriliyor
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Önceki</button>
              <button onClick={() => setPage(page + 1)} disabled={page * perPage >= total} className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed">Sonraki</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {(showCreateModal || editingUser) && (
        <UserModal
          user={editingUser}
          brands={brands}
          roles={roles}
          onClose={() => { setShowCreateModal(false); setEditingUser(null); }}
          onSave={editingUser ? handleUpdateUser : handleCreateUser}
          onSaveSilent={handleUpdateUserSilent}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

// User Modal Component remains unchanged
interface UserModalProps {
  user?: User | null;
  brands: Brand[];
  roles: Role[];
  onClose: () => void;
  onSave: (userData: any) => Promise<void>;
  onSaveSilent: (userData: any) => Promise<void>;
  currentUser: AuthUser | null; // Yeni eklenen prop - auth.ts'den User tipini kullan
}

const UserModal: React.FC<UserModalProps> = ({ user, brands, roles, onClose, onSave, onSaveSilent, currentUser }) => {
  
  const [formData, setFormData] = useState<any>({
    email: user?.email || '',
    password: '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    role_id: user?.role_id || undefined,
    brand_ids: user?.brand_ids || [],
  });
  // Şifre değişikliği için state'ler
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role_id: user.role_id || undefined,
        brand_ids: user.brand_ids || [],
      });
      // Kullanıcı kendi hesabını düzenliyorsa şifre alanlarını göster
      if (currentUser && currentUser.id === user.id) {
        setShowPasswordFields(true);
      } else {
        setShowPasswordFields(false);
      }
    }
  }, [user, currentUser]);

  
  const selectedRole = roles.find(r => r.id === formData.role_id);
  const isSuperAdmin = selectedRole?.name === 'super_admin';
  const isBrandManager = selectedRole?.name === 'brand_manager';
  const isMarketManager = selectedRole?.name === 'market_manager';
  const isEmployeeRole = !!selectedRole && !isSuperAdmin && !isBrandManager && !isMarketManager;


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: name === 'role_id' ? Number(value) : value,
    }));
  };

  // Şifre alanlarını güncelleyen fonksiyon
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBrandToggle = (brandId: number, checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      brand_ids: checked ? [...prev.brand_ids, brandId] : prev.brand_ids.filter((id: number) => id !== brandId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!user && !formData.password) {
        toast.error('Password is required for new users');
        return;
      }
      if (!formData.role_id) {
        toast.error('Rol seçiniz');
        return;
      }
      // Require at least one brand for brand managers and employees
      if ((isBrandManager || isEmployeeRole) && (!formData.brand_ids || formData.brand_ids.length === 0)) {
        toast.error(isBrandManager ? 'Yönetici için en az bir marka seçiniz' : 'Çalışan için en az bir marka seçiniz');
        return;
      }
      
      // Kullanıcı kendi şifresini değiştiriyorsa
      if (user && showPasswordFields) {
        // Şifre değişikliği yapılacaksa, mevcut ve yeni şifre alanlarını kontrol et
        if (passwordData.newPassword) {
          if (!passwordData.currentPassword) {
            toast.error('Mevcut şifrenizi giriniz');
            return;
          }
          
          try {
            // Sadece şifre değişikliğini yap (kullanıcı bilgileri güncellenmesin)
            await usersAPI.updatePassword(user.id, {
              current_password: passwordData.currentPassword,
              new_password: passwordData.newPassword
            });
            
            toast.success('Şifre başarıyla güncellendi');
            setPasswordData({ currentPassword: '', newPassword: '' });
            
            // Şifre değişikliği sonrası kullanıcıyı logout yap
            if (currentUser && currentUser.id === user.id) {
              // Kendi şifresini değiştirdiyse logout yap
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
              return;
            }
            
            onClose();
          } catch (error: any) {
            toast.error(error.message || 'Şifre güncellenemedi');
          }
          return;
        }
      }
      
      // Admin başka bir kullanıcının şifresini sıfırlıyorsa
      if (user && !showPasswordFields) {
        // Şifre değişikliği yapılacaksa
        if (passwordData.newPassword) {
          try {
            // Sadece admin şifre sıfırlaması yap (kullanıcı bilgileri güncellenmesin)
            await usersAPI.updatePassword(user.id, {
              new_password: passwordData.newPassword
            });
            
            toast.success('Şifre başarıyla güncellendi');
            setPasswordData({ currentPassword: '', newPassword: '' });
            onClose();
          } catch (error: any) {
            toast.error(error.message || 'Şifre güncellenemedi');
          }
          return;
        }
      }
      
      // Şifre değişikliği yapılmıyorsa, sadece kullanıcı bilgilerini güncelle
      const payload = { ...formData };
      if (user) {
        delete payload.password;
      }
      await onSave(payload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">{user ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Oluştur'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Ad</label>
                <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} className="form-input" required />
              </div>
              <div>
                <label className="form-label">Soyad</label>
                <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} className="form-input" required />
              </div>
            </div>
            <div>
              <label className="form-label">E-posta</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" required />
            </div>
            {/* Yeni kullanıcı oluştururken şifre alanı */}
            {!user && (
              <div>
                <label className="form-label">Şifre</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="form-input" required />
              </div>
            )}
            
            {/* Şifre Değişikliği Alanları - Sadece kullanıcı kendi hesabını düzenliyorsa gösterilir */}
            {showPasswordFields && (
              <>
                <div>
                  <label className="form-label">Mevcut Şifre</label>
                  <input 
                    type="password" 
                    name="currentPassword" 
                    value={passwordData.currentPassword} 
                    onChange={handlePasswordChange} 
                    className="form-input" 
                    required={!!passwordData.newPassword} // Yeni şifre girildiyse mevcut şifre gerekli
                  />
                </div>
                <div>
                  <label className="form-label">Yeni Şifre</label>
                  <input 
                    type="password" 
                    name="newPassword" 
                    value={passwordData.newPassword} 
                    onChange={handlePasswordChange} 
                    className="form-input" 
                  />
                </div>
              </>
            )}
            
            {/* Admin başka bir kullanıcının şifresini sıfırlıyorsa - sadece yeni şifre alanı */}
            {!showPasswordFields && user && (
              <div>
                <label className="form-label">Yeni Şifre (Kullanıcı için sıfırla)</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  value={passwordData.newPassword} 
                  onChange={handlePasswordChange} 
                  className="form-input" 
                />
              </div>
            )}
            <div>
              <label className="form-label">Rol</label>
              <select name="role_id" value={formData.role_id || ''} onChange={handleChange} className="form-input" required>
                <option value="">Rol Seçin</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
            </div>

            {(isBrandManager || isMarketManager || isEmployeeRole) && (
              <div>
                <label className="form-label">Markalar</label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                  {brands.map(brand => (
                    <label key={brand.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={formData.brand_ids.includes(brand.id)} onChange={(e) => handleBrandToggle(brand.id, e.target.checked)} className="rounded" />
                      <span className="text-sm">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <button 
                type="submit" 
                className="btn btn-primary flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'İşleniyor...' : (user ? 'Kullanıcıyı Güncelle' : 'Kullanıcı Oluştur')}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">İptal</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Users;
