import React from 'react';
import { Layers, Eye, EyeOff, Lock, Unlock, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerMoveUp: (layerId: string) => void;
  onLayerMoveDown: (layerId: string) => void;
  onLayerRename: (layerId: string, newName: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerDelete,
  onLayerDuplicate,
  onLayerMoveUp,
  onLayerMoveDown,
  onLayerRename
}) => {
  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'text':
        return 'T';
      case 'image':
        return '🖼️';
      case 'rect':
        return '⬜';
      case 'circle':
        return '⭕';
      case 'triangle':
        return '🔺';
      case 'star':
        return '⭐';
      default:
        return '📄';
    }
  };

  const getLayerTypeName = (type: string) => {
    switch (type) {
      case 'text':
        return 'Metin';
      case 'image':
        return 'Görsel';
      case 'rect':
        return 'Dikdörtgen';
      case 'circle':
        return 'Daire';
      case 'triangle':
        return 'Üçgen';
      case 'star':
        return 'Yıldız';
      default:
        return 'Nesne';
    }
  };

  const sortedLayers = [...layers].sort((a, b) => b.order - a.order);

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Layers size={20} className="mr-2" />
          Katmanlar
        </h3>
        <span className="text-sm text-gray-500">{layers.length}</span>
      </div>

      {layers.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Layers size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Henüz katman yok</p>
          <p className="text-xs text-gray-400 mt-1">Nesne ekleyerek başlayın</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sortedLayers.map((layer, index) => (
            <div
              key={layer.id}
              className={`group flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                selectedLayerId === layer.id
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => onLayerSelect(layer.id)}
            >
              {/* Layer Icon */}
              <div className="flex-shrink-0 w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center text-sm font-medium">
                {getLayerIcon(layer.type)}
              </div>

              {/* Layer Info */}
              <div className="flex-1 ml-3 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {layer.name || `${getLayerTypeName(layer.type)} ${index + 1}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(layer.opacity * 100)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {getLayerTypeName(layer.type)}
                </div>
              </div>

              {/* Layer Controls */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleVisibility(layer.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={layer.visible ? 'Gizle' : 'Göster'}
                >
                  {layer.visible ? (
                    <Eye size={14} className="text-gray-600" />
                  ) : (
                    <EyeOff size={14} className="text-gray-400" />
                  )}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleLock(layer.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={layer.locked ? 'Kilidi Aç' : 'Kilitle'}
                >
                  {layer.locked ? (
                    <Lock size={14} className="text-gray-600" />
                  ) : (
                    <Unlock size={14} className="text-gray-400" />
                  )}
                </button>

                {/* Move Up */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerMoveUp(layer.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Yukarı Taşı"
                >
                  <ChevronUp size={14} className="text-gray-600" />
                </button>

                {/* Move Down */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerMoveDown(layer.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Aşağı Taşı"
                >
                  <ChevronDown size={14} className="text-gray-600" />
                </button>

                {/* Duplicate */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDuplicate(layer.id);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Kopyala"
                >
                  <Copy size={14} className="text-gray-600" />
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(layer.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Sil"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Layer Actions */}
      {layers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Katman İşlemleri</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                // Tüm katmanları göster
                layers.forEach(layer => {
                  if (!layer.visible) {
                    onLayerToggleVisibility(layer.id);
                  }
                });
              }}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Tümünü Göster
            </button>
            <button
              onClick={() => {
                // Tüm katmanları gizle
                layers.forEach(layer => {
                  if (layer.visible) {
                    onLayerToggleVisibility(layer.id);
                  }
                });
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Tümünü Gizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayersPanel;
