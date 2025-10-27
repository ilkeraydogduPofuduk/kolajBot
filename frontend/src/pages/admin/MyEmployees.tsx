import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usersAPI } from '../../api/users';
import { brandsAPI, Brand } from '../../api/brands';
// import { branchesAPI } from '../../api/branches';
import { User, Building2, Users, Search, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { usePageTexts } from '../../hooks/usePageTexts';
import toast from 'react-hot-toast';

interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_id: number;
  brand_ids: number[];
  branch_id?: number | null;
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

const MyEmployees: React.FC = () => {
  const { user } = useAuth();
  const { getTitle, getDescription } = usePageTexts();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      
      // Kullanıcının markalarına ait çalışanları getir
      const [usersResponse, brandsResponse] = await Promise.allSettled([
        usersAPI.getUsers(1, 1000),
        brandsAPI.getBrands(1, 1000)
      ]);

      if (usersResponse.status === 'fulfilled') {
        // Sadece kullanıcıya ait markalarda olan çalışanları filtrele
        // ve kendi kendini hariç tut
        const filteredEmployees = usersResponse.value.users.filter(emp => 
          emp.id !== user?.id && // Kendisini hariç tut
          emp.brand_ids && 
          emp.brand_ids.some(brandId => 
            user?.brand_ids && user.brand_ids.includes(brandId)
          )
        );
        setEmployees(filteredEmployees);
      }

      if (brandsResponse.status === 'fulfilled') {
        // Kullanıcının erişimi olan markaları filtrele
        const userBrands = brandsResponse.value.brands.filter(brand => 
          user?.brand_ids && user.brand_ids.includes(brand.id)
        );
        setBrands(userBrands);
      }
    } catch (error) {
      toast.error('Çalışanlar yüklenirken bir hata oluştu');
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.brand_ids]);

  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user, loadEmployees]);

  // Filtreleme işlemi
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.first_name} ${emp.last_name} ${emp.email}`.toLowerCase()
      .includes(searchTerm.toLowerCase());
    
    const matchesBrand = !selectedBrand || 
      (emp.brand_ids && emp.brand_ids.includes(selectedBrand));
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && emp.is_active) || 
      (statusFilter === 'inactive' && !emp.is_active);

    return matchesSearch && matchesBrand && matchesStatus;
  });

  

  const handleEditEmployee = (employeeId: number) => {
    toast(`Çalışan düzenleme: ${employeeId}`);
  };

  const handleDeleteEmployee = (employeeId: number) => {
    toast(`Çalışan silme: ${employeeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Çalışanlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 animate-fade-in">
            {getTitle('my_employees')}
          </h1>
          <p className="text-gray-600 mt-2">
            {getDescription('my_employees_description')}
          </p>
        </div>
        
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Çalışan ara..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedBrand || ''}
            onChange={(e) => setSelectedBrand(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Tüm Markalar</option>
            {brands.map(brand => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
          
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
          >
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredEmployees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marka</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Giriş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => {
                  const brandNames = brands
                    .filter(brand => employee.brand_ids?.includes(brand.id))
                    .map(brand => brand.name)
                    .join(', ');
                  
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.first_name} {employee.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                          {brandNames || 'Belirtilmemiş'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          employee.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {employee.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Pasif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.last_login ? new Date(employee.last_login).toLocaleDateString('tr-TR') : 'Henüz giriş yok'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditEmployee(employee.id)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Düzenle"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Çalışan bulunamadı</h3>
            <p className="text-gray-500">Filtrelerinize uygun çalışan bulunmamaktadır.</p>
          </div>
        )}
        
        {filteredEmployees.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Önceki
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Toplam <span className="font-medium">{filteredEmployees.length}</span> çalışan
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEmployees;