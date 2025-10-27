import React from 'react';
import {
  Type, Image as ImageIcon, Square, Circle, Triangle, Star,
  Upload, Download, Save, Trash2, Copy, AlignLeft, AlignCenter,
  AlignRight, Bold, Italic, Underline, Palette, Layers, ZoomIn,
  ZoomOut, RotateCw, Lock, Unlock, Eye, EyeOff, Plus,
  Undo, Redo, Grid, Ruler, Crop, Filter, Sparkles, 
  Heart, Diamond, Hexagon, Minus,
  Move, RotateCcw, FlipHorizontal, FlipVertical, BookOpen
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  onToolChange: (tool: string) => void;
  onSave: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onAIGenerate: () => void;
  onShowUsageGuide: () => void;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onSave,
  onExport,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onDelete,
  onCopy,
  onAIGenerate,
  onShowUsageGuide,
  zoom,
  canUndo,
  canRedo,
  hasSelection
}) => {
  const tools = [
    { id: 'select', icon: Plus, label: 'Seç' },
    { id: 'text', icon: Type, label: 'Metin' },
    { id: 'image', icon: ImageIcon, label: 'Görsel' },
    { id: 'rectangle', icon: Square, label: 'Dikdörtgen' },
    { id: 'circle', icon: Circle, label: 'Daire' },
    { id: 'triangle', icon: Triangle, label: 'Üçgen' },
    { id: 'star', icon: Star, label: 'Yıldız' },
    { id: 'heart', icon: Heart, label: 'Kalp' },
    { id: 'diamond', icon: Diamond, label: 'Elmas' },
    { id: 'hexagon', icon: Hexagon, label: 'Altıgen' },
    { id: 'line', icon: Minus, label: 'Çizgi' },
    { id: 'crop', icon: Crop, label: 'Kırp' },
    { id: 'filter', icon: Filter, label: 'Filtre' }
  ];

  const alignmentTools = [
    { id: 'align-left', icon: AlignLeft, label: 'Sola Hizala' },
    { id: 'align-center', icon: AlignCenter, label: 'Ortala' },
    { id: 'align-right', icon: AlignRight, label: 'Sağa Hizala' }
  ];

  const textTools = [
    { id: 'bold', icon: Bold, label: 'Kalın' },
    { id: 'italic', icon: Italic, label: 'İtalik' },
    { id: 'underline', icon: Underline, label: 'Altı Çizili' }
  ];

  const transformTools = [
    { id: 'rotate-cw', icon: RotateCw, label: 'Saat Yönünde Döndür' },
    { id: 'rotate-ccw', icon: RotateCcw, label: 'Saat Yönü Ters Döndür' },
    { id: 'flip-horizontal', icon: FlipHorizontal, label: 'Yatay Çevir' },
    { id: 'flip-vertical', icon: FlipVertical, label: 'Dikey Çevir' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Sol taraf - Ana araçlar */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            title="Geri Al"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
            title="İleri Al"
          >
            <Redo size={16} />
          </button>
        </div>

        {/* Ana araçlar */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`p-2 rounded hover:bg-gray-100 ${
                activeTool === tool.id ? 'bg-blue-100 text-blue-600' : ''
              }`}
              title={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>

        {/* Hizalama araçları */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          {alignmentTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className="p-2 hover:bg-gray-100 rounded"
              title={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>

        {/* Metin araçları */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
          {textTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className="p-2 hover:bg-gray-100 rounded"
              title={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>

        {/* Transform araçları */}
        <div className="flex items-center gap-1">
          {transformTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className="p-2 hover:bg-gray-100 rounded"
              title={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Orta - Zoom ve grid */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-gray-100 rounded"
          title="Uzaklaştır"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-gray-100 rounded"
          title="Yakınlaştır"
        >
          <ZoomIn size={16} />
        </button>
        
        <div className="border-l border-gray-200 pl-2">
          <button
            onClick={() => onToolChange('grid')}
            className={`p-2 rounded hover:bg-gray-100 ${
              activeTool === 'grid' ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Grid"
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => onToolChange('ruler')}
            className={`p-2 rounded hover:bg-gray-100 ${
              activeTool === 'ruler' ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Cetvel"
          >
            <Ruler size={16} />
          </button>
        </div>
      </div>

      {/* Sağ taraf - İşlemler */}
      <div className="flex items-center gap-2">
        {hasSelection && (
          <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
            <button
              onClick={onCopy}
              className="p-2 hover:bg-gray-100 rounded"
              title="Kopyala"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-gray-100 rounded text-red-600"
              title="Sil"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

                    <button
                      onClick={onAIGenerate}
                      className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded hover:from-purple-700 hover:to-pink-700 flex items-center gap-2"
                      title="AI ile Şablon Oluştur"
                    >
                      <Sparkles size={16} />
                      AI
                    </button>
                    <button
                      onClick={onShowUsageGuide}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                      title="Kullanım Kılavuzu"
                    >
                      <BookOpen size={16} />
                      Kılavuz
                    </button>
        <button
          onClick={onExport}
          className="p-2 hover:bg-gray-100 rounded"
          title="Dışa Aktar"
        >
          <Download size={16} />
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Save size={16} className="inline mr-1" />
          Kaydet
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
