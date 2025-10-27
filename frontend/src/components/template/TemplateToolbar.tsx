import React from 'react';
import { 
  Type, 
  Square,
  Circle,
  Trash2,
  ImagePlus,
  Palette,
  Sparkles,
  Download,
  Upload,
  FileJson,
  Save
} from 'lucide-react';
import { Canvas, FabricObject } from 'fabric';
import { Template } from '../../api/templates';
import { toast } from 'react-hot-toast';

interface TemplateToolbarProps {
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  savedTemplates: Template[];
  onAddText: () => void;
  onAddHeading: () => void;
  onAddShape: () => void;
  onAddImage: () => void;
  onDeleteObject: () => void;
  onLoadTemplate: (template: Template) => void;
  onAddGradientBackground: () => void;
  onAddWatermark: () => void;
  onAddBorder: () => void;
  onAddShadow: () => void;
  onOptimizeLayout: () => void;
  onGenerateColorPalette: () => void;
  onClearCanvas: () => void;
  onRenderCanvas: () => void;
  onSaveTemplate: () => void;
  onExportTemplate: () => void;
  onImportTemplate: () => void;
  onExportTemplatePNG: () => void;
}

const TemplateToolbar: React.FC<TemplateToolbarProps> = ({
  canvas,
  selectedObject,
  savedTemplates,
  onAddText,
  onAddHeading,
  onAddShape,
  onAddImage,
  onDeleteObject,
  onLoadTemplate,
  onAddGradientBackground,
  onAddWatermark,
  onAddBorder,
  onAddShadow,
  onOptimizeLayout,
  onGenerateColorPalette,
  onClearCanvas,
  onRenderCanvas,
  onSaveTemplate,
  onExportTemplate,
  onImportTemplate,
  onExportTemplatePNG,
}) => {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">Şablon Araçları</h3>
        <button className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      
      {/* Saved Templates */}
      {savedTemplates.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Kayıtlı Şablonlar</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => onLoadTemplate(template)}
                className="w-full flex items-center justify-between px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-colors"
              >
                <span className="font-medium truncate">{template.name}</span>
                <span className="text-xs opacity-75">
                  {new Date(template.created_at).toLocaleDateString('tr-TR')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Design Tools */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Tasarım Araçları</h4>
        <div className="space-y-2">
          <button
            onClick={onAddText}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Type className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Metin Ekle</span>
          </button>

          <button
            onClick={onAddHeading}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Type className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Başlık Ekle</span>
          </button>

          <button
            onClick={onAddShape}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
          >
            <Square className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Şekil Ekle</span>
          </button>

          <button
            onClick={onAddImage}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <ImagePlus className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Görsel Ekle</span>
          </button>

          {selectedObject && (
            <button
              onClick={onDeleteObject}
              className="w-full flex items-center gap-3 px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">Seçili Öğeyi Sil</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Effects */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Efektler</h4>
        <div className="space-y-2">
          <button
            onClick={onAddGradientBackground}
            className="w-full flex items-center gap-3 px-4 py-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-left"
          >
            <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
            <span className="text-sm font-medium text-indigo-700">Gradient Arka Plan</span>
          </button>

          <button
            onClick={onAddWatermark}
            className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
          >
            <div className="w-5 h-5 bg-yellow-400 rounded opacity-50"></div>
            <span className="text-sm font-medium text-yellow-700">Filigran Ekle</span>
          </button>

          <button
            onClick={onAddBorder}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
          >
            <div className="w-5 h-5 border-2 border-gray-400 rounded"></div>
            <span className="text-sm font-medium text-gray-700">Çerçeve Ekle</span>
          </button>

          {selectedObject && (
            <button
              onClick={onAddShadow}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left"
            >
              <div className="w-5 h-5 bg-gray-300 rounded shadow-lg"></div>
              <span className="text-sm font-medium text-gray-700">Gölge Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Tools */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Araçları</h4>
        <div className="space-y-2">
          <button
            onClick={onOptimizeLayout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100 rounded-lg transition-colors text-left"
          >
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Layout Optimize Et</span>
          </button>

          <button
            onClick={onGenerateColorPalette}
            className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-lg transition-colors text-left"
          >
            <Palette className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-700">Renk Paleti Üret</span>
          </button>
        </div>
      </div>

      {/* File Operations */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Dosya İşlemleri</h4>
        <div className="space-y-2">
          <button
            onClick={onSaveTemplate}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <Save className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Şablonu Kaydet</span>
          </button>

          <button
            onClick={onExportTemplate}
            className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
          >
            <Download className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Dışa Aktar</span>
          </button>

          <button
            onClick={onImportTemplate}
            className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
          >
            <Upload className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">İçe Aktar</span>
          </button>
        </div>
      </div>

      {/* Canvas Actions */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Canvas İşlemleri</h4>
        <div className="space-y-2">
          <button
            onClick={onClearCanvas}
            className="w-full px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-colors"
          >
            Tümünü Temizle
          </button>
          <button
            onClick={onRenderCanvas}
            className="w-full px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
          >
            Yeniden Çiz
          </button>
        </div>
      </div>

      {/* Export/Import Actions */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">İçe/Dışa Aktar</h4>
        <div className="space-y-2">
          <button
            onClick={onExportTemplate}
            className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
          >
            <FileJson className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">JSON Dışa Aktar</span>
          </button>

          <button
            onClick={onImportTemplate}
            className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-left"
          >
            <Upload className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">JSON İçe Aktar</span>
          </button>

          <button
            onClick={onExportTemplatePNG}
            className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
          >
            <ImagePlus className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">PNG Dışa Aktar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateToolbar;
