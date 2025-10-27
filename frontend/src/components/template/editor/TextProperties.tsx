import React from 'react';
import { Bold, Italic, Underline, Type } from 'lucide-react';

interface TextPropertiesProps {
  selectedObject: any;
  canvas: any;
  textColor: string;
  setTextColor: (color: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  fontFamily: string;
  setFontFamily: (family: string) => void;
}

const TextProperties: React.FC<TextPropertiesProps> = ({
  selectedObject,
  canvas,
  textColor,
  setTextColor,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily
}) => {
  const toggleBold = () => {
    const isBold = selectedObject.fontWeight === 'bold';
    selectedObject.set('fontWeight', isBold ? 'normal' : 'bold');
    canvas.renderAll();
  };

  const toggleItalic = () => {
    const isItalic = selectedObject.fontStyle === 'italic';
    selectedObject.set('fontStyle', isItalic ? 'normal' : 'italic');
    canvas.renderAll();
  };

  const toggleUnderline = () => {
    selectedObject.set('underline', !selectedObject.underline);
    canvas.renderAll();
  };

  const toggleStrikethrough = () => {
    selectedObject.set('linethrough', !selectedObject.linethrough);
    canvas.renderAll();
  };

  const changeTextAlign = (align: string) => {
    selectedObject.set('textAlign', align);
    canvas.renderAll();
  };

  const changeLineHeight = (height: number) => {
    selectedObject.set('lineHeight', height);
    canvas.renderAll();
  };

  const changeCharSpacing = (spacing: number) => {
    selectedObject.set('charSpacing', spacing);
    canvas.renderAll();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-3">Metin Özellikleri</h3>

      {/* Color */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Renk</label>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedObject.fill || textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              selectedObject.set('fill', e.target.value);
              canvas?.renderAll();
            }}
            className="w-full h-10 rounded border border-gray-300 cursor-pointer"
          />
          <input
            type="text"
            value={selectedObject.fill || textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              selectedObject.set('fill', e.target.value);
              canvas?.renderAll();
            }}
            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="#000000"
          />
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Font Boyutu: {selectedObject.fontSize || fontSize}px
        </label>
        <input
          type="range"
          min="8"
          max="200"
          value={selectedObject.fontSize || fontSize}
          onChange={(e) => {
            const size = parseInt(e.target.value);
            setFontSize(size);
            selectedObject.set('fontSize', size);
            canvas?.renderAll();
          }}
          className="w-full"
        />
      </div>

      {/* Font Family */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Font</label>
        <select
          value={selectedObject.fontFamily || fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            selectedObject.set('fontFamily', e.target.value);
            canvas?.renderAll();
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
          <option value="Impact">Impact</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Palatino">Palatino</option>
        </select>
      </div>

      {/* Text Style */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Stil</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={toggleBold}
            className={`p-2 rounded border ${
              selectedObject.fontWeight === 'bold'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Kalın"
          >
            <Bold className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={toggleItalic}
            className={`p-2 rounded border ${
              selectedObject.fontStyle === 'italic'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="İtalik"
          >
            <Italic className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={toggleUnderline}
            className={`p-2 rounded border ${
              selectedObject.underline
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Altı Çizili"
          >
            <Underline className="w-4 h-4 mx-auto" />
          </button>
          <button
            onClick={toggleStrikethrough}
            className={`p-2 rounded border ${
              selectedObject.linethrough
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
            title="Üstü Çizili"
          >
            <Type className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      {/* Text Align */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Hizalama</label>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => changeTextAlign('left')}
            className={`px-3 py-2 rounded border text-sm ${
              selectedObject.textAlign === 'left'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Sol
          </button>
          <button
            onClick={() => changeTextAlign('center')}
            className={`px-3 py-2 rounded border text-sm ${
              selectedObject.textAlign === 'center'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Orta
          </button>
          <button
            onClick={() => changeTextAlign('right')}
            className={`px-3 py-2 rounded border text-sm ${
              selectedObject.textAlign === 'right'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            Sağ
          </button>
          <button
            onClick={() => changeTextAlign('justify')}
            className={`px-3 py-2 rounded border text-sm ${
              selectedObject.textAlign === 'justify'
                ? 'bg-blue-500 text-white border-blue-500'
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            İki Yana
          </button>
        </div>
      </div>

      {/* Line Height */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Satır Yüksekliği: {selectedObject.lineHeight?.toFixed(1) || 1}
        </label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={selectedObject.lineHeight || 1}
          onChange={(e) => changeLineHeight(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Char Spacing */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Harf Aralığı: {selectedObject.charSpacing || 0}
        </label>
        <input
          type="range"
          min="-200"
          max="800"
          step="10"
          value={selectedObject.charSpacing || 0}
          onChange={(e) => changeCharSpacing(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Text Shadow */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Gölge</label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!selectedObject.shadow}
              onChange={(e) => {
                if (e.target.checked) {
                  selectedObject.set('shadow', {
                    color: 'rgba(0,0,0,0.3)',
                    blur: 5,
                    offsetX: 2,
                    offsetY: 2
                  });
                } else {
                  selectedObject.set('shadow', null);
                }
                canvas.renderAll();
              }}
              className="rounded"
            />
            <span className="text-sm">Gölge Ekle</span>
          </div>
          {selectedObject.shadow && (
            <div className="pl-6 space-y-2">
              <div>
                <label className="text-xs text-gray-600">Bulanıklık: {selectedObject.shadow.blur}</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={selectedObject.shadow.blur}
                  onChange={(e) => {
                    selectedObject.shadow.blur = parseInt(e.target.value);
                    canvas.renderAll();
                  }}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextProperties;

