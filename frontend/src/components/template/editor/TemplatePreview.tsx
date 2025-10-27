import React, { useState, useEffect } from 'react';
import { Eye, Download, Share2, Smartphone, Monitor, Tablet, RotateCw, Play, Pause } from 'lucide-react';

interface TemplatePreviewProps {
  templateData: any;
  previewData: Record<string, any>;
  onExport: (format: 'png' | 'jpg' | 'pdf') => void;
  onShare: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  templateData,
  previewData,
  onExport,
  onShare
}) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [currentFrame, setCurrentFrame] = useState(0);

  const deviceSizes = {
    desktop: { width: 720, height: 1280 },
    tablet: { width: 540, height: 960 },
    mobile: { width: 360, height: 640 }
  };

  const currentSize = deviceSizes[previewMode];

  // Mock animation frames - gerçek uygulamada template'den gelecek
  const animationFrames = [
    { id: 1, name: 'Başlangıç', duration: 1000 },
    { id: 2, name: 'Ürün Girişi', duration: 1500 },
    { id: 3, name: 'Fiyat Animasyonu', duration: 1000 },
    { id: 4, name: 'Marka Logosu', duration: 800 },
    { id: 5, name: 'Son', duration: 1000 }
  ];

  const renderPreviewContent = () => {
    // Bu kısım gerçek template render'ı olacak
    return (
      <div 
        className="bg-white border border-gray-300 shadow-lg"
        style={{ 
          width: currentSize.width, 
          height: currentSize.height,
          transform: `scale(${previewMode === 'desktop' ? 0.8 : previewMode === 'tablet' ? 0.6 : 0.4})`,
          transformOrigin: 'top left'
        }}
      >
        {/* Mock template content */}
        <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-purple-50">
          {/* Header */}
          <div className="bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {previewData['brand-logo'] ? (
                  <img
                    src={previewData['brand-logo']}
                    alt="Brand Logo"
                    className="w-8 h-8 object-contain"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                )}
                <span className="font-bold text-lg">
                  {previewData['brand-name'] || '{{brand.name}}'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {previewData['campaign-end-date'] || '{{campaign.endDate}}'}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6 space-y-4">
            {/* Product Image */}
            <div className="text-center">
              {previewData['product-image'] ? (
                <img
                  src={previewData['product-image']}
                  alt="Product"
                  className="w-48 h-48 object-cover mx-auto rounded-lg shadow-md"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-gray-400">Ürün Görseli</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                {previewData['product-name'] || '{{product.name}}'}
              </h2>
              
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold text-green-600">
                  ₺{previewData['product-price'] || '{{product.price}}'}
                </span>
                {previewData['discount-percentage'] && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                    %{previewData['discount-percentage']} İndirim
                  </span>
                )}
              </div>
            </div>

            {/* Call to Action */}
            <div className="text-center">
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Hemen Satın Al
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-100 p-4 text-center text-sm text-gray-600">
            <p>Kampanya süresi dolduktan sonra geçersizdir.</p>
          </div>
        </div>
      </div>
    );
  };

  const handleAnimationToggle = () => {
    setIsAnimating(!isAnimating);
  };

  const handleFrameChange = (frameIndex: number) => {
    setCurrentFrame(frameIndex);
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Önizleme</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onExport('png')}
            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
            title="PNG Olarak İndir"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onShare}
            className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            title="Paylaş"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Device Selection */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setPreviewMode('desktop')}
          className={`p-2 rounded ${
            previewMode === 'desktop' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}
          title="Desktop"
        >
          <Monitor size={16} />
        </button>
        <button
          onClick={() => setPreviewMode('tablet')}
          className={`p-2 rounded ${
            previewMode === 'tablet' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}
          title="Tablet"
        >
          <Tablet size={16} />
        </button>
        <button
          onClick={() => setPreviewMode('mobile')}
          className={`p-2 rounded ${
            previewMode === 'mobile' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          }`}
          title="Mobile"
        >
          <Smartphone size={16} />
        </button>
      </div>

      {/* Preview Canvas */}
      <div className="mb-4">
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
          {renderPreviewContent()}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Animasyon</h4>
          <button
            onClick={handleAnimationToggle}
            className={`p-1 rounded ${
              isAnimating ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isAnimating ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Hız:</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.5"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-gray-600">{animationSpeed}x</span>
          </div>

          <div className="space-y-1">
            {animationFrames.map((frame, index) => (
              <button
                key={frame.id}
                onClick={() => handleFrameChange(index)}
                className={`w-full p-2 text-left text-xs rounded ${
                  currentFrame === index
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{frame.name}</span>
                  <span>{frame.duration}ms</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Dışa Aktar</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onExport('png')}
            className="p-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            PNG
          </button>
          <button
            onClick={() => onExport('jpg')}
            className="p-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            JPG
          </button>
          <button
            onClick={() => onExport('pdf')}
            className="p-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            PDF
          </button>
        </div>
      </div>

      {/* Preview Info */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Önizleme Bilgileri</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Boyut:</span>
            <span>{currentSize.width}x{currentSize.height}</span>
          </div>
          <div className="flex justify-between">
            <span>Cihaz:</span>
            <span className="capitalize">{previewMode}</span>
          </div>
          <div className="flex justify-between">
            <span>Animasyon:</span>
            <span>{isAnimating ? 'Aktif' : 'Pasif'}</span>
          </div>
          <div className="flex justify-between">
            <span>Veri Alanları:</span>
            <span>{Object.keys(previewData).length}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Hızlı İşlemler</h4>
        <div className="space-y-2">
          <button className="w-full p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
            <Eye size={14} className="inline mr-1" />
            Canlı Önizleme
          </button>
          <button className="w-full p-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
            <Share2 size={14} className="inline mr-1" />
            Paylaşılabilir Link Oluştur
          </button>
          <button className="w-full p-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
            <RotateCw size={14} className="inline mr-1" />
            Animasyonu Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
