import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Copy, RotateCcw } from 'lucide-react';
import { IncompleteProduct } from '../../api/products';
import toast from 'react-hot-toast';

interface MissingFieldsModalProps {
  incompleteProducts: IncompleteProduct[];
  onComplete: (completionData: Array<{
    product_id: number;
    product_type?: string;
    size_range?: string;
    price?: number;
  }>) => void;
  onCancel: () => void;
}

const MissingFieldsModal: React.FC<MissingFieldsModalProps> = ({
  incompleteProducts,
  onComplete,
  onCancel
}) => {
  const [products, setProducts] = useState<Array<IncompleteProduct & {
    product_type?: string;
    size_range?: string;
    price?: number;
  }>>([]);
  
  const [bulkSettings, setBulkSettings] = useState({
    product_type: '',
    size_range: '',
    price: ''
  });

  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  useEffect(() => {
    // Initialize products with empty fields
    const initializedProducts = incompleteProducts.map(product => ({
      ...product,
      product_type: '',
      size_range: '',
      price: undefined
    }));
    setProducts(initializedProducts);
  }, [incompleteProducts]);

  const productTypes = [
    'ELBİSE', 'PANTOLON', 'TAKIM', 'KOT', 'ETEK', 'CEKET', 
    'GÖMLEK', 'TİŞÖRT', 'MONT', 'HIRKA', 'YELEK'
  ];

  const handleBulkApply = (field: string, value: string) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      [field]: value
    })));
  };

  const handleProductFieldChange = (productId: number, field: string, value: string) => {
    setProducts(prev => prev.map(p => 
      p.product_id === productId 
        ? { ...p, [field]: value }
        : p
    ));
  };

  const handleComplete = () => {
    // Validate that all required fields are filled
    const hasEmptyFields = products.some(product => {
      if (product.missing_fields.includes('product_type') && !product.product_type) return true;
      if (product.missing_fields.includes('size_range') && !product.size_range) return true;
      return false;
    });

    if (hasEmptyFields) {
      toast.error('Lütfen tüm eksik alanları doldurun');
      return;
    }

    // Prepare completion data
    const completionData = products.map(product => ({
      product_id: product.product_id,
      product_type: product.product_type || undefined,
      size_range: product.size_range || undefined,
      price: product.price || undefined
    }));

    onComplete(completionData);
  };

  const currentProduct = products[currentProductIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Eksik Bilgiler - {products.length} Ürün
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ürünlerin eksik bilgilerini tamamlayın
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Left Side - Bulk Settings */}
          <div className="w-1/3 border-r border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Copy size={18} />
              Toplu Uygulama
            </h3>
            
            <div className="space-y-4">
              {/* Product Type Bulk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ürün Türü
                </label>
                <select
                  value={bulkSettings.product_type}
                  onChange={(e) => {
                    setBulkSettings(prev => ({...prev, product_type: e.target.value}));
                    handleBulkApply('product_type', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seçin...</option>
                  {productTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Size Range Bulk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beden Aralığı
                </label>
                <input
                  type="text"
                  value={bulkSettings.size_range}
                  onChange={(e) => {
                    setBulkSettings(prev => ({...prev, size_range: e.target.value}));
                    handleBulkApply('size_range', e.target.value);
                  }}
                  placeholder="örn: 36-42, 38-44"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Price Bulk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiyat (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkSettings.price}
                  onChange={(e) => {
                    setBulkSettings(prev => ({...prev, price: e.target.value}));
                    handleBulkApply('price', e.target.value);
                  }}
                  placeholder="örn: 65.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => {
                  setBulkSettings({ product_type: '', size_range: '', price: '' });
                  setProducts(prev => prev.map(p => ({
                    ...p,
                    product_type: '',
                    size_range: '',
                    price: undefined
                  })));
                }}
                className="w-full btn btn-secondary flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Sıfırla
              </button>
            </div>
          </div>

          {/* Right Side - Individual Products */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bireysel Düzenlemeler
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentProductIndex(Math.max(0, currentProductIndex - 1))}
                  disabled={currentProductIndex === 0}
                  className="btn btn-sm btn-secondary"
                >
                  Önceki
                </button>
                <span className="text-sm text-gray-600">
                  {currentProductIndex + 1} / {products.length}
                </span>
                <button
                  onClick={() => setCurrentProductIndex(Math.min(products.length - 1, currentProductIndex + 1))}
                  disabled={currentProductIndex === products.length - 1}
                  className="btn btn-sm btn-secondary"
                >
                  Sonraki
                </button>
              </div>
            </div>

            {currentProduct && (
              <div className="space-y-4">
                {/* Product Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">
                    {currentProduct.code} {currentProduct.color}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    {currentProduct.missing_fields.map(field => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full"
                      >
                        <AlertCircle size={12} />
                        {field === 'product_type' ? 'Ürün Türü' : 
                         field === 'size_range' ? 'Beden' : field}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Fields */}
                {currentProduct.missing_fields.includes('product_type') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ürün Türü *
                    </label>
                    <select
                      value={currentProduct.product_type || ''}
                      onChange={(e) => handleProductFieldChange(currentProduct.product_id, 'product_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seçin...</option>
                      {productTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                )}

                {currentProduct.missing_fields.includes('size_range') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beden Aralığı *
                    </label>
                    <input
                      type="text"
                      value={currentProduct.size_range || ''}
                      onChange={(e) => handleProductFieldChange(currentProduct.product_id, 'size_range', e.target.value)}
                      placeholder="örn: 36-42, 38-44"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Optional Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fiyat (USD) - Opsiyonel
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentProduct.price || ''}
                    onChange={(e) => handleProductFieldChange(currentProduct.product_id, 'price', e.target.value)}
                    placeholder="örn: 65.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {products.filter(p => 
              (!p.missing_fields.includes('product_type') || p.product_type) &&
              (!p.missing_fields.includes('size_range') || p.size_range)
            ).length} / {products.length} ürün tamamlandı
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="btn btn-secondary"
            >
              İptal
            </button>
            <button
              onClick={handleComplete}
              className="btn btn-primary flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Tamamla ({products.length} Ürün)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissingFieldsModal;
