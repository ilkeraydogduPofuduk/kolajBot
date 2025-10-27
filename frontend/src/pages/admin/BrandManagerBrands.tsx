import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { brandsAPI, Brand } from '../../api/brands';
import { categoriesAPI, Category } from '../../api/categories';
import { Eye, Building2, Users, MessageCircle, Package, FileText, Calendar, Globe, Mail, Phone, Tag, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const BrandManagerBrands: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (authLoading) return;
    loadBrands();
    loadCategories();
  }, [authLoading, user]);

  const loadBrands = async () => {
    if (!user || user.role !== 'Mağaza Yöneticisi') return;
    
    try {
      setLoading(true);
      const response = await brandsAPI.getBrands(1, 1000);
      
      // Sadece kullanıcının markalarını göster
      const myBrands = response.brands.filter((brand: Brand) => 
        user.brand_ids?.includes(brand.id)
      );
      
      setBrands(myBrands);
    } catch (error) {
      console.error('Markalar yüklenirken hata:', error);
      toast.error('Markalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.categories);
    } catch (error) {
      console.error('Kategoriler yüklenirken hata:', error);
    }
  };

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = !searchTerm || 
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || 
      (brand.category && brand.category.id && brand.category.id === parseInt(categoryFilter));
    
    return matchesSearch && matchesCategory;
  });

  if (authLoading || loading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Markalarım</h1>
          <p className="text-gray-600">Yönettiğiniz markaların bilgilerini görüntüleyin</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Marka ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Eye size={18} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-64">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Kategoriler</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBrands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Brand Header */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{brand.name}</h3>
                  {brand.category && (
                    <div className="flex items-center gap-2 mt-1">
                      <Tag size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{brand.category.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Brand Info */}
            <div className="p-6 space-y-4">
              {brand.description && (
                <p className="text-gray-600 text-sm line-clamp-3">{brand.description}</p>
              )}

              {/* Brand Details */}
              <div className="space-y-2">
                {brand.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe size={16} className="text-gray-400" />
                    <a href={brand.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {brand.website}
                    </a>
                  </div>
                )}
                
                {brand.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span>{brand.email}</span>
                  </div>
                )}
                
                {brand.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span>{brand.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>Oluşturulma: {new Date(brand.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${brand.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {brand.is_active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => navigate(`/admin/brands/${brand.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Eye size={16} />
                <span>Detayları Görüntüle</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredBrands.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Marka Bulunamadı</h3>
          <p className="text-gray-600">
            {searchTerm || categoryFilter 
              ? 'Arama kriterlerinize uygun marka bulunamadı.'
              : 'Henüz size atanmış marka bulunmuyor.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default BrandManagerBrands;
