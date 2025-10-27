import React, { useEffect, useMemo, useState } from 'react';
import { Grid, Layers, Star, BookOpen, Zap } from 'lucide-react';
import { Canvas as FabricCanvas } from 'fabric';
import { CollageService, CollageProduct, CollageConfig } from '../../../services/canvas/collageService';
import { toast } from 'react-hot-toast';
import { useProducts } from '../../../hooks/useEnterpriseQuery';
import { Product } from '../../../api/products';

interface CollageAutomationProps {
  canvas: FabricCanvas | null;
  onClose: () => void;
}

const CollageAutomation: React.FC<CollageAutomationProps> = ({ canvas, onClose }) => {
  const [config, setConfig] = useState<CollageConfig>({
    layout: 'grid',
    columns: 3,
    rows: 3,
    spacing: 20,
    showProductInfo: true,
    showPrices: true,
    showQRCode: false,
    showLogo: true,
    backgroundColor: '#F5F5F5',
    brandColor: '#FF6B00'
  });

  const [products, setProducts] = useState<CollageProduct[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>(undefined);

  const {
    data: productData,
    isLoading,
    hasError,
    error,
    refetch
  } = useProducts();

  const brandOptions = useMemo(() => {
    if (!productData) return [] as { id: number; name: string }[];

    const seen = new Map<number, string>();
    (productData as Product[]).forEach((product) => {
      const brandId = product.brand_id;
      const brandName = product.brand_name || product.brand?.name;
      if (brandId && brandName && !seen.has(brandId)) {
        seen.set(brandId, brandName);
      }
    });

    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [productData, selectedBrandId]);

  useEffect(() => {
    if (!productData) return;

    const filtered = (productData as Product[]).filter((product) =>
      selectedBrandId ? product.brand_id === selectedBrandId : true
    );

    const mapped = filtered
      .map<CollageProduct>((product) => {
        const coverImage = product.images?.find((img) => img.is_cover_image) || product.images?.[0];
        const imageUrl = coverImage?.file_path || `https://via.placeholder.com/600x600/111827/FFFFFF?text=${encodeURIComponent(product.code || product.name || 'Ürün')}`;

        return {
          id: product.id,
          code: product.code || product.name || `PRD-${product.id}`,
          color: product.color || product.product_type || 'N/A',
          size: product.size_range,
          price: product.price,
          image_url: imageUrl,
          brand_name: product.brand_name || product.brand?.name
        };
      })
      .filter((item) => !!item.image_url);

    setProducts(mapped);
  }, [productData]);

  const griddedProductCount = useMemo(() => {
    if (config.layout !== 'grid') return products.length;
    return Math.min(products.length, config.columns * config.rows);
  }, [config.layout, config.columns, config.rows, products.length]);

  const layouts = [
    { id: 'grid', name: 'Grid Layout', icon: Grid, description: 'Eşit boyutlu grid' },
    { id: 'masonry', name: 'Masonry', icon: Layers, description: 'Pinterest tarzı' },
    { id: 'featured', name: 'Featured', icon: Star, description: 'Öne çıkan + grid' },
    { id: 'catalog', name: 'Catalog', icon: BookOpen, description: 'Katalog görünümü' }
  ];

  const handleGenerate = async () => {
    if (!canvas) {
      toast.error('Canvas hazır değil!');
      return;
    }

    try {
      const loadingId = toast.loading('Kolaj oluşturuluyor...');
      await CollageService.createAutoCollage(canvas, products, config);
      toast.dismiss(loadingId);
      toast.success('Kolaj oluşturuldu!');
      onClose();
    } catch (error) {
      toast.dismiss();
      toast.error('Kolaj oluşturulamadı!');
      console.error(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="text-orange-600" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Otomatik Kolaj</h2>
                <p className="text-sm text-gray-600">Ürünlerinizi otomatik olarak yerleştirin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Layout Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout Seç</h3>
            <div className="grid grid-cols-2 gap-3">
              {layouts.map((layout) => {
                const Icon = layout.icon;
                return (
                  <button
                    key={layout.id}
                    onClick={() => setConfig({ ...config, layout: layout.id as any })}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all ${
                      config.layout === layout.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={24} className={config.layout === layout.id ? 'text-orange-600' : 'text-gray-600'} />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{layout.name}</div>
                      <div className="text-xs text-gray-500">{layout.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Settings */}
          {config.layout === 'grid' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kolonlar</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={config.columns}
                  onChange={(e) => setConfig({ ...config, columns: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Satırlar</label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={config.rows}
                  onChange={(e) => setConfig({ ...config, rows: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Brand Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marka</label>
              <select
                value={selectedBrandId ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedBrandId(value ? Number(value) : undefined);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Tüm markalar</option>
                {brandOptions.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data State */}
          <div className="space-y-2">
            {hasError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                Veri yüklenemedi. {error?.message}
                <button onClick={refetch} className="ml-2 underline">Tekrar dene</button>
              </div>
            )}
            {isLoading && (
              <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm px-4 py-3 rounded-lg">
                Ürünler yükleniyor...
              </div>
            )}
            {!isLoading && !hasError && products.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-lg">
                Uygun ürün bulunamadı. Lütfen ürünlerinizi kontrol edin.
              </div>
            )}
          </div>

          {/* Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Seçenekler</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showProductInfo}
                  onChange={(e) => setConfig({ ...config, showProductInfo: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Ürün bilgilerini göster</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showPrices}
                  onChange={(e) => setConfig({ ...config, showPrices: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Fiyatları göster</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showLogo}
                  onChange={(e) => setConfig({ ...config, showLogo: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Marka logosu ekle</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.showQRCode}
                  onChange={(e) => setConfig({ ...config, showQRCode: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">QR kod ekle</span>
              </label>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Arka Plan Rengi</label>
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                className="w-full h-10 rounded border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Marka Rengi</label>
              <input
                type="color"
                value={config.brandColor}
                onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                className="w-full h-10 rounded border border-gray-300"
              />
            </div>
          </div>

          {/* Product Count */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {products.length} ürün hazır
              </span>
              <span className="text-xs text-blue-600">
                {config.layout === 'grid' ? `${config.columns}x${config.rows} = ${griddedProductCount} gösterilecek` : 'Tümü gösterilecek'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-blue-700">
              <span>Marka filtrelemesi yakında eklenecek.</span>
              <button onClick={refetch} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Yenile</button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleGenerate}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Zap size={18} />
            Kolaj Oluştur
          </button>
        </div>
      </div>
    </div>
  );
};

export default CollageAutomation;
