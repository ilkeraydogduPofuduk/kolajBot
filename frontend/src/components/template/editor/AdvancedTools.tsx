import React, { useState } from 'react';
import { 
    Palette, Layers, Filter, Crop, RotateCw, 
  FlipHorizontal, FlipVertical, Move, Scale, Type, 
  Image as ImageIcon, Square, Circle, Star, Heart,
  Zap, Sparkles, Download, Upload, Settings
} from 'lucide-react';

interface AdvancedToolsProps {
  onToolSelect: (tool: string) => void;
  onColorChange: (color: string) => void;
  onGradientChange: (gradient: string) => void;
  onFilterApply: (filter: string) => void;
  onTransform: (transform: string) => void;
  onEffectApply: (effect: string) => void;
}

const AdvancedTools: React.FC<AdvancedToolsProps> = ({
  onToolSelect,
  onColorChange,
  onGradientChange,
  onFilterApply,
  onTransform,
  onEffectApply
}) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'effects' | 'transforms' | 'shapes' | 'text'>('colors');

  const colorPalettes = [
    { name: 'Modern', colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'] },
    { name: 'Vintage', colors: ['#D4A574', '#8B4513', '#CD853F', '#DEB887', '#F5DEB3'] },
    { name: 'Neon', colors: ['#FF0080', '#00FFFF', '#FFFF00', '#FF00FF', '#00FF00'] },
    { name: 'Pastel', colors: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF'] },
    { name: 'Monochrome', colors: ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'] }
  ];

  const gradients = [
    { name: 'Sunset', value: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)' },
    { name: 'Ocean', value: 'linear-gradient(45deg, #667eea, #764ba2)' },
    { name: 'Forest', value: 'linear-gradient(45deg, #134e5e, #71b280)' },
    { name: 'Fire', value: 'linear-gradient(45deg, #ff9a9e, #fecfef)' },
    { name: 'Purple', value: 'linear-gradient(45deg, #a8edea, #fed6e3)' }
  ];

  const filters = [
    { name: 'Blur', value: 'blur(5px)' },
    { name: 'Brightness', value: 'brightness(1.2)' },
    { name: 'Contrast', value: 'contrast(1.5)' },
    { name: 'Saturate', value: 'saturate(2)' },
    { name: 'Sepia', value: 'sepia(1)' },
    { name: 'Grayscale', value: 'grayscale(1)' },
    { name: 'Invert', value: 'invert(1)' }
  ];

  const transforms = [
    { name: 'Rotate 90°', value: 'rotate-90' },
    { name: 'Rotate 180°', value: 'rotate-180' },
    { name: 'Rotate 270°', value: 'rotate-270' },
    { name: 'Flip Horizontal', value: 'flip-h' },
    { name: 'Flip Vertical', value: 'flip-v' },
    { name: 'Scale 50%', value: 'scale-50' },
    { name: 'Scale 150%', value: 'scale-150' },
    { name: 'Scale 200%', value: 'scale-200' }
  ];

  const effects = [
    { name: 'Shadow', value: 'shadow' },
    { name: 'Glow', value: 'glow' },
    { name: 'Outline', value: 'outline' },
    { name: 'Emboss', value: 'emboss' },
    { name: 'Bevel', value: 'bevel' },
    { name: 'Gradient Text', value: 'gradient-text' },
    { name: '3D Effect', value: '3d' }
  ];

  const shapes = [
    { name: 'Rectangle', icon: Square, value: 'rectangle' },
    { name: 'Circle', icon: Circle, value: 'circle' },
    { name: 'Star', icon: Star, value: 'star' },
    { name: 'Heart', icon: Heart, value: 'heart' },
    { name: 'Triangle', icon: Square, value: 'triangle' },
    { name: 'Diamond', icon: Square, value: 'diamond' },
    { name: 'Hexagon', icon: Square, value: 'hexagon' }
  ];

  const textEffects = [
    { name: 'Bold', value: 'bold' },
    { name: 'Italic', value: 'italic' },
    { name: 'Underline', value: 'underline' },
    { name: 'Strikethrough', value: 'strikethrough' },
    { name: 'Uppercase', value: 'uppercase' },
    { name: 'Lowercase', value: 'lowercase' },
    { name: 'Capitalize', value: 'capitalize' }
  ];

  const tabs = [
    { id: 'colors', name: 'Renkler', icon: Palette },
    { id: 'effects', name: 'Efektler', icon: Sparkles },
    { id: 'transforms', name: 'Dönüşümler', icon: RotateCw },
    { id: 'shapes', name: 'Şekiller', icon: Square },
    { id: 'text', name: 'Metin', icon: Type }
  ];

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Gelişmiş Araçlar</h3>
        <button className="p-2 hover:bg-gray-100 rounded">
          <Settings size={16} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon size={12} />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Colors Tab */}
      {activeTab === 'colors' && (
        <div className="space-y-4">
          {/* Color Palettes */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Renk Paletleri</h4>
            <div className="space-y-2">
              {colorPalettes.map(palette => (
                <div key={palette.name} className="space-y-1">
                  <div className="text-xs text-gray-600">{palette.name}</div>
                  <div className="flex gap-1">
                    {palette.colors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => onColorChange(color)}
                        className="w-8 h-8 rounded border-2 border-gray-200 hover:border-gray-400"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gradients */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Gradyanlar</h4>
            <div className="grid grid-cols-2 gap-2">
              {gradients.map(gradient => (
                <button
                  key={gradient.name}
                  onClick={() => onGradientChange(gradient.value)}
                  className="h-12 rounded border border-gray-200 hover:border-gray-400 relative overflow-hidden"
                  style={{ background: gradient.value }}
                  title={gradient.name}
                >
                  <span className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center text-xs text-white font-medium">
                    {gradient.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Picker */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Özel Renk</h4>
            <div className="flex items-center gap-2">
              <input
                type="color"
                onChange={(e) => onColorChange(e.target.value)}
                className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                placeholder="#000000"
                className="flex-1 p-2 border border-gray-300 rounded text-sm"
                onChange={(e) => onColorChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Effects Tab */}
      {activeTab === 'effects' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Görsel Efektler</h4>
            <div className="grid grid-cols-2 gap-2">
              {filters.map(filter => (
                <button
                  key={filter.name}
                  onClick={() => onFilterApply(filter.value)}
                  className="p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
                >
                  {filter.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Özel Efektler</h4>
            <div className="grid grid-cols-2 gap-2">
              {effects.map(effect => (
                <button
                  key={effect.name}
                  onClick={() => onEffectApply(effect.value)}
                  className="p-2 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded border border-purple-200"
                >
                  {effect.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transforms Tab */}
      {activeTab === 'transforms' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Dönüşümler</h4>
            <div className="grid grid-cols-2 gap-2">
              {transforms.map(transform => (
                <button
                  key={transform.name}
                  onClick={() => onTransform(transform.value)}
                  className="p-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-200"
                >
                  {transform.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Hızlı İşlemler</h4>
            <div className="space-y-2">
              <button
                onClick={() => onToolSelect('align-center')}
                className="w-full p-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded border border-green-200"
              >
                Ortala
              </button>
              <button
                onClick={() => onToolSelect('distribute')}
                className="w-full p-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded border border-green-200"
              >
                Eşit Dağıt
              </button>
              <button
                onClick={() => onToolSelect('group')}
                className="w-full p-2 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded border border-green-200"
              >
                Grupla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shapes Tab */}
      {activeTab === 'shapes' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Şekiller</h4>
            <div className="grid grid-cols-2 gap-2">
              {shapes.map(shape => (
                <button
                  key={shape.name}
                  onClick={() => onToolSelect(shape.value)}
                  className="p-3 flex flex-col items-center gap-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200"
                >
                  <shape.icon size={20} className="text-gray-600" />
                  <span className="text-xs text-gray-700">{shape.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shape Properties */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Şekil Özellikleri</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Kenar Kalınlığı</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  defaultValue="2"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Köşe Yuvarlaklığı</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  defaultValue="0"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Tab */}
      {activeTab === 'text' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Metin Efektleri</h4>
            <div className="grid grid-cols-2 gap-2">
              {textEffects.map(effect => (
                <button
                  key={effect.name}
                  onClick={() => onEffectApply(effect.value)}
                  className="p-2 text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 rounded border border-orange-200"
                >
                  {effect.name}
                </button>
              ))}
            </div>
          </div>

          {/* Font Families */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Font Aileleri</h4>
            <select className="w-full p-2 border border-gray-300 rounded text-sm">
              <option>Arial</option>
              <option>Helvetica</option>
              <option>Times New Roman</option>
              <option>Georgia</option>
              <option>Verdana</option>
              <option>Comic Sans MS</option>
              <option>Impact</option>
              <option>Trebuchet MS</option>
            </select>
          </div>

          {/* Text Styles */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Metin Stilleri</h4>
            <div className="space-y-2">
              <button className="w-full p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-left">
                Başlık 1
              </button>
              <button className="w-full p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-left">
                Başlık 2
              </button>
              <button className="w-full p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-left">
                Normal Metin
              </button>
              <button className="w-full p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-left">
                Küçük Metin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Hızlı İşlemler</h4>
        <div className="space-y-2">
          <button className="w-full p-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">
            <Zap size={14} className="inline mr-1" />
            Otomatik Düzen
          </button>
          <button className="w-full p-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">
            <Download size={14} className="inline mr-1" />
            Stil Kaydet
          </button>
          <button className="w-full p-2 text-sm bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors">
            <Upload size={14} className="inline mr-1" />
            Stil Yükle
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTools;
