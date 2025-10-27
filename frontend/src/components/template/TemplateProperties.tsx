import React, { useState, useEffect } from 'react';
import { Canvas, FabricObject, Textbox, Rect, Circle, Line, Image } from 'fabric';
import { Product } from '../../api/products';
import { HexColorPicker } from 'react-colorful';
import { toast } from 'react-hot-toast';

interface TemplatePropertiesProps {
  selectedObject: FabricObject | null;
  canvas: Canvas | null;
  product: Product;
  onObjectUpdate: () => void;
}

const TemplateProperties: React.FC<TemplatePropertiesProps> = ({
  selectedObject,
  canvas,
  product,
  onObjectUpdate,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerProperty, setColorPickerProperty] = useState<'fill' | 'stroke'>('fill');
  const [tempColor, setTempColor] = useState('#000000');

  // Object properties state
  const [objectProps, setObjectProps] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 1,
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fontFamily: 'Arial',
    textAlign: 'left',
    text: '',
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
  });

  // Update object properties when selection changes
  useEffect(() => {
    if (selectedObject) {
      setObjectProps({
        left: selectedObject.left || 0,
        top: selectedObject.top || 0,
        width: selectedObject.width || 0,
        height: selectedObject.height || 0,
        fill: (selectedObject as any).fill || '#000000',
        stroke: (selectedObject as any).stroke || '#000000',
        strokeWidth: (selectedObject as any).strokeWidth || 1,
        fontSize: (selectedObject as any).fontSize || 16,
        fontWeight: (selectedObject as any).fontWeight || 'normal',
        fontStyle: (selectedObject as any).fontStyle || 'normal',
        fontFamily: (selectedObject as any).fontFamily || 'Arial',
        textAlign: (selectedObject as any).textAlign || 'left',
        text: (selectedObject as any).text || '',
        opacity: selectedObject.opacity || 1,
        scaleX: selectedObject.scaleX || 1,
        scaleY: selectedObject.scaleY || 1,
        angle: selectedObject.angle || 0,
      });
    }
  }, [selectedObject]);

  // Update object property
  const updateObjectProperty = (property: string, value: any) => {
    if (!selectedObject || !canvas) return;

    try {
      // Special handling for text objects
      if (property === 'text' && selectedObject.type === 'textbox') {
        (selectedObject as Textbox).set(property, value);
      } else {
        // General property update
        selectedObject.set(property, value);
      }

      // Update state
      setObjectProps(prev => ({
        ...prev,
        [property]: value
      }));

      // Render canvas
      canvas.renderAll();
      onObjectUpdate();
    } catch (error) {
      console.error('Property update error:', error);
      toast.error('Özellik güncellenemedi');
    }
  };

  // Handle color change
  const handleColorChange = (color: string, property: 'fill' | 'stroke') => {
    setTempColor(color);
    updateObjectProperty(property, color);
  };

  // Open color picker
  const openColorPicker = (property: 'fill' | 'stroke') => {
    setColorPickerProperty(property);
    setTempColor(objectProps[property]);
    setShowColorPicker(true);
  };

  if (!selectedObject) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="mb-3">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700">Hiçbir öğe seçilmedi</p>
        <p className="text-xs mt-1 text-gray-500">Özellikleri görmek için canvas üzerinde bir nesneye tıklayın</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Nesne Özellikleri</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {selectedObject.type === 'textbox' ? 'Metin' : 
             selectedObject.type === 'rect' ? 'Dikdörtgen' :
             selectedObject.type === 'circle' ? 'Daire' :
             selectedObject.type === 'image' ? 'Görsel' : selectedObject.type}
          </span>
        </div>
        
        {/* Position and Size */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">X</label>
            <input
              type="number"
              value={Math.round(objectProps.left)}
              onChange={(e) => updateObjectProperty('left', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y</label>
            <input
              type="number"
              value={Math.round(objectProps.top)}
              onChange={(e) => updateObjectProperty('top', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Genişlik</label>
            <input
              type="number"
              value={Math.round(objectProps.width * objectProps.scaleX)}
              onChange={(e) => {
                const newWidth = parseInt(e.target.value) || 1;
                const originalWidth = objectProps.width || 1;
                const newScaleX = newWidth / originalWidth;
                updateObjectProperty('scaleX', newScaleX);
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Yükseklik</label>
            <input
              type="number"
              value={Math.round(objectProps.height * objectProps.scaleY)}
              onChange={(e) => {
                const newHeight = parseInt(e.target.value) || 1;
                const originalHeight = objectProps.height || 1;
                const newScaleY = newHeight / originalHeight;
                updateObjectProperty('scaleY', newScaleY);
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Transform */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Döndür</label>
            <input
              type="number"
              value={Math.round(objectProps.angle)}
              onChange={(e) => updateObjectProperty('angle', parseInt(e.target.value) || 0)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">X Ölçek</label>
            <input
              type="number"
              step="0.1"
              value={parseFloat(objectProps.scaleX.toFixed(1))}
              onChange={(e) => updateObjectProperty('scaleX', parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Y Ölçek</label>
            <input
              type="number"
              step="0.1"
              value={parseFloat(objectProps.scaleY.toFixed(1))}
              onChange={(e) => updateObjectProperty('scaleY', parseFloat(e.target.value) || 1)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Opacity */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-1">Opaklık: {Math.round(objectProps.opacity * 100)}%</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={objectProps.opacity}
            onChange={(e) => updateObjectProperty('opacity', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dolgu</label>
            <div className="relative">
              <button
                onClick={() => openColorPicker('fill')}
                className="w-full h-8 rounded border border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: objectProps.fill }}
              >
                <span className="text-xs text-gray-700 font-medium">Renk</span>
              </button>
              {showColorPicker && colorPickerProperty === 'fill' && (
                <div className="absolute z-20 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <HexColorPicker 
                    color={tempColor} 
                    onChange={(color: string) => handleColorChange(color, 'fill')}
                  />
                  <div className="flex justify-between mt-2">
                    <button 
                      onClick={() => setShowColorPicker(false)}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={() => setShowColorPicker(false)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Tamam
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-gray-600 mb-1">Kenar</label>
            <div className="relative">
              <button
                onClick={() => openColorPicker('stroke')}
                className="w-full h-8 rounded border border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: objectProps.stroke }}
              >
                <span className="text-xs text-gray-700 font-medium">Renk</span>
              </button>
              {showColorPicker && colorPickerProperty === 'stroke' && (
                <div className="absolute z-20 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <HexColorPicker 
                    color={tempColor} 
                    onChange={(color: string) => handleColorChange(color, 'stroke')}
                  />
                  <div className="flex justify-between mt-2">
                    <button 
                      onClick={() => setShowColorPicker(false)}
                      className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={() => setShowColorPicker(false)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Tamam
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stroke Width */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-1">Kenar Kalınlığı</label>
          <input
            type="range"
            min="0"
            max="20"
            value={objectProps.strokeWidth}
            onChange={(e) => updateObjectProperty('strokeWidth', parseInt(e.target.value) || 0)}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 text-center mt-1">
            {objectProps.strokeWidth}px
          </div>
        </div>

        {/* Text Properties (if textbox) */}
        {selectedObject.type === 'textbox' && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Metin</label>
              <textarea
                value={objectProps.text}
                onChange={(e) => updateObjectProperty('text', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Yazı Boyutu</label>
                <input
                  type="range"
                  min="8"
                  max="72"
                  value={objectProps.fontSize}
                  onChange={(e) => updateObjectProperty('fontSize', parseInt(e.target.value) || 16)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 text-center mt-1">
                  {objectProps.fontSize}px
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Ağırlık</label>
                <select
                  value={objectProps.fontWeight}
                  onChange={(e) => updateObjectProperty('fontWeight', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Kalın</option>
                  <option value="lighter">İnce</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Font</label>
                <select
                  value={objectProps.fontFamily}
                  onChange={(e) => updateObjectProperty('fontFamily', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Hizalama</label>
                <select
                  value={objectProps.textAlign}
                  onChange={(e) => updateObjectProperty('textAlign', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="left">Sol</option>
                  <option value="center">Orta</option>
                  <option value="right">Sağ</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => updateObjectProperty('fontStyle', objectProps.fontStyle === 'italic' ? 'normal' : 'italic')}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                  objectProps.fontStyle === 'italic' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Eğik
              </button>
              <button
                onClick={() => updateObjectProperty('underline', (selectedObject as any).underline ? false : true)}
                className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                  (selectedObject as any).underline 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Altı Çizili
              </button>
            </div>
          </div>
        )}

        {/* Object Actions */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (canvas && selectedObject) {
                  canvas.remove(selectedObject);
                  canvas.renderAll();
                  onObjectUpdate();
                  toast.success('Öğe silindi');
                }
              }}
              className="flex-1 px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
            >
              Sil
            </button>
            <button
              onClick={() => {
                if (canvas && selectedObject) {
                  canvas.bringObjectToFront(selectedObject);
                  canvas.renderAll();
                  toast.success('Öğe öne getirildi');
                }
              }}
              className="flex-1 px-2 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
            >
              Öne Getir
            </button>
            <button
              onClick={() => {
                if (canvas && selectedObject) {
                  canvas.sendObjectToBack(selectedObject);
                  canvas.renderAll();
                  toast.success('Öğe arkaya gönderildi');
                }
              }}
              className="flex-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              Arkaya Gönder
            </button>
          </div>
        </div>

        {/* Object Info */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div><span className="font-medium">ID:</span> {(selectedObject as any).id || 'N/A'}</div>
            <div><span className="font-medium">Koordinatlar:</span> ({Math.round(objectProps.left)}, {Math.round(objectProps.top)})</div>
            <div><span className="font-medium">Boyutlar:</span> {Math.round(objectProps.width * objectProps.scaleX)} × {Math.round(objectProps.height * objectProps.scaleY)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateProperties;