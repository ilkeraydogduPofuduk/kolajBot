import React from 'react';
import {
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Copy, Trash2, RotateCw, FlipHorizontal, FlipVertical,
  Lock, Unlock, Eye, EyeOff, ZoomIn, ZoomOut,
  Layers, BringToFront, SendToBack
} from 'lucide-react';

interface ToolbarActionsProps {
  canvas: any;
  selectedObject: any;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onCopy: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

const ToolbarActions: React.FC<ToolbarActionsProps> = ({
  canvas,
  selectedObject,
  zoom,
  onZoomChange,
  onCopy,
  onDelete,
  onBringToFront,
  onSendToBack
}) => {
  const alignObject = (alignment: string) => {
    if (!selectedObject || !canvas) return;

    switch (alignment) {
      case 'left':
        selectedObject.set('left', 0);
        break;
      case 'center':
        selectedObject.set('left', (canvas.width - selectedObject.width * selectedObject.scaleX) / 2);
        break;
      case 'right':
        selectedObject.set('left', canvas.width - selectedObject.width * selectedObject.scaleX);
        break;
      case 'top':
        selectedObject.set('top', 0);
        break;
      case 'middle':
        selectedObject.set('top', (canvas.height - selectedObject.height * selectedObject.scaleY) / 2);
        break;
      case 'bottom':
        selectedObject.set('top', canvas.height - selectedObject.height * selectedObject.scaleY);
        break;
    }

    selectedObject.setCoords();
    canvas.renderAll();
  };

  const rotateObject = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('angle', (selectedObject.angle || 0) + 90);
    canvas.renderAll();
  };

  const flipHorizontal = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    canvas.renderAll();
  };

  const flipVertical = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    canvas.renderAll();
  };

  const toggleLock = () => {
    if (!selectedObject || !canvas) return;
    const isLocked = selectedObject.lockMovementX;
    selectedObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      lockRotation: !isLocked,
      selectable: isLocked
    });
    canvas.renderAll();
  };

  const toggleVisibility = () => {
    if (!selectedObject || !canvas) return;
    selectedObject.set('visible', !selectedObject.visible);
    canvas.renderAll();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => alignObject('left')}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Sola Hizala"
          disabled={!selectedObject}
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => alignObject('center')}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Ortala (Yatay)"
          disabled={!selectedObject}
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => alignObject('right')}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Sağa Hizala"
          disabled={!selectedObject}
        >
          <AlignRight className="w-4 h-4" />
        </button>
      </div>

      {/* Transform */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={rotateObject}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="90° Döndür"
          disabled={!selectedObject}
        >
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={flipHorizontal}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Yatay Çevir"
          disabled={!selectedObject}
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>
        <button
          onClick={flipVertical}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Dikey Çevir"
          disabled={!selectedObject}
        >
          <FlipVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={onCopy}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Kopyala"
          disabled={!selectedObject}
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-50 text-red-600 rounded transition-colors"
          title="Sil"
          disabled={!selectedObject}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Order */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={onBringToFront}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Öne Getir"
          disabled={!selectedObject}
        >
          <BringToFront className="w-4 h-4" />
        </button>
        <button
          onClick={onSendToBack}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Arkaya Gönder"
          disabled={!selectedObject}
        >
          <SendToBack className="w-4 h-4" />
        </button>
      </div>

      {/* Lock & Visibility */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={toggleLock}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title={selectedObject?.lockMovementX ? "Kilidi Aç" : "Kilitle"}
          disabled={!selectedObject}
        >
          {selectedObject?.lockMovementX ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={toggleVisibility}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title={selectedObject?.visible === false ? "Göster" : "Gizle"}
          disabled={!selectedObject}
        >
          {selectedObject?.visible === false ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Zoom */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Uzaklaştır"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="Yakınlaştır"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ToolbarActions;

