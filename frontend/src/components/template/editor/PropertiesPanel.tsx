import React from 'react';
import { Palette, Type, Square, Image as ImageIcon, Layers } from 'lucide-react';

interface PropertiesPanelProps {
  selectedObject: any;
  activeTool: string;
  onPropertyChange: (property: string, value: any) => void;
  textColor: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  onColorChange: (type: 'text' | 'fill' | 'stroke', color: string) => void;
  onFontSizeChange: (size: number) => void;
  onFontFamilyChange: (family: string) => void;
  onOpacityChange: (opacity: number) => void;
  onRotationChange: (rotation: number) => void;
  onScaleChange: (scaleX: number, scaleY: number) => void;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  borderRadius: number;
  onShadowChange: (property: string, value: any) => void;
  onBorderRadiusChange: (radius: number) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  activeTool,
  onPropertyChange,
  textColor,
  fillColor,
  strokeColor,
  strokeWidth,
  fontSize,
  fontFamily,
  opacity,
  rotation,
  scaleX,
  scaleY,
  onColorChange,
  onFontSizeChange,
  onFontFamilyChange,
  onOpacityChange,
  onRotationChange,
  onScaleChange,
  shadowColor,
  shadowBlur,
  shadowOffsetX,
  shadowOffsetY,
  borderRadius,
  onShadowChange,
  onBorderRadiusChange
}) => {
  const fontFamilies = [
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Comic Sans MS',
    'Courier New', 'Lucida Console', 'Palatino', 'Garamond'
  ];

  const presetColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const renderTextProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type size={16} className="inline mr-1" />
          Metin Özellikleri
        </label>
        
        {/* Font Family */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Font Ailesi</label>
          <select
            value={fontFamily}
            onChange={(e) => onFontFamilyChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-sm"
          >
            {fontFamilies.map(font => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </div>

        {/* Font Size */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Font Boyutu</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="8"
              max="200"
              value={fontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{fontSize}px</span>
          </div>
        </div>

        {/* Text Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Metin Rengi</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onColorChange('text', e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => onColorChange('text', e.target.value)}
              className="flex-1 p-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="grid grid-cols-5 gap-1 mt-2">
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange('text', color)}
                className="w-6 h-6 border border-gray-300 rounded"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderShapeProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Square size={16} className="inline mr-1" />
          Şekil Özellikleri
        </label>

        {/* Fill Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Dolgu Rengi</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fillColor}
              onChange={(e) => onColorChange('fill', e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={fillColor}
              onChange={(e) => onColorChange('fill', e.target.value)}
              className="flex-1 p-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div className="grid grid-cols-5 gap-1 mt-2">
            {presetColors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange('fill', color)}
                className="w-6 h-6 border border-gray-300 rounded"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Stroke Color */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Çizgi Rengi</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onColorChange('stroke', e.target.value)}
              className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => onColorChange('stroke', e.target.value)}
              className="flex-1 p-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Çizgi Kalınlığı</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="20"
              value={strokeWidth}
              onChange={(e) => onPropertyChange('strokeWidth', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-8">{strokeWidth}px</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransformProperties = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Layers size={16} className="inline mr-1" />
          Dönüşüm Özellikleri
        </label>

        {/* Opacity */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Şeffaflık</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              value={opacity * 100}
              onChange={(e) => onOpacityChange(parseInt(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{Math.round(opacity * 100)}%</span>
          </div>
        </div>

        {/* Rotation */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Döndürme</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="360"
              value={rotation}
              onChange={(e) => onRotationChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-medium w-12">{rotation}°</span>
          </div>
        </div>

        {/* Scale */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-1">Ölçek</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Genişlik</label>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={scaleX}
                  onChange={(e) => onScaleChange(parseFloat(e.target.value), scaleY)}
                  className="flex-1"
                />
                <span className="text-xs w-8">{Math.round(scaleX * 100)}%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Yükseklik</label>
              <div className="flex items-center gap-1">
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={scaleY}
                  onChange={(e) => onScaleChange(scaleX, parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs w-8">{Math.round(scaleY * 100)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Özellikler</h3>
      
      {selectedObject ? (
        <div className="space-y-6">
          {selectedObject.type === 'text' && renderTextProperties()}
          {(selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'triangle') && renderShapeProperties()}
          {renderTransformProperties()}
          {renderShadowProperties(shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, onShadowChange)}
          {renderBorderProperties(borderRadius, onBorderRadiusChange)}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Palette size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Bir nesne seçin</p>
          <p className="text-xs text-gray-400 mt-1">Özelliklerini düzenlemek için</p>
        </div>
      )}
    </div>
  );
};

const renderShadowProperties = (shadowColor: string, shadowBlur: number, shadowOffsetX: number, shadowOffsetY: number, onShadowChange: (property: string, value: any) => void) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Layers size={16} className="inline mr-1" />
        Gölge Özellikleri
      </label>

      {/* Shadow Color */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Gölge Rengi</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={shadowColor}
            onChange={(e) => onShadowChange('shadowColor', e.target.value)}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
          />
          <input
            type="text"
            value={shadowColor}
            onChange={(e) => onShadowChange('shadowColor', e.target.value)}
            className="flex-1 p-1 border border-gray-300 rounded text-sm"
          />
        </div>
      </div>

      {/* Shadow Blur */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Gölge Bulanıklığı</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="50"
            value={shadowBlur}
            onChange={(e) => onShadowChange('shadowBlur', parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium w-8">{shadowBlur}px</span>
        </div>
      </div>

      {/* Shadow Offset */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Gölge Konumu</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X</label>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="-50"
                max="50"
                value={shadowOffsetX}
                onChange={(e) => onShadowChange('shadowOffsetX', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs w-8">{shadowOffsetX}px</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y</label>
            <div className="flex items-center gap-1">
              <input
                type="range"
                min="-50"
                max="50"
                value={shadowOffsetY}
                onChange={(e) => onShadowChange('shadowOffsetY', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs w-8">{shadowOffsetY}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const renderBorderProperties = (borderRadius: number, onBorderRadiusChange: (radius: number) => void) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Square size={16} className="inline mr-1" />
        Kenar Özellikleri
      </label>

      {/* Border Radius */}
      <div className="mb-3">
        <label className="block text-xs text-gray-600 mb-1">Köşe Yuvarlaklığı</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="50"
            value={borderRadius}
            onChange={(e) => onBorderRadiusChange(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium w-8">{borderRadius}px</span>
        </div>
      </div>
    </div>
  </div>
);

export default PropertiesPanel;
