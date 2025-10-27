import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import { useAuth } from '../../hooks/useAuth';
import { productsAPI, Product } from '../../api/products';
import { templatesAPI, Template } from '../../api/templates';
import { useUrlConfig } from '../../hooks/useUrlConfig';
import FabricTemplateViewer from '../../components/template/FabricTemplateViewer';
import { 
  ArrowLeft, 
  Check,
  X,
  ZoomIn,
  Palette,
  Eye,
  Download,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

const ProductDetail: React.FC = () => {
  const { getImageURL } = useUrlConfig();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  // const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  // const [processing, setProcessing] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Collage state
  const [collageData, setCollageData] = useState<{
    exists: boolean;
    url?: string;
    loading: boolean;
  }>({ exists: false, loading: false });

  const loadProduct = useCallback(async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const productData = await productsAPI.getProduct(parseInt(productId));
      setProduct(productData);
      
      // Ürün için şablonları yükle
      const templatesResponse = await templatesAPI.getTemplatesByProduct(parseInt(productId));
      setTemplates(templatesResponse.templates || []);
      
      // Kolaj verilerini yükle
      await loadCollageData(parseInt(productId));
    } catch (error: any) {
      toast.error('Ürün yüklenirken hata oluştu');
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadCollageData = useCallback(async (productId: number) => {
    try {
      setCollageData(prev => ({ ...prev, loading: true }));
      
      const response = await fetch(`/api/products/${productId}/collage`);
      const data = await response.json();
      
      if (data.success && data.exists) {
        setCollageData({
          exists: true,
          url: data.collage_url,
          loading: false
        });
      } else {
        setCollageData({
          exists: false,
          loading: false
        });
      }
    } catch (error) {
      console.error('Error loading collage:', error);
      setCollageData({
        exists: false,
        loading: false
      });
    }
  }, []);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Template functions
  const handleViewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleEditTemplate = (template: Template) => {
    navigate(`/admin/templates/edit/${template.id}`);
  };

  const handleCreateCollage = async (template: Template) => {
    try {
      // Backend'e kolaj oluşturma isteği gönder
      const response = await fetch(`/api/products/${productId}/create-collage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ template_id: template.id })
      });
      
      if (response.ok) {
        toast.success('Kolaj oluşturuldu!');
        loadProduct(); // Ürün bilgilerini yenile
      } else {
        toast.error('Kolaj oluşturulurken hata oluştu');
      }
    } catch (error) {
      toast.error('Kolaj oluşturulurken hata oluştu');
    }
  };

  const handleDownloadCollage = (template: Template) => {
    // Kolaj dosyasını indir
    const link = document.createElement('a');
    link.href = `/api/templates/${template.id}/download-collage`;
    link.download = `${product?.code}_${template.name}_collage.jpg`;
    link.click();
  };


  const handleImageZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setImageZoom(prev => Math.max(1, Math.min(3, prev + delta)));
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (imageZoom > 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setImagePosition({ x, y });
    }
  };

  // Ensure arrays exist
  const images = useMemo(() => {
    return product?.images || [];
  }, [product]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Ürün bulunamadı</h3>
        <button onClick={() => navigate('/admin/media-gallery')} className="btn btn-primary mt-4">
          <ArrowLeft size={18} className="mr-2" />
          Geri Dön
        </button>
      </div>
    );
  }

  const DisplayField = ({ label, value }: any) => {
    const isEmpty = !value;

    return (
      <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
        <span className="text-xs text-gray-500 w-20">{label}</span>
        <span className={`text-sm font-medium ${isEmpty ? 'text-red-500' : 'text-gray-900'}`}>
          {value || 'Eksik'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Minimal Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn btn-secondary btn-sm flex items-center gap-2">
          <ArrowLeft size={16} />
          <span>Geri</span>
        </button>
        <h1 className="text-xl font-bold">{product.code}</h1>
        <div className="w-20"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Large Image Gallery - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Image */}
          <div 
            className="bg-white rounded-lg border border-gray-200 overflow-hidden cursor-zoom-in"
            onClick={() => setShowImageModal(true)}
          >
            <div className="aspect-square relative">
              {images[selectedImageIndex] && (
                <img
                  src={getImageURL(images[selectedImageIndex].file_path)}
                  alt={product.code}
                  className="w-full h-full object-contain bg-white"
                />
              )}
              <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {selectedImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-6 gap-2">
            {images.map((image, index) => (
              <div
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                  selectedImageIndex === index ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={getImageURL(image.file_path)}
                  alt={`${product.code} - ${index + 1}`}
                  className="w-full h-full object-contain bg-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Info Sidebar - 1/3 width */}
        <div className="space-y-4">
          {/* ÜRÜN BİLGİLERİ - 2 ürün varsa yan yana, tek ürün varsa tek sütun */}
          {product.has_second_product && product.code_2 ? (
            // İKİ ÜRÜN - YAN YANA
            <div className="grid grid-cols-2 gap-4">
              {/* İLK ÜRÜN */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">
                  {product.code} {product.color}
                </h3>
                <div className="space-y-1">
                  {/* 1. MARKA ADI */}
                  <DisplayField label="Marka" value={product.brand_name || product.brand?.name} />
                  {/* 2. ÜRÜN KODU */}
                  <DisplayField label="Ürün Kodu" value={product.code} />
                  {/* 3. ÜRÜN TİPİ */}
                  <DisplayField label="Ürün Tipi" value={product.product_type} />
                  {/* 4. ÜRÜN RENGİ */}
                  <DisplayField label="Ürün Rengi" value={product.color} />
                  {/* 5. ÜRÜN BEDEN ARALIĞI */}
                  <DisplayField label="Ürün Beden Aralığı" value={product.size_range} />
                  {/* 6. ÜRÜN FİYATI */}
                  <DisplayField label="Ürün Fiyatı" value={product.price ? `${product.price} USD` : null} />
                </div>
              </div>

              {/* İKİNCİ ÜRÜN */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-3 pb-2 border-b border-blue-200">
                  {product.code_2} {product.color_2}
                </h3>
                <div className="space-y-1">
                  {/* 1. MARKA ADI */}
                  <DisplayField label="Marka" value={product.brand_name || product.brand?.name} />
                  {/* 2. ÜRÜN KODU */}
                  <DisplayField label="Ürün Kodu" value={product.code_2} />
                  {/* 3. ÜRÜN TİPİ */}
                  <DisplayField label="Ürün Tipi" value={product.product_type_2} />
                  {/* 4. ÜRÜN RENGİ */}
                  <DisplayField label="Ürün Rengi" value={product.color_2} />
                  {/* 5. ÜRÜN BEDEN ARALIĞI */}
                  <DisplayField label="Ürün Beden Aralığı" value={product.size_range_2} />
                  {/* 6. ÜRÜN FİYATI */}
                  <DisplayField label="Ürün Fiyatı" value={product.price_2 ? `${product.price_2} USD` : null} />
                </div>
              </div>
            </div>
          ) : (
            // TEK ÜRÜN - TEK SÜTUN
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Ürün Bilgileri</h3>
              <div className="space-y-1">
                {/* 1. MARKA ADI */}
                <DisplayField label="Marka" value={product.brand_name || product.brand?.name} />
                {/* 2. ÜRÜN KODU */}
                <DisplayField label="Ürün Kodu" value={product.code} />
                {/* 3. ÜRÜN TİPİ */}
                <DisplayField label="Ürün Tipi" value={product.product_type} />
                {/* 4. ÜRÜN RENGİ */}
                <DisplayField label="Ürün Rengi" value={product.color} />
                {/* 5. ÜRÜN BEDEN ARALIĞI */}
                <DisplayField label="Ürün Beden Aralığı" value={product.size_range} />
                {/* 6. ÜRÜN FİYATI */}
                <DisplayField label="Ürün Fiyatı" value={product.price ? `${product.price} USD` : null} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Full Screen Image Modal with Zoom */}
      {showImageModal && images[selectedImageIndex] && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 overflow-hidden"
          onClick={() => {
            setShowImageModal(false);
            setImageZoom(1);
          }}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleImageZoom}
            onMouseMove={handleImageMouseMove}
          >
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-70 rounded-full p-3 hover:bg-opacity-90 z-10"
            >
              <X size={24} />
            </button>
            
            <div 
              className="relative overflow-hidden"
              style={{ 
                width: '90vw', 
                height: '90vh',
                cursor: imageZoom > 1 ? 'move' : 'zoom-in'
              }}
            >
              <img
                src={getImageURL(images[selectedImageIndex].file_path)}
                alt={`${product.code} - ${selectedImageIndex + 1}`}
                className="w-full h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${imageZoom})`,
                  transformOrigin: imageZoom > 1 ? `${imagePosition.x}% ${imagePosition.y}%` : 'center'
                }}
              />
            </div>
            
            {/* Zoom indicator */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-sm px-3 py-2 rounded flex items-center gap-2">
              <ZoomIn size={16} />
              {Math.round(imageZoom * 100)}%
              <span className="text-xs text-gray-300">(Scroll to zoom)</span>
            </div>
            
            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedImageIndex(selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 rounded-full px-3 py-1 text-sm">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}



      {/* Template Preview Modal */}
      {showTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Template Preview */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Şablon Önizleme</h3>
                  <div className="bg-gray-100 rounded-lg overflow-hidden border p-4">
                    {selectedTemplate.template_data ? (
                      <FabricTemplateViewer
                        templateData={typeof selectedTemplate.template_data === 'string' 
                          ? JSON.parse(selectedTemplate.template_data) 
                          : selectedTemplate.template_data}
                        width={400}
                        height={500}
                        className="mx-auto"
                      />
                    ) : selectedTemplate.preview_image ? (
                      <img
                        src={getImageURL(selectedTemplate.preview_image)}
                        alt={selectedTemplate.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <Palette className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Önizleme Yok</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Template Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Şablon Detayları</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Açıklama
                      </label>
                      <p className="text-sm text-gray-600">
                        {selectedTemplate.description || 'Açıklama yok'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kategori
                      </label>
                      <p className="text-sm text-gray-600 capitalize">
                        {selectedTemplate.category || 'Genel'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tip
                      </label>
                      <p className="text-sm text-gray-600">
                        {selectedTemplate.template_type || 'Genel'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Oluşturulma Tarihi
                      </label>
                      <p className="text-sm text-gray-600">
                        {new Date(selectedTemplate.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Durum
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          selectedTemplate.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTemplate.is_active ? 'Aktif' : 'Pasif'}
                        </span>
                        {selectedTemplate.is_auto_generated && (
                          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            Otomatik
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex gap-3">
                    
                    <button
                      onClick={() => handleCreateCollage(selectedTemplate)}
                      className="flex-1 btn btn-success flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Kolaj Oluştur
                    </button>
                    
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      className="btn btn-secondary"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
