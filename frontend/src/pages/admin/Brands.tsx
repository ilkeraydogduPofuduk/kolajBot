import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandsAPI, Brand, BrandCreate, BrandRequest, BrandRequestCreate } from '../../api/brands';

import { categoriesAPI, Category, CategoryCreate } from '../../api/categories';
import { useAuth } from '../../hooks/useAuth';
import { Plus, Search, Edit, Eye, EyeOff, Building2, ChevronDown, ChevronRight, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';

const Brands: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [expandedBrands, setExpandedBrands] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [showCreateBrandRequestModal, setShowCreateBrandRequestModal] = useState(false);
  const [editingBrandRequest, setEditingBrandRequest] = useState<BrandRequest | null>(null);
  
  // Category states
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const perPage = 10;

  useEffect(() => {
    if (authLoading) return; // Wait for auth to complete
    
    loadBrands();
    loadCategories();
  }, [page, user?.brand_ids, user?.permissions, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load categories on component mount
  useEffect(() => {
    loadCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await brandsAPI.getBrands(page, perPage);
      
      // DİNAMİK: brand_ids varsa filtrele (backend zaten filtreliyor ama frontend'de de kontrol)
      let filteredBrands = response.brands;
      if (user?.brand_ids && user.brand_ids.length > 0) {
        // Backend zaten filtreliyor, bu ek güvenlik
        filteredBrands = response.brands;
      }
      
      setBrands(filteredBrands);
      setTotal(filteredBrands.length); // Mağaza yöneticisi için toplam sayıyı da filtrelenmiş olarak ayarlıyoruz
      
    } catch (error) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const allCategories = await categoriesAPI.getAllActiveCategories();
      setCategories(allCategories);
      
      if (allCategories.length === 0) {
        toast.error('Veritabanında kategori bulunamadı. Lütfen kategorileri kontrol edin.');
      }
    } catch (error: any) {
      console.error('❌ Kategoriler yüklenemedi:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Kategoriler yüklenemedi: ' + (error.response?.data?.detail || error.message));
      // Set empty array as fallback
      setCategories([]);
    }
  };

  const handleCreateBrandRequest = async (request: BrandRequestCreate) => {
    try {
      await brandsAPI.createBrandRequest(request);
      toast.success('Marka ekleme talebiniz gönderildi');
      setShowCreateBrandRequestModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Marka talebi oluşturulamadı');
    }
  };

  const handleUpdateBrandRequest = async (request: BrandRequestCreate) => {
    if (!editingBrandRequest) return;
    try {
      await brandsAPI.updateBrandRequest(editingBrandRequest.id, request);
      toast.success('Marka talebi güncellendi');
      setEditingBrandRequest(null);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Marka talebi güncellenemedi');
    }
  };

  const handleCreateBrand = async (brandData: any) => {
    try {
      console.log('🔄 Creating brand:', brandData);
      
      // Önce markayı oluştur
      const createdBrand = await brandsAPI.createBrand(brandData as BrandCreate);
      
      // Eğer logo dosyası varsa, yükle
      if (brandData.logoFile) {
        try {
          await brandsAPI.uploadLogo(createdBrand.id, brandData.logoFile);
        } catch (uploadError) {
          console.warn('Logo yüklenemedi:', uploadError);
          toast.error('Marka oluşturuldu ancak logo yüklenemedi');
        }
      }
      
      toast.success('Marka başarıyla oluşturuldu');
      setShowCreateModal(false);
      loadBrands();
    } catch (error: any) {
      console.error('❌ Marka oluşturulamadı:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Marka oluşturulamadı: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdateBrand = async (brandData: any) => {
    if (!editingBrand) return;
    
    try {
      console.log('🔄 Updating brand:', editingBrand.id, brandData);
      await brandsAPI.updateBrand(editingBrand.id, brandData);
      toast.success('Marka başarıyla güncellendi');
      setEditingBrand(null);
      loadBrands();
    } catch (error: any) {
      console.error('❌ Marka güncellenemedi:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Marka güncellenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleToggleBrandStatus = async (brand: Brand) => {
    try {
      if (brand.is_active) {
        await brandsAPI.deactivateBrand(brand.id);
        toast.success('Brand deactivated');
      } else {
        await brandsAPI.activateBrand(brand.id);
        toast.success('Brand activated');
      }
      loadBrands();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update brand status');
    }
  };

  const handleBrandClick = (brand: Brand) => {
    navigate(`/admin/brands/${brand.id}`);
  };

  const toggleBrandExpansion = async (brand: Brand, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking expand button
    const newExpanded = new Set(expandedBrands);
    
    if (expandedBrands.has(brand.id)) {
      newExpanded.delete(brand.id);
    } else {
      newExpanded.add(brand.id);
    }
    
    setExpandedBrands(newExpanded);
  };

  // Category management functions
  const handleCreateCategory = async (categoryData: CategoryCreate) => {
    try {
      console.log('🔄 Creating category:', categoryData);
      await categoriesAPI.createCategory(categoryData);
      toast.success('Kategori başarıyla oluşturuldu');
      setShowCreateCategoryModal(false);
      await loadCategories();
    } catch (error: any) {
      console.error('❌ Kategori oluşturulamadı:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Kategori oluşturulamadı: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdateCategory = async (categoryData: CategoryCreate | Partial<Category>) => {
    if (!editingCategory) return;
    
    try {
      console.log('🔄 Updating category:', editingCategory.id, categoryData);
      await categoriesAPI.updateCategory(editingCategory.id, categoryData);
      toast.success('Kategori başarıyla güncellendi');
      setEditingCategory(null);
      await loadCategories();
    } catch (error: any) {
      console.error('❌ Kategori güncellenemedi:', error);
      console.error('Error details:', error.response?.data);
      toast.error('Kategori güncellenemedi: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await categoriesAPI.deleteCategory(categoryId);
      toast.success('Kategori başarıyla silindi');
      await loadCategories();
    } catch (error) {
      toast.error('Kategori silinemedi');
    }
  };


  const filteredBrands = brands.filter(brand => {
    // Text search filter
    const matchesSearch = !searchTerm || 
    brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.category && brand.category.name && brand.category.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Category filter - Fix: Check if category exists and compare IDs properly
    const matchesCategory = !categoryFilter || 
      (brand.category && brand.category.id && brand.category.id === parseInt(categoryFilter));

    // Status filter
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && brand.is_active) ||
      (statusFilter === 'inactive' && !brand.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
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
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.brand_ids && user.brand_ids.length > 0 ? 'Markalarım' : 'Markalar'}
          </h1>
          <p className="text-gray-600">
            {user?.brand_ids && user.brand_ids.length > 0
              ? 'Yönettiğiniz markaların bilgilerini görüntüleyin' 
              : 'Marka bilgilerini ve ayarlarını yönetin'
            }
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          {user?.permissions?.includes('brands.manage') && (
            <>
              <button
                onClick={() => setShowCreateCategoryModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Kategori Ekle
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={20} />
                Marka Ekle
              </button>
            </>
          )}
          {user?.brand_ids && user.brand_ids.length > 0 && !user?.permissions?.includes('brands.manage') && (
            <button
              onClick={() => setShowCreateBrandRequestModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus size={20} />
              Marka Talebi
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search - Takes more space */}
          <div className="flex-1 lg:flex-[2]">
            <label className="form-label">Arama</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 w-full"
            placeholder="Markalarda ara..."
          />
        </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-4 lg:flex-[3]">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="form-label">Kategori</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="form-input w-full"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1">
              <label className="form-label">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input w-full"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex-shrink-0 flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setStatusFilter('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
                title="Filtreleri Temizle"
              >
                <X size={16} />
                <span className="hidden sm:inline">Temizle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || categoryFilter || statusFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Aktif Filtreler:</span>
              
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  <Search size={12} />
                  "{searchTerm}"
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              
              {categoryFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  <Tag size={12} />
                  {categoryFilter}
                  <button 
                    onClick={() => setCategoryFilter('')}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              
              {statusFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {statusFilter === 'active' ? '✓' : '✗'} {statusFilter === 'active' ? 'Aktif' : 'Pasif'}
                  <button 
                    onClick={() => setStatusFilter('')}
                    className="hover:bg-purple-200 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="spinner"></div>
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Marka bulunamadı
          </div>
        ) : (
          filteredBrands.map((brand) => (
            <div 
              key={brand.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-300 cursor-pointer"
              onClick={() => handleBrandClick(brand)}
            >
              {/* Brand Header */}
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="flex items-center gap-3 flex-1"
                >
                  <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url.startsWith('http') ? brand.logo_url : `http://localhost:8000${brand.logo_url}`}
                        alt={`${brand.name} logo`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          // Logo yüklenemezse ilk harfi göster
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-lg font-bold text-gray-400">${brand.name[0]}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-lg font-bold text-gray-400">
                        {brand.name[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 flex items-center gap-1 text-base">
                      {brand.name}
                      <button
                        onClick={(e) => toggleBrandExpansion(brand, e)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title={expandedBrands.has(brand.id) ? 'Daralt' : 'Genişlet'}
                      >
                        {expandedBrands.has(brand.id) ? 
                          <ChevronDown size={16} className="text-gray-400" /> : 
                          <ChevronRight size={16} className="text-gray-400" />
                        }
                      </button>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                    {brand.category && (
                        <p className="text-sm text-gray-500">{typeof brand.category === 'string' ? brand.category : brand.category.name}</p>
                    )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-0.5">
                  {user?.permissions?.includes('brands.manage') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBrand(brand);
                      setShowCreateModal(true);
                    }}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  )}
                  {user?.permissions?.includes('brands.manage') && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {brand.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBrandStatus(brand);
                      }}
                      className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                        brand.is_active
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          brand.is_active ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  )}
                </div>
              </div>


              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">
                  {new Date(brand.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination - Sadece Super Admin için */}
      {user?.permissions?.includes('brands.manage') && total > perPage && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {total} markadan {((page - 1) * perPage) + 1} - {Math.min(page * perPage, total)} arası gösteriliyor
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * perPage >= total}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Brand Modal */}
      {(showCreateModal || editingBrand) && (
        <BrandModal
          brand={editingBrand}
          onClose={() => {
            setShowCreateModal(false);
            setEditingBrand(null);
          }}
          onSave={editingBrand ? handleUpdateBrand : handleCreateBrand}
          categories={categories}
        />
      )}

      {/* Create/Edit Category Modal */}
      {(showCreateCategoryModal || editingCategory) && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCreateCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={editingCategory ? 
            (data) => handleUpdateCategory(data) : 
            (data) => handleCreateCategory(data as CategoryCreate)
          }
          onDelete={editingCategory ? handleDeleteCategory : undefined}
        />
      )}

      {/* Create/Edit Brand Request Modal - Only for Mağaza Yöneticisi */}
      {(showCreateBrandRequestModal || editingBrandRequest) && user?.brand_ids && user.brand_ids.length > 0 && !user?.permissions?.includes('brands.manage') && (
        <BrandRequestModal
          request={editingBrandRequest}
          onClose={() => {
            setShowCreateBrandRequestModal(false);
            setEditingBrandRequest(null);
          }}
          onSave={editingBrandRequest ? 
            (data) => handleUpdateBrandRequest(data) : 
            (data) => handleCreateBrandRequest(data as BrandRequestCreate)
          }
          categories={categories}
        />
      )}
    </div>
  );
};

// Brand Modal Component
interface BrandModalProps {
  brand?: Brand | null;
  onClose: () => void;
  onSave: (brandData: any) => Promise<void>;
  categories: Category[];
}

const BrandModal: React.FC<BrandModalProps> = ({ brand, onClose, onSave, categories }) => {
  const [formData, setFormData] = useState({
    name: brand?.name || '',
    category_id: brand?.category_id || '',
    logo_url: brand?.logo_url || '',
  });
  
  const [logoOption, setLogoOption] = useState<'url' | 'upload'>('url');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Update form data when brand prop changes
  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name || '',
        category_id: brand.category_id || '',
        logo_url: brand.logo_url || '',
      });
      
      // Eğer mevcut bir logo URL'i varsa ve dosya yükleme değilse, URL seçeneğini seç
      if (brand.logo_url && !brand.logo_url.startsWith('blob:')) {
        setLogoOption('url');
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        setLogoOption('upload');
      }
    } else {
      // Yeni marka oluştururken varsayılan olarak URL seçeneğini seç
      setLogoOption('url');
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [brand]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Sadece resim dosyaları yüklenebilir');
        return;
      }
      
      // Validate file extension
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(fileExtension)) {
        toast.error('Desteklenmeyen dosya formatı. Sadece JPG, PNG, GIF, WebP, SVG dosyaları kabul edilir.');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
        return;
      }
      
      // Validate filename (no path traversal)
      if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
        toast.error('Geçersiz dosya adı');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Marka adı gereklidir');
      return;
    }

    if (logoOption === 'url' && !formData.logo_url.trim()) {
      toast.error('Logo URL gereklidir');
      return;
    }

    if (logoOption === 'upload' && !logoFile) {
      toast.error('Logo dosyası seçilmelidir');
      return;
    }

    const submitData: any = {
      ...formData,
      category_id: formData.category_id ? Number(formData.category_id) : undefined
    };

    // Eğer dosya yükleme seçildiyse, dosyayı submitData'ya ekle
    if (logoOption === 'upload' && logoFile) {
      submitData.logoFile = logoFile;
      // Geçici bir URL ekle (backend'de kullanılmayacak)
      submitData.logo_url = 'temp';
    }

    // Eğer mevcut marka güncelleniyorsa ve dosya yükleme seçildiyse
    if (logoOption === 'upload' && logoFile && brand) {
      try {
        const uploadResult = await brandsAPI.uploadLogo(brand.id, logoFile);
        submitData.logo_url = uploadResult.logo_url;
      } catch (error) {
        toast.error('Logo yüklenemedi');
        return;
      }
    }

    await onSave(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {brand ? 'Marka Düzenle' : 'Marka Oluştur'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Marka Adı *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="Marka adını girin"
              />
            </div>

            <div>
              <label className="form-label">Kategori</label>
              <select
                name="category_id"
                value={formData.category_id || ''}
                onChange={handleChange}
                className="form-input"
              >
                <option value="">Kategori Seçin</option>
                {categories && categories.length > 0 ? (
                  categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                ) : (
                  <option disabled>Kategori yükleniyor...</option>
                )}
              </select>
            </div>

            <div>
              <label className="form-label">Logo *</label>
              
              {/* Logo seçenekleri */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="logoOption"
                    value="url"
                    checked={logoOption === 'url'}
                    onChange={(e) => {
                      setLogoOption(e.target.value as 'url' | 'upload');
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="mr-2"
                  />
                  URL ile
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="logoOption"
                    value="upload"
                    checked={logoOption === 'upload'}
                    onChange={(e) => {
                      setLogoOption(e.target.value as 'url' | 'upload');
                      setFormData(prev => ({ ...prev, logo_url: '' }));
                    }}
                    className="mr-2"
                  />
                  Dosya Yükle
                </label>
              </div>

              {/* URL seçeneği */}
              {logoOption === 'url' && (
                <div>
                  <input
                    type="url"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="https://example.com/logo.png"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Marka logosunun URL adresini girin</p>
                </div>
              )}

              {/* Dosya yükleme seçeneği */}
              {logoOption === 'upload' && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    className="form-input"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP, SVG formatları desteklenir (Max: 5MB)</p>
                  
                  {/* Logo önizleme */}
                  {logoPreview && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-2">Önizleme:</p>
                      <img
                        src={logoPreview}
                        alt="Logo önizleme"
                        className="w-20 h-20 object-contain border border-gray-300 rounded"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary flex-1">
                {brand ? 'Marka Güncelle' : 'Marka Oluştur'}
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


// Category Modal Component
interface CategoryModalProps {
  category?: Category | null;
  onClose: () => void;
  onSave: (categoryData: CategoryCreate | Partial<Category>) => Promise<void>;
  onDelete?: (categoryId: number) => Promise<void>;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ category, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: category?.name || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Kategori adı gereklidir');
      return;
    }

    await onSave(formData);
  };

  const handleDelete = async () => {
    if (!category || !onDelete) return;
    
    if (window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) {
      await onDelete(category.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {category ? 'Kategori Düzenle' : 'Kategori Oluştur'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Kategori Adı *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
                placeholder="Kategori adını girin"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button type="submit" className="btn btn-primary flex-1">
                {category ? 'Kategori Güncelle' : 'Kategori Oluştur'}
              </button>
              {category && onDelete && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                >
                  Sil
                </button>
              )}
              <button type="button" onClick={onClose} className="btn btn-secondary">
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Brand Request Modal Component
  interface BrandRequestModalProps {
    request?: BrandRequest | null;
    onClose: () => void;
    onSave: (requestData: BrandRequestCreate) => Promise<void>;
    categories: Category[];
  }

  const BrandRequestModal: React.FC<BrandRequestModalProps> = ({ request, onClose, onSave, categories }) => {
    const [formData, setFormData] = useState<BrandRequestCreate>({
      name: request?.name || '',
      category_id: request?.category_id || undefined,
      logo_url: request?.logo_url || '',
      request_message: request?.request_message || ''
    });

    // Update form data when request prop changes
    useEffect(() => {
      if (request) {
        setFormData({
          name: request.name || '',
          category_id: request.category_id || undefined,
          logo_url: request.logo_url || '',
          request_message: request.request_message || ''
        });
      }
    }, [request]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData((prev: BrandRequestCreate) => ({
        ...prev,
        [name]: value,
      }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!formData.name.trim()) {
        toast.error('Marka adı gereklidir');
        return;
      }

      if (!formData.logo_url.trim()) {
        toast.error('Logo URL gereklidir');
        return;
      }

      await onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {request ? 'Marka Talebi Düzenle' : 'Yeni Marka Talebi Oluştur'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Marka Adı *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  required
                  placeholder="Marka adını girin"
                />
              </div>

              <div>
                <label className="form-label">Kategori</label>
                <select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Kategori Seçin</option>
                  {categories && categories.length > 0 ? (
                    categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>Kategori yükleniyor...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="form-label">Logo URL *</label>
                <input
                  type="url"
                  name="logo_url"
                  value={formData.logo_url || ''}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="https://example.com/logo.png"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Marka logosunun URL adresini girin</p>
              </div>

              <div>
                <label className="form-label">Talep Mesajı</label>
                <textarea
                  name="request_message"
                  value={formData.request_message || ''}
                  onChange={handleChange}
                  className="form-input"
                  rows={3}
                  placeholder="Yeni marka ekleme talebinizle ilgili açıklama (isteğe bağlı)"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  {request ? 'Talebi Güncelle' : 'Talep Oluştur'}
                </button>
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

export default Brands;

