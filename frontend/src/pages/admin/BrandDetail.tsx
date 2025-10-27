import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, MessageSquare, Package, FileText, Calendar, Globe, Mail, Phone, Trash2, Plus, Eye, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { brandsAPI, Brand } from '../../api/brands';
import { usersAPI, User } from '../../api/users';
import { socialMediaChannelsAPI, SocialMediaChannel } from '../../api/socialMediaChannels';
import { productsAPI, Product } from '../../api/products';
import { templatesAPI, Template } from '../../api/templates';
import { categoriesAPI, Category } from '../../api/categories';
import { useAuth } from '../../hooks/useAuth';

interface BrandDetailProps {}

const BrandDetail: React.FC<BrandDetailProps> = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [channels, setChannels] = useState<SocialMediaChannel[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'channels' | 'products' | 'templates'>('overview');

  useEffect(() => {
    if (id) {
      loadBrandDetail();
    }
  }, [id]);

  const loadBrandDetail = async () => {
    try {
      setLoading(true);
      
      // Marka bilgilerini yükle
      const brandData = await brandsAPI.getBrand(parseInt(id!));
      setBrand(brandData);
      
      // Kategori bilgisini yükle
      if (brandData.category_id) {
        try {
          const categoryData = await categoriesAPI.getCategory(brandData.category_id);
          setCategory(categoryData);
        } catch (error) {
          console.log('Category API not available or error:', error);
          setCategory(null);
        }
      }
      
      // Kullanıcıları yükle
      try {
        const usersData = await usersAPI.getUsers(1, 1000);
        const brandUsers = usersData.users.filter(user => 
          user.brand_ids && user.brand_ids.includes(brandData.id)
        );
        setUsers(brandUsers);
      } catch (error) {
        console.log('Users API not available or error:', error);
        setUsers([]);
      }
      
      // Sosyal medya kanallarını yükle
      try {
        const channelsData = await socialMediaChannelsAPI.getChannels(1, 100);
        const brandChannels = channelsData.channels.filter(channel => 
          channel.brand_id === brandData.id
        );
        setChannels(brandChannels);
      } catch (error) {
        console.log('Social media channels API not available or error:', error);
        setChannels([]);
      }
      
      // Ürünleri yükle (eğer API varsa)
      try {
        const productsData = await productsAPI.getProducts(1, 100);
        const brandProducts = productsData.products.filter(product => 
          product.brand_id === brandData.id
        );
        setProducts(brandProducts);
      } catch (error) {
        console.log('Products API not available');
        setProducts([]);
      }
      
      // Şablonları yükle (eğer API varsa)
      try {
        const templatesData = await templatesAPI.getTemplates({ skip: 0, limit: 100 });
        const brandTemplates = templatesData.data.filter((template: Template) => 
          template.brand_id === brandData.id
        );
        setTemplates(brandTemplates);
      } catch (error) {
        // Templates API not available yet
        setTemplates([]);
      }
      
    } catch (error: any) {
      console.error('❌ Marka detayları yüklenemedi:', error);
      toast.error('Marka detayları yüklenemedi: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteBrand = async () => {
    if (!brand) return;
    if (user?.role !== 'Super Admin') {
      toast.error('Bu işlem sadece Super Admin tarafından yapılabilir.');
      return;
    }
    
    if (!window.confirm(`"${brand.name}" markasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    try {
      await brandsAPI.deleteBrand(brand.id);
      toast.success('Marka başarıyla silindi');
      navigate('/admin/brands');
    } catch (error: any) {
      console.error('❌ Marka silinemedi:', error);
      toast.error('Marka silinemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Marka detayları yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Marka Bulunamadı</h1>
          <p className="text-gray-600 mb-6">Aradığınız marka bulunamadı veya silinmiş olabilir.</p>
          <button
            onClick={() => navigate('/admin/brands')}
            className="btn btn-primary"
          >
            Markalar Sayfasına Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div className="flex items-center space-x-6">
              <button
                onClick={() => navigate('/admin/brands')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Geri Dön"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-6">
                {/* Logo - Daha büyük ve güzel */}
                <div className="h-20 w-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-lg">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url.startsWith('http') ? brand.logo_url : `http://localhost:8000${brand.logo_url}`}
                      alt={`${brand.name} logo`}
                      className="w-full h-full object-contain p-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-3xl font-bold text-gray-500">${brand.name[0]}</span>`;
                        }
                      }}
                    />
                  ) : (
                    <span className="text-3xl font-bold text-gray-500">
                      {brand.name[0]}
                    </span>
                  )}
                </div>
                
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{brand.name}</h1>
                  <div className="flex items-center space-x-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {category ? category.name : 'Kategori Yok'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      brand.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {brand.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {user?.role === 'Super Admin' && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDeleteBrand}
                  className="btn btn-danger flex items-center space-x-2 px-4 py-2"
                >
                  <Trash2 size={16} />
                  <span>Sil</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl">
                <Users size={28} className="text-blue-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Çalışanlar</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{users.filter(user => user.role === 'user').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl">
                <MessageSquare size={28} className="text-green-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Kanal</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{channels.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl">
                <Package size={28} className="text-purple-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Ürünler</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{products.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl">
                <FileText size={28} className="text-orange-600" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Şablonlar</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{templates.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <nav className="flex space-x-8 px-8">
              {[
                { id: 'overview', label: 'Genel Bakış', icon: Eye },
                { id: 'users', label: 'Çalışanlar', icon: Users },
                { id: 'channels', label: 'Kanallar', icon: MessageSquare },
                { id: 'products', label: 'Ürünler', icon: Package },
                { id: 'templates', label: 'Şablonlar', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-3 py-5 px-3 border-b-2 font-semibold text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Marka Bilgileri */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Building2 size={20} className="mr-2 text-blue-600" />
                      Marka Bilgileri
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">Marka Adı:</span>
                        <span className="font-semibold text-gray-900">{brand.name}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">Kategori:</span>
                        <span className="font-semibold text-gray-900">{category ? category.name : 'Belirtilmemiş'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">Durum:</span>
                        <span className={`font-semibold px-3 py-1 rounded-full text-sm ${
                          brand.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {brand.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200">
                        <span className="text-gray-600 font-medium">Oluşturulma:</span>
                        <span className="font-semibold text-gray-900">{formatDate(brand.created_at)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 font-medium">Son Güncelleme:</span>
                        <span className="font-semibold text-gray-900">{formatDate(brand.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Logo */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 border border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <Eye size={20} className="mr-2 text-blue-600" />
                      Logo Önizleme
                    </h3>
                    <div className="flex justify-center">
                      <div className="h-40 w-40 bg-white rounded-3xl flex items-center justify-center overflow-hidden border-2 border-gray-200 shadow-xl">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url.startsWith('http') ? brand.logo_url : `http://localhost:8000${brand.logo_url}`}
                            alt={`${brand.name} logo`}
                            className="w-full h-full object-contain p-6"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-5xl font-bold text-gray-400">${brand.name[0]}</span>`;
                              }
                            }}
                          />
                        ) : (
                          <span className="text-5xl font-bold text-gray-400">
                            {brand.name[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users size={20} className="mr-2 text-blue-600" />
                    Marka Çalışanları ({users.filter(user => user.role === 'user').length})
                  </h3>
                </div>
                
                {(() => {
                  // Sadece normal çalışanları filtrele (admin ve super_admin hariç)
                  const employees = users.filter(user => user.role === 'user');
                  
                  return employees.length === 0 ? (
                    <div className="text-center py-16">
                      <Users size={64} className="mx-auto text-gray-400 mb-6" />
                      <p className="text-gray-500 text-lg font-medium">Bu markaya ait çalışan bulunmuyor</p>
                      <p className="text-gray-400 text-sm mt-2">Yeni çalışan eklemek için lütfen yöneticinize başvurun</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {employees.map((user) => (
                        <div key={user.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                          <div className="flex items-center space-x-4">
                            <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                              <span className="text-lg font-bold text-blue-600">
                                {user.first_name?.[0] || user.email[0]}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {user.first_name && user.last_name 
                                  ? `${user.first_name} ${user.last_name}` 
                                  : user.email
                                }
                              </h4>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 bg-green-100 text-green-800">
                                Çalışan
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Channels Tab */}
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <MessageSquare size={20} className="mr-2 text-green-600" />
                    Sosyal Medya Kanalları ({channels.length})
                  </h3>
                </div>
                
                {channels.length === 0 ? (
                  <div className="text-center py-16">
                    <MessageSquare size={64} className="mx-auto text-gray-400 mb-6" />
                    <p className="text-gray-500 text-lg font-medium">Bu marka için sosyal medya kanalı bulunmuyor</p>
                    <p className="text-gray-400 text-sm mt-2">Lütfen yöneticinize başvurun</p>
                    <p className="text-gray-400 text-sm mt-2">Yeni kanal eklemek için yukarıdaki butonu kullanın</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {channels.map((channel) => (
                      <div key={channel.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center">
                            <Globe size={24} className="text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{channel.name}</h4>
                            <p className="text-sm text-gray-600">{channel.platform}</p>
                            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-2 ${
                              channel.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {channel.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Package size={20} className="mr-2 text-purple-600" />
                    Ürünler ({products.length})
                  </h3>
                </div>
                
                {products.length === 0 ? (
                  <div className="text-center py-16">
                    <Package size={64} className="mx-auto text-gray-400 mb-6" />
                    <p className="text-gray-500 text-lg font-medium">Bu marka için ürün bulunmuyor</p>
                    <p className="text-gray-400 text-sm mt-2">Yeni ürün eklemek için yukarıdaki butonu kullanın</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center">
                            <Package size={24} className="text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.code} - {product.color}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(product.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <FileText size={20} className="mr-2 text-orange-600" />
                    Şablonlar ({templates.length})
                  </h3>
                </div>
                
                {templates.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText size={64} className="mx-auto text-gray-400 mb-6" />
                    <p className="text-gray-500 text-lg font-medium">Bu marka için şablon bulunmuyor</p>
                    <p className="text-gray-400 text-sm mt-2">Yeni şablon eklemek için yukarıdaki butonu kullanın</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                      <div key={template.id} className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                            <FileText size={24} className="text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDate(template.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandDetail;
