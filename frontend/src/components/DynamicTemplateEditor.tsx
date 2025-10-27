/**
 * Dynamic Template Editor Component
 * OCR sonrası otomatik oluşturulan şablonları düzenleme
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, Download, RefreshCw, Eye, Settings, Palette, 
  Type, Image as ImageIcon, Square, Circle, Layers,
  Undo, Redo, ZoomIn, ZoomOut, Grid, Ruler
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Canvas, Rect, Textbox, Image as FabricImage } from 'fabric';
import { dynamicTemplatesAPI, TemplateResponse, TemplateAnalysisResponse } from '../api/dynamicTemplates';
import { configManager } from '../core/config';
import { advancedLogger, LogCategory } from '../core/advancedLogging';

interface Product {
  id: number;
  code: string;
  name: string;
  color: string;
  product_type?: string;
  brand?: {
    id: number;
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

interface DynamicTemplateEditorProps {
  product: Product;
  onClose?: () => void;
  onSave?: (template: TemplateResponse) => void;
  onExport?: (templateData: any) => void;
}

const DynamicTemplateEditor: React.FC<DynamicTemplateEditorProps> = ({
  product,
  onClose,
  onSave,
  onExport
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = React.useRef<Canvas | null>(null);

  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TemplateAnalysisResponse | null>(null);
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff'
      });

      fabricCanvasRef.current = canvas;

      // Canvas event listeners
      canvas.on('selection:created', (e) => {
        setSelectedObject(e.selected?.[0]);
        setShowProperties(true);
      });

      canvas.on('selection:updated', (e) => {
        setSelectedObject(e.selected?.[0]);
      });

      canvas.on('selection:cleared', () => {
        setSelectedObject(null);
        setShowProperties(false);
      });

      // Analyze product on mount
      analyzeProduct();
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  // Analyze product for template
  const analyzeProduct = useCallback(async () => {
    if (!product.id) return;

    setIsAnalyzing(true);
    try {
      const analysisResult = await dynamicTemplatesAPI.analyzeProduct(product.id);
      setAnalysis(analysisResult);
      
      advancedLogger.info(LogCategory.TEMPLATE, 'Product analyzed', {
        productCode: product.code,
        suggestedCategory: analysisResult.suggested_category,
        confidenceScore: analysisResult.confidence_score
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Product analysis error', { 
        error: (error as Error).message 
      });
      toast.error('Ürün analizi sırasında hata oluştu');
    } finally {
      setIsAnalyzing(false);
    }
  }, [product.id, product.code]);

  // Create template from product
  const createTemplate = useCallback(async () => {
    if (!product.brand?.id) {
      toast.error('Marka bilgisi bulunamadı');
      return;
    }

    setIsLoading(true);
    try {
      const templateResult = await dynamicTemplatesAPI.createFromProduct({
        product_id: product.id,
        brand_id: product.brand.id,
        category: analysis?.suggested_category
      });

      setTemplate(templateResult);
      loadTemplateToCanvas(templateResult.template_data);
      
      toast.success('Şablon başarıyla oluşturuldu');
      
      advancedLogger.info(LogCategory.TEMPLATE, 'Template created', {
        templateId: templateResult.id,
        productCode: product.code
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Template creation error', { 
        error: (error as Error).message 
      });
      toast.error('Şablon oluşturulurken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [product.id, product.brand?.id, product.code, analysis]);

  // Load template data to canvas
  const loadTemplateToCanvas = useCallback((templateData: any) => {
    if (!fabricCanvasRef.current || !templateData) return;

    const canvas = fabricCanvasRef.current;
    
    // Clear canvas
    canvas.clear();
    
    // Set background
    if (templateData.background) {
      canvas.backgroundColor = templateData.background.color;
    }
    
    // Load objects
    if (templateData.objects && Array.isArray(templateData.objects)) {
      templateData.objects.forEach((objData: any) => {
        let fabricObj: any = null;
        
        switch (objData.type) {
          case 'textbox':
            fabricObj = new Textbox(objData.text, {
              left: objData.left,
              top: objData.top,
              width: objData.width,
              height: objData.height,
              fontSize: objData.fontSize,
              fontFamily: objData.fontFamily,
              fill: objData.fill,
              textAlign: objData.textAlign,
              fontWeight: objData.fontWeight,
              fontStyle: objData.fontStyle
            });
            break;
            
          case 'rect':
            fabricObj = new Rect({
              left: objData.left,
              top: objData.top,
              width: objData.width,
              height: objData.height,
              fill: objData.fill,
              stroke: objData.stroke,
              strokeWidth: objData.strokeWidth,
              strokeDashArray: objData.strokeDashArray
            });
            break;
            
          case 'image':
            if (objData.src) {
              FabricImage.fromURL(objData.src).then((img: any) => {
                if (img) {
                  img.set({
                    left: objData.left,
                    top: objData.top,
                    scaleX: objData.scaleX || 1,
                    scaleY: objData.scaleY || 1
                  });
                  canvas.add(img);
                  canvas.renderAll();
                }
              });
              return; // Skip adding to canvas here
            }
            break;
        }
        
        if (fabricObj) {
          canvas.add(fabricObj);
        }
      });
    }
    
    canvas.renderAll();
  }, []);

  // Save template
  const saveTemplate = useCallback(async () => {
    if (!fabricCanvasRef.current || !template) return;

    setIsLoading(true);
    try {
      const canvasData = fabricCanvasRef.current.toJSON();
      
      const updatedTemplate = await dynamicTemplatesAPI.updateFromProduct({
        template_id: template.id,
        product_id: product.id,
        brand_id: product.brand?.id || 1
      });

      setTemplate(updatedTemplate);
      onSave?.(updatedTemplate);
      
      toast.success('Şablon başarıyla kaydedildi');
      
      advancedLogger.info(LogCategory.TEMPLATE, 'Template saved', {
        templateId: template.id,
        productCode: product.code
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Template save error', { 
        error: (error as Error).message 
      });
      toast.error('Şablon kaydedilirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [template, product.id, product.brand?.id, product.code, onSave]);

  // Export template
  const exportTemplate = useCallback(async () => {
    if (!template) return;

    try {
      const exportData = await dynamicTemplatesAPI.exportForTelegram(template.id);
      onExport?.(exportData);
      
      toast.success('Şablon Telegram için hazırlandı');
      
      advancedLogger.info(LogCategory.TEMPLATE, 'Template exported', {
        templateId: template.id,
        productCode: product.code
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Template export error', { 
        error: (error as Error).message 
      });
      toast.error('Şablon dışa aktarılırken hata oluştu');
    }
  }, [template, product.code, onExport]);

  // Add product image to canvas
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
          fabricCanvasRef.current.renderAll();
        }
      });
    } catch (error) {
      advancedLogger.error(LogCategory.TEMPLATE, 'Product image add error', { 
        error: (error as Error).message 
      });
      toast.error('Ürün görseli eklenirken hata oluştu');
    }
  }, [product.images]);

  // Canvas tools
  const addText = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const textbox = new Textbox('Yeni Metin', {
      left: 400,
      top: 300,
      width: 200,
      height: 50,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'center'
    });

    fabricCanvasRef.current.add(textbox);
    fabricCanvasRef.current.renderAll();
  }, []);

  const addRectangle = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const rect = new Rect({
      left: 300,
      top: 250,
      width: 200,
      height: 100,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2
    });

    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.renderAll();
  }, []);

  const deleteSelected = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const activeObjects = fabricCanvasRef.current.getActiveObjects();
    if (activeObjects.length > 0) {
      fabricCanvasRef.current.remove(...activeObjects);
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.min(zoom * 1.1, 3);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const newZoom = Math.max(zoom / 1.1, 0.1);
    setZoom(newZoom);
    fabricCanvasRef.current.setZoom(newZoom);
  }, [zoom]);

  const toggleGrid = useCallback(() => {
    setShowGrid(!showGrid);
    if (fabricCanvasRef.current) {
      // Grid toggle functionality - Fabric.js doesn't have built-in showGrid
      fabricCanvasRef.current.renderAll();
    }
  }, [showGrid]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Dinamik Şablon Editörü</h2>
            {analysis && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Kategori:</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                  {analysis.suggested_category}
                </span>
                <span className="text-sm text-gray-600">
                  Güven: {Math.round(analysis.confidence_score * 100)}%
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={analyzeProduct}
              disabled={isAnalyzing}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={createTemplate}
              disabled={isLoading || !analysis}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Şablon Oluştur
            </button>
            
            <button
              onClick={saveTemplate}
              disabled={isLoading || !template}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
            </button>
            
            <button
              onClick={exportTemplate}
              disabled={!template}
              className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Kapat
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center space-x-2 p-3 border-b bg-gray-50">
          <button
            onClick={addText}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Metin Ekle"
          >
            <Type className="w-4 h-4" />
          </button>
          
          <button
            onClick={addRectangle}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Dikdörtgen Ekle"
          >
            <Square className="w-4 h-4" />
          </button>
          
          <button
            onClick={addProductImage}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Ürün Görseli Ekle"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <button
            onClick={deleteSelected}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Seçili Öğeyi Sil"
          >
            <Layers className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-300" />
          
          <button
            onClick={zoomIn}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Yakınlaştır"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={zoomOut}
            className="px-3 py-2 bg-white border rounded hover:bg-gray-50"
            title="Uzaklaştır"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <button
            onClick={toggleGrid}
            className={`px-3 py-2 border rounded hover:bg-gray-50 ${
              showGrid ? 'bg-blue-100 text-blue-800' : 'bg-white'
            }`}
            title="Grid Göster/Gizle"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                className="block"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          </div>

          {/* Properties Panel */}
          {showProperties && selectedObject && (
            <div className="w-80 border-l bg-gray-50 p-4">
              <h3 className="text-lg font-semibold mb-4">Özellikler</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    X Pozisyonu
                  </label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.left || 0)}
                    onChange={(e) => {
                      selectedObject.set('left', parseInt(e.target.value));
                      fabricCanvasRef.current?.renderAll();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Y Pozisyonu
                  </label>
                  <input
                    type="number"
                    value={Math.round(selectedObject.top || 0)}
                    onChange={(e) => {
                      selectedObject.set('top', parseInt(e.target.value));
                      fabricCanvasRef.current?.renderAll();
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                {selectedObject.type === 'textbox' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metin
                      </label>
                      <input
                        type="text"
                        value={selectedObject.text || ''}
                        onChange={(e) => {
                          selectedObject.set('text', e.target.value);
                          fabricCanvasRef.current?.renderAll();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Font Boyutu
                      </label>
                      <input
                        type="number"
                        value={selectedObject.fontSize || 24}
                        onChange={(e) => {
                          selectedObject.set('fontSize', parseInt(e.target.value));
                          fabricCanvasRef.current?.renderAll();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Metin Rengi
                      </label>
                      <input
                        type="color"
                        value={selectedObject.fill || '#000000'}
                        onChange={(e) => {
                          selectedObject.set('fill', e.target.value);
                          fabricCanvasRef.current?.renderAll();
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">İşlem yapılıyor...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicTemplateEditor;
