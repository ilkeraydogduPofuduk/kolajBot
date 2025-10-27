import React, { useState, useEffect, useCallback } from 'react';
import { rolesAPI, Role, Permission, RoleCreate } from '../../api/roles';
import { Plus, Search, Edit, Shield, Users, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';


const Roles: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await rolesAPI.getRoles();
      setRoles(response.roles);
    } catch (error) {
      toast.error('Roller yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPermissions = useCallback(async () => {
    try {
      const response = await rolesAPI.getPermissions();
      setPermissions(response.permissions);
    } catch (error) {
      // Silently handle error - permissions are not critical for basic functionality
    }
  }, []);

  const handleCreateRole = async (roleData: RoleCreate | Partial<RoleCreate>) => {
    try {
      await rolesAPI.createRole(roleData as RoleCreate);
      toast.success('Rol başarıyla oluşturuldu');
      setShowCreateModal(false);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Rol oluşturulamadı');
    }
  };

  const handleUpdateRole = async (roleData: Partial<RoleCreate>) => {
    if (!editingRole) return;
    
    try {
      await rolesAPI.updateRole(editingRole.id, roleData);
      toast.success('Rol başarıyla güncellendi');
      setEditingRole(null);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Rol güncellenemedi');
    }
  };

  const handleToggleRoleStatus = async (role: Role) => {
    if (role.is_system_role) {
      toast.error('Sistem rolleri değiştirilemez');
      return;
    }

    try {
      await rolesAPI.toggleRoleStatus(role.id);
      toast.success(`Rol ${role.is_active ? 'pasifleştirildi' : 'aktifleştirildi'}`);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Rol durumu değiştirilemedi');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system_role) {
      toast.error('Sistem rolleri silinemez');
      return;
    }

    if (role.user_count && role.user_count > 0) {
      toast.error('Bu role sahip kullanıcılar olduğu için silinemez');
      return;
    }

    if (!window.confirm(`"${role.display_name}" rolünü silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await rolesAPI.deleteRole(role.id);
      toast.success('Rol başarıyla silindi');
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Rol silinemedi');
    }
  };

  const getModules = () => {
    const moduleSet = new Set(permissions.map(p => p.module));
    const modules: string[] = [];
    moduleSet.forEach(module => modules.push(module));
    return modules;
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const RoleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: RoleCreate | Partial<RoleCreate>) => Promise<void>;
    role?: Role | null;
    title: string;
  }> = ({ isOpen, onClose, onSubmit, role, title }) => {
    const [formData, setFormData] = useState<Partial<RoleCreate>>({
      name: '',
      display_name: '',
      description: '',
      permission_ids: [],
    });

    const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());

    useEffect(() => {
      if (role) {
        setFormData({
          name: role.name,
          display_name: role.display_name,
          description: role.description,
          permission_ids: role.permissions.map(p => p.id),
        });
        setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
      } else {
        setFormData({
          name: '',
          display_name: '',
          description: '',
          permission_ids: [],
        });
        setSelectedPermissions(new Set());
      }
    }, [role]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.display_name) {
        toast.error('Rol adı zorunludur');
        return;
      }

      // Sistem adını display name'den oluştur
      const systemName = formData.display_name!
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Type validation
      const validatedData: RoleCreate = {
        name: formData.name || systemName,
        display_name: formData.display_name!,
        description: formData.description || '',
        permission_ids: Array.from(selectedPermissions),
      };

      await onSubmit(validatedData);
    };

    const togglePermission = (permissionId: number) => {
      const newSelected = new Set(selectedPermissions);
      if (newSelected.has(permissionId)) {
        newSelected.delete(permissionId);
      } else {
        newSelected.add(permissionId);
      }
      setSelectedPermissions(newSelected);
      setFormData({
        ...formData,
        permission_ids: Array.from(newSelected),
      });
    };

    const toggleModulePermissions = (module: string) => {
      const modulePermissions = permissions.filter(p => p.module === module);
      const modulePermissionIds = modulePermissions.map(p => p.id);
      const allSelected = modulePermissionIds.every(id => selectedPermissions.has(id));

      const newSelected = new Set(selectedPermissions);
      if (allSelected) {
        // Tüm modül izinlerini kaldır
        modulePermissionIds.forEach(id => newSelected.delete(id));
      } else {
        // Tüm modül izinlerini ekle
        modulePermissionIds.forEach(id => newSelected.add(id));
      }

      setSelectedPermissions(newSelected);
      setFormData({
        ...formData,
        permission_ids: Array.from(newSelected),
      });
    };

    if (!isOpen) return null;

    const groupedPermissions = permissions.reduce((groups, permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol Adı *
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: İçerik Editörü"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sistem Adı
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Otomatik oluşturulur"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Boş bırakılırsa rol adından otomatik oluşturulur
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Rol açıklaması..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                İzinler ({selectedPermissions.size} seçili)
              </label>
              
              <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                  const modulePermissionIds = modulePermissions.map(p => p.id);
                  const allSelected = modulePermissionIds.every(id => selectedPermissions.has(id));
                  const someSelected = modulePermissionIds.some(id => selectedPermissions.has(id));

                  return (
                    <div key={module} className="border-b border-gray-100 pb-3 last:border-b-0">
                      <div className="flex items-center mb-2">
                        <button
                          type="button"
                          onClick={() => toggleModulePermissions(module)}
                          className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium ${
                            allSelected
                              ? 'bg-blue-100 text-blue-800'
                              : someSelected
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {allSelected ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : someSelected ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <div className="h-4 w-4 border border-gray-300 rounded" />
                          )}
                          {module.charAt(0).toUpperCase() + module.slice(1)}
                          <span className="text-xs">
                            ({modulePermissions.filter(p => selectedPermissions.has(p.id)).length}/{modulePermissions.length})
                          </span>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {modulePermissions.map(permission => (
                          <label
                            key={permission.id}
                            className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {permission.display_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                {role ? 'Güncelle' : 'Oluştur'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const PermissionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    role: Role | null;
  }> = ({ isOpen, onClose, role }) => {
    if (!isOpen || !role) return null;

    const rolePermissions = role.permissions || [];
    const groupedPermissions = rolePermissions.reduce((groups, permission) => {
      if (!groups[permission.module]) {
        groups[permission.module] = [];
      }
      groups[permission.module].push(permission);
      return groups;
    }, {} as Record<string, Permission[]>);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{role.display_name} - İzinler</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {Object.keys(groupedPermissions).length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Bu rol için henüz izin tanımlanmamış</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                <div key={module} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3 capitalize">
                    {module} Modülü ({modulePermissions.length} izin)
                  </h3>
                  <div className="space-y-2">
                    {modulePermissions.map(permission => (
                      <div key={permission.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm text-gray-900">
                            {permission.display_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {permission.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rol Yönetimi</h1>
          <p className="text-gray-600">Sistem rollerini ve izinlerini yönetin</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus size={18} className="mr-2" />
          Yeni Rol Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rol ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Modüller</option>
            {getModules().map(module => (
              <option key={module} value={module}>{module.charAt(0).toUpperCase() + module.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Roles Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Roller yükleniyor...</span>
            </div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Henüz rol bulunmuyor</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Açıklama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı Sayısı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            role.is_system_role
                              ? 'bg-red-100'
                              : 'bg-blue-100'
                          }`}>
                            <Shield className={`h-4 w-4 ${
                              role.is_system_role
                                ? 'text-red-600'
                                : 'text-blue-600'
                            }`} />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {role.display_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {role.name}
                            {role.is_system_role && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Sistem Rolü
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {role.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {role.user_count || 0} kullanıcı
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        role.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {role.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRole(role);
                            setShowPermissionsModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="İzinleri Görüntüle"
                        >
                          <Shield size={16} />
                        </button>
                        
                        {!role.is_system_role && (
                          <>
                            <button
                              onClick={() => setEditingRole(role)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Düzenle"
                            >
                              <Edit size={16} />
                            </button>
                            
                            <button
                              onClick={() => handleToggleRoleStatus(role)}
                              className={role.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                              title={role.is_active ? "Pasifleştir" : "Aktifleştir"}
                            >
                              {role.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            
                            {(!role.user_count || role.user_count === 0) && (
                              <button
                                onClick={() => handleDeleteRole(role)}
                                className="text-red-600 hover:text-red-900"
                                title="Sil"
                              >
                                <XCircle size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <RoleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateRole}
        title="Yeni Rol Oluştur"
      />

      <RoleModal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        onSubmit={handleUpdateRole}
        role={editingRole}
        title="Rol Düzenle"
      />

      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        role={selectedRole}
      />
    </div>
  );
};

export default Roles;
