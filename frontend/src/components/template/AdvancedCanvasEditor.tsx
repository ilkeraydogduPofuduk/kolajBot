import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as fabric from 'fabric';
import { 
  Type, 
  Image, 
  Square, 
  Circle, 
  Triangle, 
  Download, 
  Upload, 
  RotateCw, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Grid,
  Layers,
  Trash2,
  Copy,
  Undo,
  Redo,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

interface AdvancedCanvasEditorProps {
  width?: number;
  height?: number;
  onSave?: (canvasData: any) => void;
  onLoad?: (canvasData: any) => void;
  initialData?: any;
}

const AdvancedCanvasEditor: React.FC<AdvancedCanvasEditorProps> = ({
  width = 1080,
  height = 1920,
  onSave,
  onLoad,
  initialData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [layers, setLayers] = useState<fabric.Object[]>([]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Event listeners
    fabricCanvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    fabricCanvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    fabricCanvas.on('object:added', () => {
      saveToHistory();
      updateLayers();
    });

    fabricCanvas.on('object:removed', () => {
      saveToHistory();
      updateLayers();
    });

    fabricCanvas.on('object:modified', () => {
      saveToHistory();
      updateLayers();
    });

    setCanvas(fabricCanvas);

    // Load initial data if provided
    if (initialData) {
      fabricCanvas.loadFromJSON(initialData, () => {
        fabricCanvas.renderAll();
        updateLayers();
      });
    }

    return () => {
      fabricCanvas.dispose();
    };
  }, [width, height, initialData]);

  // Save to history for undo/redo
  const saveToHistory = useCallback(() => {
    if (!canvas) return;
    
    const canvasData = canvas.toJSON();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(canvasData);
    
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [canvas, history, historyIndex]);

  // Update layers list
  const updateLayers = useCallback(() => {
    if (!canvas) return;
    setLayers([...canvas.getObjects()].reverse());
  }, [canvas]);

  // Tool functions
  const addText = () => {
    if (!canvas) return;
    
    const text = new fabric.Textbox('Metin ekleyin', {
      left: 100,
      top: 100,
      fontSize: 24,
      fill: '#000000',
      fontFamily: 'Arial',
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addRectangle = () => {
    if (!canvas) return;
    
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const addCircle = () => {
    if (!canvas) return;
    
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: '#00ff00',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  const addTriangle = () => {
    if (!canvas) return;
    
    const triangle = new fabric.Triangle({
      left: 100,
      top: 100,
      width: 100,
      height: 100,
      fill: '#0000ff',
      stroke: '#000000',
      strokeWidth: 2,
    });
    
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
  };

  const addImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgElement = new window.Image();
      imgElement.onload = () => {
        const img = new fabric.Image(imgElement, {
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      };
      imgElement.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!canvas || !selectedObject) return;
    canvas.remove(selectedObject);
    canvas.renderAll();
  };

  const duplicateSelected = () => {
    if (!canvas || !selectedObject) return;
    
    selectedObject.clone().then((cloned: fabric.Object) => {
      cloned.set({
        left: (selectedObject.left || 0) + 20,
        top: (selectedObject.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  };

  const bringToFront = () => {
    if (!canvas || !selectedObject) return;
    canvas.bringObjectToFront(selectedObject);
    canvas.renderAll();
  };

  const sendToBack = () => {
    if (!canvas || !selectedObject) return;
    canvas.sendObjectToBack(selectedObject);
    canvas.renderAll();
  };

  const rotateLeft = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) - 15);
    canvas.renderAll();
  };

  const rotateRight = () => {
    if (!canvas || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) + 15);
    canvas.renderAll();
  };

  const zoomIn = () => {
    const newZoom = Math.min(zoom * 1.2, 5);
    setZoom(newZoom);
    if (canvas) {
      canvas.setZoom(newZoom);
    }
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    if (canvas) {
      canvas.setZoom(newZoom);
    }
  };

  const resetZoom = () => {
    setZoom(1);
    if (canvas) {
      canvas.setZoom(1);
    }
  };

  const toggleGrid = () => {
    setShowGrid(!showGrid);
    // Grid implementation would go here
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (canvas) {
        canvas.loadFromJSON(history[newIndex], () => {
          canvas.renderAll();
          updateLayers();
        });
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (canvas) {
        canvas.loadFromJSON(history[newIndex], () => {
          canvas.renderAll();
          updateLayers();
        });
      }
    }
  };

  const saveCanvas = () => {
    if (!canvas) return;
    const canvasData = canvas.toJSON();
    onSave?.(canvasData);
  };

  const loadCanvas = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (canvas) {
            canvas.loadFromJSON(data, () => {
              canvas.renderAll();
              updateLayers();
            });
          }
          onLoad?.(data);
        } catch (error) {
          console.error('Error loading canvas data:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const exportAsImage = () => {
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement('a');
    link.download = 'canvas-export.png';
    link.href = dataURL;
    link.click();
  };

  const clearCanvas = () => {
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    updateLayers();
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* File Operations */}
            <button
              onClick={saveCanvas}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Kaydet"
            >
              <Save className="w-5 h-5" />
            </button>
            <button
              onClick={loadCanvas}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Yükle"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={exportAsImage}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Görsel Olarak İndir"
            >
              <Download className="w-5 h-5" />
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="Geri Al"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="İleri Al"
            >
              <Redo className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Uzaklaştır"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Yakınlaştır"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Sıfırla
            </button>
            
            <div className="w-px h-6 bg-gray-300 mx-2" />
            
            {/* View Options */}
            <button
              onClick={toggleGrid}
              className={`p-2 rounded-lg transition-colors ${
                showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Kılavuz Çizgileri"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`p-2 rounded-lg transition-colors ${
                showLayers ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
              title="Katmanlar"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Tools Panel */}
        <div className="w-16 bg-white border-r border-gray-200 flex flex-col">
          {/* Drawing Tools */}
          <div className="p-2 space-y-1">
            <button
              onClick={addText}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Metin Ekle"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={addImage}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Görsel Ekle"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={addRectangle}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Dikdörtgen Ekle"
            >
              <Square className="w-5 h-5" />
            </button>
            <button
              onClick={addCircle}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Daire Ekle"
            >
              <Circle className="w-5 h-5" />
            </button>
            <button
              onClick={addTriangle}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Üçgen Ekle"
            >
              <Triangle className="w-5 h-5" />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-300 mx-2" />

          {/* Object Operations */}
          {selectedObject && (
            <div className="p-2 space-y-1">
              <button
                onClick={duplicateSelected}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Kopyala"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={deleteSelected}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                title="Sil"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={bringToFront}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Öne Getir"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={sendToBack}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Arkaya Gönder"
              >
                <EyeOff className="w-5 h-5" />
              </button>
              <button
                onClick={rotateLeft}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sola Döndür"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={rotateRight}
                className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Sağa Döndür"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 overflow-auto">
          <div className="bg-white shadow-lg">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right Properties Panel */}
        {selectedObject && (
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Özellikler</h3>
            
            {/* Position */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Pozisyon</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">X</label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.left || 0)}
                    onChange={(e) => {
                      selectedObject.set('left', parseInt(e.target.value));
                      canvas?.renderAll();
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Y</label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.top || 0)}
                    onChange={(e) => {
                      selectedObject.set('top', parseInt(e.target.value));
                      canvas?.renderAll();
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Boyut</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Genişlik</label>
                  <input
                    type="number"
                    value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                    onChange={(e) => {
                      const newScale = parseInt(e.target.value) / (selectedObject.width || 1);
                      selectedObject.set('scaleX', newScale);
                      canvas?.renderAll();
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Yükseklik</label>
                  <input
                    type="number"
                    value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                    onChange={(e) => {
                      const newScale = parseInt(e.target.value) / (selectedObject.height || 1);
                      selectedObject.set('scaleY', newScale);
                      canvas?.renderAll();
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>

            {/* Rotation */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Döndürme</label>
              <input
                type="number"
                value={Math.round(selectedObject.angle || 0)}
                onChange={(e) => {
                  selectedObject.set('angle', parseInt(e.target.value));
                  canvas?.renderAll();
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>

            {/* Opacity */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Şeffaflık</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedObject.opacity || 1}
                onChange={(e) => {
                  selectedObject.set('opacity', parseFloat(e.target.value));
                  canvas?.renderAll();
                }}
                className="w-full"
              />
              <span className="text-xs text-gray-600">
                {Math.round((selectedObject.opacity || 1) * 100)}%
              </span>
            </div>

            {/* Text specific properties */}
            {selectedObject.type === 'textbox' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Metin</label>
                <textarea
                  value={(selectedObject as fabric.Textbox).text || ''}
                  onChange={(e) => {
                    (selectedObject as fabric.Textbox).set('text', e.target.value);
                    canvas?.renderAll();
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  rows={3}
                />
                
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Font Boyutu</label>
                  <input
                    type="number"
                    value={(selectedObject as fabric.Textbox).fontSize || 24}
                    onChange={(e) => {
                      (selectedObject as fabric.Textbox).set('fontSize', parseInt(e.target.value));
                      canvas?.renderAll();
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  />
                </div>

                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Renk</label>
                  <input
                    type="color"
                    value={(selectedObject as fabric.Textbox).fill as string || '#000000'}
                    onChange={(e) => {
                      (selectedObject as fabric.Textbox).set('fill', e.target.value);
                      canvas?.renderAll();
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}

            {/* Shape specific properties */}
            {(selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'triangle') && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Dolgu Rengi</label>
                <input
                  type="color"
                  value={selectedObject.fill as string || '#000000'}
                  onChange={(e) => {
                    selectedObject.set('fill', e.target.value);
                    canvas?.renderAll();
                  }}
                  className="w-full h-8 border border-gray-300 rounded"
                />
                
                <div className="mt-2">
                  <label className="block text-sm font-medium mb-1">Kenar Rengi</label>
                  <input
                    type="color"
                    value={selectedObject.stroke as string || '#000000'}
                    onChange={(e) => {
                      selectedObject.set('stroke', e.target.value);
                      canvas?.renderAll();
                    }}
                    className="w-full h-8 border border-gray-300 rounded"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layers Panel */}
        {showLayers && (
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Katmanlar</h3>
            <div className="space-y-2">
              {layers.map((layer, index) => (
                <div
                  key={index}
                  className={`p-2 border rounded cursor-pointer transition-colors ${
                    selectedObject === layer ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    canvas?.setActiveObject(layer);
                    canvas?.renderAll();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {layer.type === 'textbox' ? 'Metin' : 
                       layer.type === 'image' ? 'Görsel' :
                       layer.type === 'rect' ? 'Dikdörtgen' :
                       layer.type === 'circle' ? 'Daire' :
                       layer.type === 'triangle' ? 'Üçgen' : 'Nesne'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        canvas?.remove(layer);
                        canvas?.renderAll();
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default AdvancedCanvasEditor;
