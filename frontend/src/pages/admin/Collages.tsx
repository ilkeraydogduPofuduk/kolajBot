import React, { useState, useEffect } from 'react';
import { 
  Image, 
  AlertCircle, 
  CheckCircle, 
  Package, 
  Edit3, 
  Send,
  RefreshCw,
  DollarSign,
  Tag,
  Layers,
  Ruler,
  X,
  Save,
  Check,
  Eye,
  Filter,
  Search,
  Grid,
  List,
  Plus
} from 'lucide-react';
import { collagesAPI } from '../../services/api/collages';
import { productsAPI } from '../../api/products';
import { brandsAPI } from '../../api/brands';
import toast from 'react-hot-toast';
import CanvaLikeEditor from '../../components/template/CanvaLikeEditor';

interface Product {
  id: number;
  code: string;
  color: string;
  brand: string | null;
  brand_id: number | null;
  product_type: string | null;
  size_range: string | null;
  price: number | null;
  missing_fields: string[];
  has_collage: boolean;
  image_count: number;
  created_at: string | null;
  can_create_collage: boolean;
  collage_url?: string;
  cover_image_url?: string;
}

interface Statistics {
  total_products: number;
  products_with_collage: number;
  products_missing_info: number;
  products_ready_for_collage: number;
  completion_rate: number;
}

interface Brand {
  id: number;
  name: string;
}

const Collages: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  
  // Bulk edit states
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  
  // Collage editor
  const [editingCollage, setEditingCollage] = useState<Product | null>(null);
  const [showCollageEditor, setShowCollageEditor] = useState(false);
  
  // Filters and pagination
  const [filter, setFilter] = useState<'all' | 'missing' | 'ready' | 'has_collage' | 'telegram_sent' | 'telegram_not_sent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    loadData();
    loadBrands();
  }, [page, filter, searchTerm, perPage]);

  // Reset to page 1 when perPage changes
  useEffect(() => {
    setPage(1);
  }, [perPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load products with collage info using backend filtering
      const response = await collagesAPI.getPendingCollages(
        page, 
        perPage, 
        undefined, // brandId
        searchTerm || undefined, 
        filter === 'all' ? undefined : filter
      );
      
      setProducts(response.products || []);
      setTotalPages(response.total_pages || 1);
      
      // Load statistics
      const statsResponse = await collagesAPI.getStatistics();
      setStatistics(statsResponse);
    } catch (error) {
      console.error('Error loading collage data:', error);
      toast.error('Kolaj verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getBrands();
      setBrands(response.brands || []);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm({
      product_type: product.product_type || '',
      size_range: product.size_range || '',
      price: product.price?.toString() || '',
      brand_id: product.brand_id || ''
    });
  };

  const saveEdit = async (productId: number) => {
    try {
      setSaving(true);
      await productsAPI.updateProduct(productId, {
        product_type: editForm.product_type,
        size_range: editForm.size_range,
        price: editForm.price ? parseFloat(editForm.price) : undefined,
        brand_id: editForm.brand_id ? parseInt(editForm.brand_id) : undefined
      });
      
      toast.success('Ürün başarıyla güncellendi');
      setEditingProduct(null);
      loadData();
    } catch (error: any) {
      toast.error('Ürün güncellenirken hata oluştu');
      console.error('Error updating product:', error);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({});
  };

  const handleProductSelect = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkEdit = async () => {
    if (!bulkEditField || !bulkEditValue || selectedProducts.length === 0) {
      toast.error('Lütfen alan ve değer seçin');
      return;
    }

    try {
      setSaving(true);
      
      const updateData: any = {};
      if (bulkEditField === 'price') {
        updateData[bulkEditField] = parseFloat(bulkEditValue);
      } else if (bulkEditField === 'brand_id') {
        updateData[bulkEditField] = parseInt(bulkEditValue);
      } else {
        updateData[bulkEditField] = bulkEditValue;
      }

      // Update all selected products
      await Promise.all(
        selectedProducts.map(productId => 
          productsAPI.updateProduct(productId, updateData)
        )
      );
      
      toast.success(`${selectedProducts.length} ürün başarıyla güncellendi`);
      setSelectedProducts([]);
      setShowBulkEdit(false);
      setBulkEditField('');
      setBulkEditValue('');
      loadData();
    } catch (error: any) {
      toast.error('Toplu güncelleme hatası');
      console.error('Error bulk updating products:', error);
    } finally {
      setSaving(false);
    }
  };

  const openCollageEditor = (product: Product) => {
    setEditingCollage(product);
    setShowCollageEditor(true);
  };

  const getProductStatus = (product: Product) => {
    if (product.has_collage) return 'ready';
    if (product.missing_fields && product.missing_fields.length > 0) return 'missing';
    if (product.can_create_collage) return 'ready';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'missing': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ready': return 'Hazır';
      case 'missing': return 'Eksik Bilgi';
      case 'pending': return 'Beklemede';
      default: return 'Bilinmiyor';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bilgilendirme Mesajı - Temiz Modern Tasarım */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          {/* İkon */}
          <div className="flex-shrink-0 pt-0.5">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          
          {/* İçerik */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Depolama Bilgisi</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ürün görselleri ve kolajlar <span className="font-medium text-gray-900">24 saat</span> boyunca ücretsiz olarak saklanmaktadır. Daha uzun süre depolama için premium paketlerimizi inceleyebilirsiniz.
            </p>
          </div>
          
          {/* Buton */}
          <div className="flex-shrink-0">
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors duration-200">
              Premium
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kolaj Yönetimi</h1>
          <p className="text-gray-600">Ürün kolajlarını yönetin ve düzenleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="btn btn-outline btn-sm"
          >
            {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
          </button>
          <button
            onClick={loadData}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw size={16} />
            Yenile
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Ürün</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total_products}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kolaj Var</p>
                <p className="text-2xl font-bold text-green-600">{statistics.products_with_collage}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eksik Bilgi</p>
                <p className="text-2xl font-bold text-red-600">{statistics.products_missing_info}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tamamlanma</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.completion_rate}%</p>
              </div>
              <Layers className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Ürün ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input input-sm w-64"
            />
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="select select-sm w-48"
          >
            <option value="all">Tümü</option>
            <option value="missing">Eksik Bilgiler</option>
            <option value="ready">Hazır (Kolaj Yok)</option>
            <option value="has_collage">Kolaj Var</option>
            <option value="telegram_sent">Telegram Gönderildi</option>
            <option value="telegram_not_sent">Telegram Gönderilmedi</option>
          </select>

          <select
            value={perPage}
            onChange={(e) => setPerPage(parseInt(e.target.value))}
            className="select select-sm w-24"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>

          {selectedProducts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedProducts.length} ürün seçildi
              </span>
              <button
                onClick={() => setShowBulkEdit(true)}
                className="btn btn-sm btn-primary"
              >
                <Edit3 size={14} />
                Toplu Düzenle
              </button>
              <button
                onClick={() => setSelectedProducts([])}
                className="btn btn-sm btn-outline"
              >
                <X size={14} />
                Temizle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Toplu Düzenleme</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Düzenlenecek Alan
                </label>
                <select
                  value={bulkEditField}
                  onChange={(e) => setBulkEditField(e.target.value)}
                  className="select select-sm w-full"
                >
                  <option value="">Alan seçin</option>
                  <option value="product_type">Ürün Tipi</option>
                  <option value="size_range">Beden Aralığı</option>
                  <option value="price">Fiyat</option>
                  <option value="brand_id">Marka</option>
                </select>
              </div>
              
              {bulkEditField === 'brand_id' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marka
                  </label>
                  <select
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    className="select select-sm w-full"
                  >
                    <option value="">Marka seçin</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yeni Değer
                  </label>
                  <input
                    type={bulkEditField === 'price' ? 'number' : 'text'}
                    value={bulkEditValue}
                    onChange={(e) => setBulkEditValue(e.target.value)}
                    placeholder="Değer girin"
                    className="input input-sm w-full"
                  />
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowBulkEdit(false)}
                className="btn btn-outline btn-sm"
              >
                İptal
              </button>
              <button
                onClick={handleBulkEdit}
                disabled={saving}
                className="btn btn-primary btn-sm"
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => {
            const status = getProductStatus(product);
            const isEditing = editingProduct === product.id;
            const isSelected = selectedProducts.includes(product.id);
            
            return (
              <div
                key={product.id}
                className={`bg-white rounded-lg border-2 transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Product Image */}
                <div className="relative">
                  <div className="aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    {product.cover_image_url ? (
                      <img
                        src={product.cover_image_url}
                        alt={`${product.code} ${product.color}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusText(status)}
                  </div>
                  
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleProductSelect(product.id)}
                      className="checkbox checkbox-sm"
                    />
                  </div>
                  
                  {/* Collage Preview */}
                  {product.has_collage && product.collage_url && (
                    <div className="absolute bottom-2 right-2">
                      <button
                        onClick={() => openCollageEditor(product)}
                        className="btn btn-xs btn-primary"
                      >
                        <Eye size={12} />
                        Kolaj
                      </button>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {product.code} {product.color}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {product.image_count} görsel
                    </span>
                  </div>

                  {/* Edit Form or Display */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Ürün Tipi</label>
                        <input
                          type="text"
                          value={editForm.product_type}
                          onChange={(e) => setEditForm({...editForm, product_type: e.target.value})}
                          className="input input-xs w-full"
                          placeholder="ELBISE, TAKIM"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Beden</label>
                        <input
                          type="text"
                          value={editForm.size_range}
                          onChange={(e) => setEditForm({...editForm, size_range: e.target.value})}
                          className="input input-xs w-full"
                          placeholder="36-42, S-M-L"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Fiyat</label>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                          className="input input-xs w-full"
                          placeholder="64.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Marka</label>
                        <select
                          value={editForm.brand_id}
                          onChange={(e) => setEditForm({...editForm, brand_id: e.target.value})}
                          className="select select-xs w-full"
                        >
                          <option value="">Marka seçin</option>
                          {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>
                              {brand.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      <div className={`${!product.product_type ? 'text-red-500' : 'text-gray-600'}`}>
                        <span className="font-medium">Tip:</span> {product.product_type || '❌ Eksik'}
                      </div>
                      <div className={`${!product.size_range ? 'text-red-500' : 'text-gray-600'}`}>
                        <span className="font-medium">Beden:</span> {product.size_range || '❌ Eksik'}
                      </div>
                      <div className={`${!product.price ? 'text-red-500' : 'text-gray-600'}`}>
                        <span className="font-medium">Fiyat:</span> {product.price ? `$${product.price}` : '❌ Eksik'}
                      </div>
                      <div className={`${!product.brand ? 'text-red-500' : 'text-gray-600'}`}>
                        <span className="font-medium">Marka:</span> {product.brand || '❌ Eksik'}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => saveEdit(product.id)}
                          disabled={saving}
                          className="btn btn-xs btn-success flex-1"
                        >
                          <Save size={12} />
                          {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="btn btn-xs btn-outline"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(product)}
                          className="btn btn-xs btn-primary flex-1"
                        >
                          <Edit3 size={12} />
                          Düzenle
                        </button>
                        {product.has_collage && (
                          <button
                            onClick={() => openCollageEditor(product)}
                            className="btn btn-xs btn-secondary"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(products.map(p => p.id));
                        } else {
                          setSelectedProducts([]);
                        }
                      }}
                      className="checkbox checkbox-sm"
                    />
                  </th>
                  <th>Görsel</th>
                  <th>Ürün</th>
                  <th>Tip</th>
                  <th>Beden</th>
                  <th>Fiyat</th>
                  <th>Marka</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const status = getProductStatus(product);
                  const isEditing = editingProduct === product.id;
                  const isSelected = selectedProducts.includes(product.id);
                  
                  return (
                    <tr key={product.id} className={isSelected ? 'bg-blue-50' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleProductSelect(product.id)}
                          className="checkbox checkbox-sm"
                        />
                      </td>
                      <td>
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                          {product.cover_image_url ? (
                            <img
                              src={product.cover_image_url}
                              alt={`${product.code} ${product.color}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="font-medium">{product.code}</div>
                          <div className="text-sm text-gray-500">{product.color}</div>
                        </div>
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.product_type}
                            onChange={(e) => setEditForm({...editForm, product_type: e.target.value})}
                            className="input input-xs w-24"
                          />
                        ) : (
                          <span className={!product.product_type ? 'text-red-500' : ''}>
                            {product.product_type || '❌ Eksik'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.size_range}
                            onChange={(e) => setEditForm({...editForm, size_range: e.target.value})}
                            className="input input-xs w-24"
                          />
                        ) : (
                          <span className={!product.size_range ? 'text-red-500' : ''}>
                            {product.size_range || '❌ Eksik'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.price}
                            onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                            className="input input-xs w-20"
                          />
                        ) : (
                          <span className={!product.price ? 'text-red-500' : ''}>
                            {product.price ? `$${product.price}` : '❌ Eksik'}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select
                            value={editForm.brand_id}
                            onChange={(e) => setEditForm({...editForm, brand_id: e.target.value})}
                            className="select select-xs w-32"
                          >
                            <option value="">Seçin</option>
                            {brands.map(brand => (
                              <option key={brand.id} value={brand.id}>
                                {brand.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={!product.brand ? 'text-red-500' : ''}>
                            {product.brand || '❌ Eksik'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(product.id)}
                                disabled={saving}
                                className="btn btn-xs btn-success"
                              >
                                <Save size={12} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="btn btn-xs btn-outline"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditing(product)}
                                className="btn btn-xs btn-primary"
                              >
                                <Edit3 size={12} />
                              </button>
                              {product.has_collage && (
                                <button
                                  onClick={() => openCollageEditor(product)}
                                  className="btn btn-xs btn-secondary"
                                >
                                  <Eye size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-600">
            Sayfa {page} / {totalPages} (Toplam {products.length} ürün)
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="btn btn-sm btn-outline"
            >
              İlk
            </button>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-outline"
            >
              Önceki
            </button>
            
            {/* Show page numbers (max 5) */}
            {(() => {
              const startPage = Math.max(1, page - 2);
              const endPage = Math.min(totalPages, page + 2);
              const pages = [];
              
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className={`btn btn-sm ${page === i ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {i}
                  </button>
                );
              }
              return pages;
            })()}
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-outline"
            >
              Sonraki
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="btn btn-sm btn-outline"
            >
              Son
            </button>
          </div>
        </div>
      )}

      {/* Collage Editor Modal */}
      {showCollageEditor && editingCollage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[95vw] h-[95vh] max-w-7xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                Kolaj Düzenle: {editingCollage.code} {editingCollage.color}
              </h3>
              <button
                onClick={() => {
                  setShowCollageEditor(false);
                  setEditingCollage(null);
                }}
                className="btn btn-sm btn-outline"
              >
                <X size={16} />
                Kapat
              </button>
            </div>
            <div className="h-[calc(100%-80px)]">
              <CanvaLikeEditor
                onSave={() => {
                  setShowCollageEditor(false);
                  setEditingCollage(null);
                  loadData();
                }}
                onClose={() => {
                  setShowCollageEditor(false);
                  setEditingCollage(null);
                }}
                initialTemplate={{
                  type: 'collage',
                  productId: editingCollage.id,
                  collageUrl: editingCollage.collage_url
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collages;