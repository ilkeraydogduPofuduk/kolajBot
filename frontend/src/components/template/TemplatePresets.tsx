import React from 'react';
import { Canvas } from 'fabric';
import { Product } from '../../api/products';
import { 
  createStandardTemplate 
} from '../../services/template/templateCreators';
import { 
  createMinimalTemplate,
  createCatalogTemplate,
  createSocialTemplate,
  createInstagramTemplate,
  createModernTemplate
} from '../../services/template/templatePresets';
import { toast } from 'react-hot-toast';

interface TemplatePresetsProps {
  canvas: Canvas | null;
  product: Product;
  onGenerateAI: () => void;
}

const TemplatePresets: React.FC<TemplatePresetsProps> = ({
  canvas,
  product,
  onGenerateAI,
}) => {
  const handleCreateTemplate = async (templateType: string) => {
    if (!canvas) {
      toast.error('Canvas bulunamadı');
      return;
    }

    try {
      // Canvas'ı temizle
      canvas.clear();
      
      // Belirli bir gecikme vererek canvas'ın temizlenmesini bekle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      switch (templateType) {
        case 'standard':
          await createStandardTemplate(canvas, product);
          break;
        case 'minimal':
          await createMinimalTemplate(canvas, product);
          break;
        case 'catalog':
          await createCatalogTemplate(canvas, product);
          break;
        case 'social':
          await createSocialTemplate(canvas, product);
          break;
        case 'instagram':
          await createInstagramTemplate(canvas, product);
          break;
        case 'modern':
          await createModernTemplate(canvas, product);
          break;
        default:
          toast.error('Bilinmeyen şablon tipi');
          return;
      }
      
      // Canvas'ı yeniden render et
      canvas.renderAll();
      toast.success(`${templateType.charAt(0).toUpperCase() + templateType.slice(1)} şablonu oluşturuldu!`);
    } catch (error) {
      console.error('Template creation error:', error);
      toast.error('Şablon oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Hazır Şablonlar</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCreateTemplate('standard')}
            className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-medium transition-colors"
          >
            Standart
          </button>
          <button
            onClick={() => handleCreateTemplate('minimal')}
            className="px-2 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-xs font-medium transition-colors"
          >
            Minimal
          </button>
          <button
            onClick={() => handleCreateTemplate('catalog')}
            className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition-colors"
          >
            Katalog
          </button>
          <button
            onClick={() => handleCreateTemplate('social')}
            className="px-2 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded text-xs font-medium transition-colors"
          >
            Sosyal
          </button>
          <button
            onClick={() => handleCreateTemplate('instagram')}
            className="px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded text-xs font-medium transition-colors"
          >
            Instagram
          </button>
          <button
            onClick={() => handleCreateTemplate('modern')}
            className="px-2 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs font-medium transition-colors"
          >
            Modern
          </button>
        </div>
      </div>
      
      {/* AI Template Generator */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Yapay Zeka</h4>
        <button
          onClick={onGenerateAI}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 rounded transition-colors"
        >
          <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-purple-700">AI Üret</span>
        </button>
      </div>
    </div>
  );
};

export default TemplatePresets;
