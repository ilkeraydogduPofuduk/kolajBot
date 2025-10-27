import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Canvas, Rect, Textbox, Image as FabricImage, Circle as FabricCircle, Line, Group, Path } from 'fabric';
import { 
  X, Save, Download, Type, Square, Circle, Image as ImageIcon, 
  Trash2, ChevronUp, ChevronDown, Sparkles, Settings, Palette, Plus,
  Undo, Redo, Layers, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Underline, Copy, Move, RotateCw, RotateCcw, FlipHorizontal,
  FlipVertical, Grid, Ruler, ZoomIn, ZoomOut, Maximize, Minimize
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { templatesAPI } from '../api/templates';
import { configManager } from '../core/config';
import { advancedLogger, LogCategory } from '../core/advancedLogging';

interface Product {
  id: number;
  code: string;
  name: string;
  color: string;
  product_type?: string;
  brand_id: number;
  size_range?: string;
  price?: number;
  currency?: string;
  brand?: {
    name: string;
  };
  images?: Array<{
    id: number;
    filename: string;
    file_path: string;
    image_type: string;
    is_cover_image: boolean;
  }>;
}

interface CanvasEditorProps {
  product: Product;
  templateId?: number;
  onClose?: () => void;
  onSave?: (templateData?: any) => void;
  onExportPNG?: (imageData: string) => void;
}

interface ToolbarState {
  selectedTool: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

interface HistoryState {
  states: any[];
  currentIndex: number;
}

const AdvancedCanvasEditor: React.FC<CanvasEditorProps> = ({ 
  product, 
  templateId, 
  onClose, 
  onSave, 
  onExportPNG 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  
  // State management
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Toolbar state
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    selectedTool: 'select',
    fontSize: 24,
    fontFamily: 'Arial',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 2,
    opacity: 1,
    rotation: 0,
    scaleX: 1,
    scaleY: 1
  });
  
  // History management
  const [history, setHistory] = useState<HistoryState>({
    states: [],
    currentIndex: -1
  });
  
  // Template categories
  const templateCategories = useMemo(() => ({
    minimal: { bg: '#ffffff', text: '#000000', name: 'Minimal' },
    luxury: { bg: '#1a1a1a', text: '#d4af37', name: 'Luxury' },
    modern: { bg: '#f8fafc', text: '#1f2937', name: 'Modern' },
    vintage: { bg: '#fdf6e9', text: '#8b4513', name: 'Vintage' },
    corporate: { bg: '#ffffff', text: '#2563eb', name: 'Corporate' }
  }), []);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true
    });

    fabricCanvasRef.current = canvas;

    // Event listeners
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);

    // Load template if provided
    if (templateId) {
      loadTemplate(templateId);
    } else {
      createDefaultTemplate();
    }

    // Save initial state
    saveState();

    return () => {
      canvas.dispose();
    };
  }, [templateId]);

  // Event handlers
  const handleSelection = useCallback((e: any) => {
    const activeObject = e.selected?.[0];
    setSelectedObject(activeObject);
    if (activeObject) {
      updateToolbarFromObject(activeObject);
    }
  }, []);

  const handleSelectionCleared = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const handleObjectModified = useCallback(() => {
    saveState();
  }, []);

  const handleObjectAdded = useCallback(() => {
    saveState();
  }, []);

  const handleObjectRemoved = useCallback(() => {
    saveState();
  }, []);

  // State management
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvasState = JSON.stringify(fabricCanvasRef.current.toJSON());
    setHistory(prev => {
      const newStates = prev.states.slice(0, prev.currentIndex + 1);
      newStates.push(canvasState);
      return {
        states: newStates,
        currentIndex: newStates.length - 1
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      const state = history.states[newIndex];
      fabricCanvasRef.current?.loadFromJSON(state, () => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistory(prev => ({ ...prev, currentIndex: newIndex }));
    }
  }, [history]);

  const redo = useCallback(() => {
    if (history.currentIndex < history.states.length - 1) {
      const newIndex = history.currentIndex + 1;
      const state = history.states[newIndex];
      fabricCanvasRef.current?.loadFromJSON(state, () => {
        fabricCanvasRef.current?.renderAll();
      });
      setHistory(prev => ({ ...prev, currentIndex: newIndex }));
    }
  }, [history]);

  // Toolbar functions
  const updateToolbarFromObject = useCallback((obj: any) => {
    if (obj.type === 'textbox' || obj.type === 'text') {
      setToolbarState(prev => ({
        ...prev,
        fontSize: obj.fontSize || 24,
        fontFamily: obj.fontFamily || 'Arial',
        textColor: obj.fill || '#000000',
        opacity: obj.opacity || 1,
        rotation: obj.angle || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1
      }));
    } else {
      setToolbarState(prev => ({
        ...prev,
        backgroundColor: obj.fill || '#ffffff',
        strokeColor: obj.stroke || '#000000',
        strokeWidth: obj.strokeWidth || 2,
        opacity: obj.opacity || 1,
        rotation: obj.angle || 0,
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1
      }));
    }
  }, []);

  const applyToolbarToObject = useCallback((obj: any) => {
    if (obj.type === 'textbox' || obj.type === 'text') {
      obj.set({
        fontSize: toolbarState.fontSize,
        fontFamily: toolbarState.fontFamily,
        fill: toolbarState.textColor,
        opacity: toolbarState.opacity,
        angle: toolbarState.rotation,
        scaleX: toolbarState.scaleX,
        scaleY: toolbarState.scaleY
      });
    } else {
      obj.set({
        fill: toolbarState.backgroundColor,
        stroke: toolbarState.strokeColor,
        strokeWidth: toolbarState.strokeWidth,
        opacity: toolbarState.opacity,
        angle: toolbarState.rotation,
        scaleX: toolbarState.scaleX,
        scaleY: toolbarState.scaleY
      });
    }
    fabricCanvasRef.current?.renderAll();
    saveState();
  }, [toolbarState, saveState]);

  // Template functions
  const createDefaultTemplate = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Brand name
    const brandText = new Textbox(product.brand?.name || 'DIZAYN BRANDS', {
      left: 400,
      top: 80,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#1f2937',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    // Product code
    const codeText = new Textbox(`Ürün Kodu: ${product.code}`, {
      left: 400,
      top: 200,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#3b82f6',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    // Product name
    const nameText = new Textbox(product.name || product.code, {
      left: 400,
      top: 250,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#1f2937',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    // Product color
    const colorText = new Textbox(`Renk: ${product.color}`, {
      left: 400,
      top: 300,
      fontSize: 18,
      fontFamily: 'Arial',
      fill: '#6b7280',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    // Add elements to canvas
    canvas.add(brandText, codeText, nameText, colorText);
    canvas.renderAll();
    saveState();

    advancedLogger.info(LogCategory.TEMPLATE, 'Default template created', { productCode: product.code });
  }, [product, saveState]);

  const loadTemplate = useCallback(async (id: number) => {
    try {
      setIsLoading(true);
      const template = await templatesAPI.getTemplate(id);
      
      if (template.template_data) {
        const canvasData = template.template_data.canvas || template.template_data;
        fabricCanvasRef.current?.loadFromJSON(canvasData, () => {
          fabricCanvasRef.current?.renderAll();
          saveState();
        });
      }
      
      advancedLogger.info(LogCategory.TEMPLATE, 'Template loaded', { templateId: id });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Template load error', { error: (error as Error).message });
      toast.error('Şablon yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [saveState]);

  const applyTemplateCategory = useCallback((category: string) => {
    if (!fabricCanvasRef.current) return;

    const categoryConfig = templateCategories[category as keyof typeof templateCategories];
    if (!categoryConfig) return;

    // Update canvas background
    fabricCanvasRef.current.backgroundColor = categoryConfig.bg;
    fabricCanvasRef.current.renderAll();

    // Update text colors
    const objects = fabricCanvasRef.current.getObjects();
    objects.forEach(obj => {
      if (obj.type === 'textbox' || obj.type === 'text') {
        obj.set('fill', categoryConfig.text);
      }
    });

    fabricCanvasRef.current.renderAll();
    saveState();

    advancedLogger.info(LogCategory.TEMPLATE, 'Template category applied', { category });
    toast.success(`${categoryConfig.name} şablon uygulandı`);
  }, [templateCategories, saveState]);

  // Tool functions
  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const text = new Textbox('Yeni Metin', {
      left: 400,
      top: 300,
      fontSize: toolbarState.fontSize,
      fontFamily: toolbarState.fontFamily,
      fill: toolbarState.textColor,
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [toolbarState, saveState]);

  const addRectangle = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const rect = new Rect({
      left: 300,
      top: 200,
      width: 200,
      height: 100,
      fill: toolbarState.backgroundColor,
      stroke: toolbarState.strokeColor,
      strokeWidth: toolbarState.strokeWidth
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [toolbarState, saveState]);

  const addCircle = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const circle = new FabricCircle({
      left: 400,
      top: 200,
      radius: 50,
      fill: toolbarState.backgroundColor,
      stroke: toolbarState.strokeColor,
      strokeWidth: toolbarState.strokeWidth
    });

    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [toolbarState, saveState]);

  const addProductImage = useCallback(async () => {
    if (!fabricCanvasRef.current || !product.images?.length) return;

    try {
      const config = configManager.getConfig();
      const imageUrl = `${config.app.backendUrl}/uploads/${product.images[0].file_path}`;
      
      FabricImage.fromURL(imageUrl).then((img: any) => {
        if (img && fabricCanvasRef.current) {
          img.set({
            left: 400,
            top: 350,
            scaleX: 0.5,
            scaleY: 0.5,
            originX: 'center',
            originY: 'center'
          });
          
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
          fabricCanvasRef.current.renderAll();
          saveState();
        }
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Product image add error', { error: (error as Error).message });
      toast.error('Ürün görseli eklenirken hata oluştu');
    }
  }, [product, saveState]);

  const deleteSelected = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;

    fabricCanvasRef.current.remove(selectedObject);
    fabricCanvasRef.current.renderAll();
    setSelectedObject(null);
    saveState();
  }, [selectedObject, saveState]);

  const duplicateSelected = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;

    selectedObject.clone((cloned: any) => {
      cloned.set({
        left: selectedObject.left + 20,
        top: selectedObject.top + 20
      });
      fabricCanvasRef.current?.add(cloned);
      fabricCanvasRef.current?.setActiveObject(cloned);
      fabricCanvasRef.current?.renderAll();
      saveState();
    });
  }, [selectedObject, saveState]);

  // Alignment functions
  const alignLeft = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('left', 50);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  const alignCenter = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('left', 400);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  const alignRight = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('left', 750);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  // Transform functions
  const rotateLeft = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('angle', (selectedObject.angle || 0) - 15);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  const rotateRight = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('angle', (selectedObject.angle || 0) + 15);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  const flipHorizontal = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('scaleX', -selectedObject.scaleX);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  const flipVertical = useCallback(() => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set('scaleY', -selectedObject.scaleY);
    fabricCanvasRef.current.renderAll();
    saveState();
  }, [selectedObject, saveState]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoom * 1.2, 3);
    setZoom(newZoom);
    fabricCanvasRef.current?.setZoom(newZoom);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoom / 1.2, 0.1);
    setZoom(newZoom);
    fabricCanvasRef.current?.setZoom(newZoom);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    fabricCanvasRef.current?.setZoom(1);
  }, []);

  // Save and export functions
  const saveTemplate = useCallback(async () => {
    if (!fabricCanvasRef.current) return;

    try {
      setIsLoading(true);
      const canvasData = fabricCanvasRef.current.toJSON();
      
      const templateData = {
        canvas: canvasData,
        product: product,
        exportedAt: new Date().toISOString()
      };

      if (templateId) {
        await templatesAPI.updateTemplate(templateId, { template_data: templateData });
        toast.success('Şablon güncellendi');
      } else {
        await templatesAPI.createTemplate({
          name: `${product.code} - Custom Template`,
          description: `Custom template for ${product.code}`,
          product_id: product.id,
          brand_id: product.brand_id || 1,
          template_data: templateData
        });
        toast.success('Şablon kaydedildi');
      }

      onSave?.(templateData);
      advancedLogger.info(LogCategory.TEMPLATE, 'Template saved', { productCode: product.code });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Template save error', { error: (error as Error).message });
      toast.error('Şablon kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, product, onSave]);

  const exportPNG = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });

    onExportPNG?.(dataURL);
    advancedLogger.info(LogCategory.TEMPLATE, 'Template exported as PNG', { productCode: product.code });
  }, [onExportPNG, product.code]);

  const exportJSON = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvasData = fabricCanvasRef.current.toJSON();
    const dataStr = JSON.stringify(canvasData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${product.code}_template.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    advancedLogger.info(LogCategory.TEMPLATE, 'Template exported as JSON', { productCode: product.code });
  }, [product.code]);

  // Render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Gelişmiş Canvas Editör</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-gray-50 border-r flex flex-col">
            {/* Template Categories */}
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-2">Şablon Kategorileri</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(templateCategories).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => applyTemplateCategory(key)}
                    className="p-2 text-xs rounded border hover:bg-gray-100"
                    style={{ backgroundColor: config.bg, color: config.text }}
                  >
                    {config.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="p-4 border-b">
              <h3 className="font-semibold mb-2">Araçlar</h3>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={addText}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Metin Ekle"
                >
                  <Type size={16} />
                </button>
                <button
                  onClick={addRectangle}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Dikdörtgen Ekle"
                >
                  <Square size={16} />
                </button>
                <button
                  onClick={addCircle}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Daire Ekle"
                >
                  <Circle size={16} />
                </button>
                <button
                  onClick={addProductImage}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Ürün Görseli Ekle"
                >
                  <ImageIcon size={16} />
                </button>
              </div>
            </div>

            {/* Properties */}
            {selectedObject && (
              <div className="p-4 border-b">
                <h3 className="font-semibold mb-2">Özellikler</h3>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-600">Font Boyutu</label>
                    <input
                      type="number"
                      value={toolbarState.fontSize}
                      onChange={(e) => setToolbarState(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="w-full p-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Font Ailesi</label>
                    <select
                      value={toolbarState.fontFamily}
                      onChange={(e) => setToolbarState(prev => ({ ...prev, fontFamily: e.target.value }))}
                      className="w-full p-1 border rounded text-sm"
                    >
                      <option value="Arial">Arial</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Metin Rengi</label>
                    <input
                      type="color"
                      value={toolbarState.textColor}
                      onChange={(e) => setToolbarState(prev => ({ ...prev, textColor: e.target.value }))}
                      className="w-full h-8 border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Şeffaflık</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={toolbarState.opacity}
                      onChange={(e) => setToolbarState(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                  <button
                    onClick={() => applyToolbarToObject(selectedObject)}
                    className="w-full p-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Uygula
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-4 mt-auto">
              <div className="space-y-2">
                <button
                  onClick={saveTemplate}
                  disabled={isLoading}
                  className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
                <button
                  onClick={exportPNG}
                  className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  PNG Olarak Dışa Aktar
                </button>
                <button
                  onClick={exportJSON}
                  className="w-full p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  JSON Olarak Dışa Aktar
                </button>
              </div>
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b bg-white">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={undo}
                  disabled={history.currentIndex <= 0}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Geri Al"
                >
                  <Undo size={16} />
                </button>
                <button
                  onClick={redo}
                  disabled={history.currentIndex >= history.states.length - 1}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="İleri Al"
                >
                  <Redo size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <button
                  onClick={zoomOut}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Uzaklaştır"
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={zoomIn}
                  className="p-2 border rounded hover:bg-gray-100"
                  title="Yakınlaştır"
                >
                  <ZoomIn size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <button
                  onClick={alignLeft}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Sola Hizala"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  onClick={alignCenter}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Ortala"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  onClick={alignRight}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Sağa Hizala"
                >
                  <AlignRight size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <button
                  onClick={rotateLeft}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Sola Döndür"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={rotateRight}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Sağa Döndür"
                >
                  <RotateCw size={16} />
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-2" />
                
                <button
                  onClick={duplicateSelected}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                  title="Kopyala"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={deleteSelected}
                  disabled={!selectedObject}
                  className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50 text-red-600"
                  title="Sil"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 p-4 bg-gray-100 overflow-auto">
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border shadow-lg bg-white"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCanvasEditor;
