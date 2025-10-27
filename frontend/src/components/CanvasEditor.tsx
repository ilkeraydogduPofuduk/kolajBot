import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, Rect, Textbox, Image as FabricImage, Circle as FabricCircle, Line } from 'fabric';
import { 
  X, Save, Download, Type, Square, Circle, Image as ImageIcon, 
  Trash2, ChevronUp, ChevronDown, Sparkles, Settings, Palette, Plus,
  Undo, Redo
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { templatesAPI } from '../api/templates';
import { getImageURL } from '../config/api';

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
  onClose?: () => void;
  onSave?: (templateData?: any) => void;
  onExportPNG?: (imageData: string) => void;
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ product, onClose, onSave, onExportPNG }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [showProperties, setShowProperties] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#fdf6e9');
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Save state to history
  const saveToHistory = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    
    const state = fabricCanvasRef.current.toJSON();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history to 20 states
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex]);

  // Canvas initialization
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log('CanvasEditor: Initializing canvas...');
    
    const canvas = new Canvas(canvasRef.current, {
      width: 1080,
      height: 1350,
      backgroundColor: backgroundColor,
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    console.log('CanvasEditor: Canvas initialized successfully');

    // Object selection events
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0]);
      setShowProperties(true);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0]);
      setShowProperties(true);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setShowProperties(false);
    });

    // Save to history on object changes
    canvas.on('object:added', saveToHistory);
    canvas.on('object:removed', saveToHistory);
    canvas.on('object:modified', saveToHistory);

    return () => {
      canvas.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto create template when component mounts
  useEffect(() => {
    if (fabricCanvasRef.current && product) {
      // Call createAutoTemplate after it's defined
      setTimeout(() => {
        if (fabricCanvasRef.current && product) {
          createAutoTemplate();
        }
      }, 100);
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update background color when it changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.backgroundColor = backgroundColor;
      fabricCanvasRef.current.renderAll();
    }
  }, [backgroundColor]);

  // Auto template creation function - Modern and professional
  const createAutoTemplate = useCallback(() => {
    if (!fabricCanvasRef.current || !product) {
      console.log('CanvasEditor: Cannot create template - canvas or product missing');
      return;
    }

    console.log('CanvasEditor: Creating auto template for product:', product.code);
    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Set background
    canvas.backgroundColor = backgroundColor;

    // 1. Brand Title (Top) - Modern style
    const brandText = new Textbox(product.brand?.name || 'DİZAYN BRANDS', {
      left: 540, // Center
      top: 40,
      fontSize: 42,
      fontFamily: 'Playfair Display',
      fontWeight: 'bold',
      fill: '#1a1a1a',
      textAlign: 'center',
      width: 980,
      selectable: true,
      editable: true,
    });
    canvas.add(brandText);

    // Get product images
    const productImages = (product.images || []).filter(img => img.image_type === 'photo');
    
    if (productImages.length >= 1) {
      const mainImage = productImages[0];
      
      // Main Image (Center - Large)
      const mainImageUrl = getImageURL(mainImage.file_path);
      console.log('Loading main image:', mainImageUrl);
      
      FabricImage.fromURL(mainImageUrl, { crossOrigin: 'anonymous' })
        .then((img) => {
          console.log('Main image loaded successfully');
          img.set({
            left: 290, // Center horizontally
            top: 120,
            width: 500,
            height: 750,
            selectable: true,
            hasControls: true,
            borderColor: '#e5e7eb',
            borderWidth: 2,
            rx: 15,
            ry: 15,
          });
          canvas.add(img);
          canvas.renderAll();
        })
        .catch((error) => {
          console.error('Ana görsel yüklenirken hata:', error);
          toast.error('Ana görsel yüklenemedi: ' + error.message);
        });

      // Add second image if available
      if (productImages.length >= 2) {
        const secondImage = productImages[1];
        const secondImageUrl = getImageURL(secondImage.file_path);
        console.log('Loading second image:', secondImageUrl);
        
        FabricImage.fromURL(secondImageUrl, { crossOrigin: 'anonymous' })
          .then((img) => {
            console.log('Second image loaded successfully');
            img.set({
              left: 50,
              top: 200,
              width: 200,
              height: 300,
              selectable: true,
              hasControls: true,
              borderColor: '#e5e7eb',
              borderWidth: 2,
              rx: 10,
              ry: 10,
            });
            canvas.add(img);
            canvas.renderAll();
          })
          .catch((error) => {
            console.error('İkinci görsel yüklenirken hata:', error);
          });
      }

      // Add third image if available
      if (productImages.length >= 3) {
        const thirdImage = productImages[2];
        const thirdImageUrl = getImageURL(thirdImage.file_path);
        console.log('Loading third image:', thirdImageUrl);
        
        FabricImage.fromURL(thirdImageUrl, { crossOrigin: 'anonymous' })
          .then((img) => {
            console.log('Third image loaded successfully');
            img.set({
              left: 830,
              top: 200,
              width: 200,
              height: 300,
              selectable: true,
              hasControls: true,
              borderColor: '#e5e7eb',
              borderWidth: 2,
              rx: 10,
              ry: 10,
            });
            canvas.add(img);
            canvas.renderAll();
          })
          .catch((error) => {
            console.error('Üçüncü görsel yüklenirken hata:', error);
          });
      }
    }

    // Product Description (Bottom Center)
    const productDescription = `${product.product_type || 'DRESS'}\n${product.code} • ${product.color}\nBeden: ${product.size_range || '36-42'}`;
    const descriptionText = new Textbox(productDescription, {
      left: 540,
      top: 950,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fill: '#374151',
      textAlign: 'center',
      width: 800,
      selectable: true,
      editable: true,
      lineHeight: 1.4
    });
    canvas.add(descriptionText);

    // Price Box (Bottom Right) - Modern style
    const priceBox = new Rect({
      left: 850,
      top: 1100,
      width: 180,
      height: 60,
      fill: '#1f2937',
      rx: 30,
      ry: 30,
      selectable: true,
      hasControls: true,
    });
    canvas.add(priceBox);

    const priceText = new Textbox(`${product.currency || '₺'}${product.price || 0}`, {
      left: 940,
      top: 1115,
      fontSize: 28,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      width: 100,
      selectable: true,
      editable: true,
    });
    canvas.add(priceText);

    // Add decorative elements
    const decorativeLine = new Line([50, 920, 1030, 920], {
      stroke: '#e5e7eb',
      strokeWidth: 2,
      selectable: false,
      evented: false
    });
    canvas.add(decorativeLine);

    canvas.renderAll();
    toast.success('Otomatik şablon oluşturuldu! Düzenleyebilirsiniz.');
  }, [product, backgroundColor]);

  // Undo function
  const undo = () => {
    if (historyIndex > 0 && fabricCanvasRef.current) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  // Redo function
  const redo = () => {
    if (historyIndex < history.length - 1 && fabricCanvasRef.current) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      fabricCanvasRef.current.loadFromJSON(history[newIndex], () => {
        fabricCanvasRef.current?.renderAll();
      });
    }
  };

  // Add text element
  const addText = () => {
    if (!fabricCanvasRef.current) return;
    
    const text = new Textbox('Yeni Metin', {
      left: 100,
      top: 100,
      fontSize: fontSize,
      fontFamily: fontFamily,
      fill: textColor,
      selectable: true,
      editable: true,
    });
    
    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  // Add rectangle
  const addRectangle = () => {
    if (!fabricCanvasRef.current) return;
    
    const rect = new Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: '#ff0000',
      selectable: true,
      hasControls: true,
    });
    
    fabricCanvasRef.current.add(rect);
    fabricCanvasRef.current.setActiveObject(rect);
    fabricCanvasRef.current.renderAll();
  };

  // Add circle
  const addCircle = () => {
    if (!fabricCanvasRef.current) return;
    
    const circle = new FabricCircle({
      left: 100,
      top: 100,
      radius: 50,
      fill: '#00ff00',
      selectable: true,
      hasControls: true,
    });
    
    fabricCanvasRef.current.add(circle);
    fabricCanvasRef.current.setActiveObject(circle);
    fabricCanvasRef.current.renderAll();
  };

  // Delete selected object
  const deleteSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    fabricCanvasRef.current.remove(selectedObject);
    fabricCanvasRef.current.renderAll();
    setSelectedObject(null);
    setShowProperties(false);
  };

  // Bring to front
  const bringToFront = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    fabricCanvasRef.current.bringObjectToFront(selectedObject);
    fabricCanvasRef.current.renderAll();
  };

  // Send to back
  const sendToBack = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    fabricCanvasRef.current.sendObjectToBack(selectedObject);
    fabricCanvasRef.current.renderAll();
  };

  // Update object property
  const updateObjectProperty = (property: string, value: any) => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    
    selectedObject.set(property, value);
    fabricCanvasRef.current.renderAll();
  };

  // Save template
  const saveTemplate = async () => {
    if (!fabricCanvasRef.current || !product) return;
    
    try {
      const templateData = fabricCanvasRef.current.toJSON();
      
      if (onSave) {
        onSave(templateData);
      } else {
        // Fallback: direct save
        const templateName = prompt('Şablon adını girin:', `${product.brand?.name || 'DİZAYN BRANDS'} - ${product.code} Şablonu`);
        
        if (!templateName) return;
        
        await templatesAPI.createTemplate({
          name: templateName,
          description: `${product.brand?.name || 'DİZAYN BRANDS'} markası için ${product.code} ürünü şablonu`,
          product_id: product.id,
          brand_id: product.brand_id || 1,
          template_data: templateData,
          is_active: true,
        });
        
        toast.success('Şablon başarıyla kaydedildi!');
      }
    } catch (error) {
      console.error('Şablon kaydedilirken hata:', error);
      toast.error('Şablon kaydedilemedi');
    }
  };

  // Export as PNG
  const exportPNG = () => {
    if (!fabricCanvasRef.current) return;
    
    const dataURL = fabricCanvasRef.current.toDataURL({
      format: 'png',
      multiplier: 2, // High DPI
    });
    
    if (onExportPNG) {
      onExportPNG(dataURL);
    }
    
    // Download the image
    const link = document.createElement('a');
    link.download = `${product.code}-template.png`;
    link.href = dataURL;
    link.click();
    
    toast.success('PNG dosyası indirildi!');
  };


  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Şablon Editörü</h1>
            {product && (
              <p className="text-sm text-gray-600 mt-1">
                {product.brand?.name || 'DİZAYN BRANDS'} - {product.code} - {product.color}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Geri Al"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="İleri Al"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={createAutoTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Otomatik Şablon</span>
            </button>
            <button
              onClick={saveTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">Kaydet</span>
            </button>
            <button
              onClick={exportPNG}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">PNG İndir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Tools */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          {/* Tools Header */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Araçlar</h3>
          </div>

          {/* Tools Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Add Elements */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Öğe Ekle
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={addText}
                  className="flex flex-col items-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Type className="w-6 h-6 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Metin</span>
                </button>
                <button
                  onClick={addRectangle}
                  className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Square className="w-6 h-6 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Dikdörtgen</span>
                </button>
                <button
                  onClick={addCircle}
                  className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <Circle className="w-6 h-6 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Daire</span>
                </button>
                <button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <ImageIcon className="w-6 h-6 text-orange-600" />
                  <span className="text-sm font-medium text-orange-700">Görsel</span>
                </button>
              </div>
            </div>
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && fabricCanvasRef.current) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    FabricImage.fromURL(event.target?.result as string, { crossOrigin: 'anonymous' })
                      .then((img) => {
                        img.set({
                          left: 100,
                          top: 100,
                          selectable: true,
                          hasControls: true,
                        });
                        fabricCanvasRef.current?.add(img);
                        fabricCanvasRef.current?.setActiveObject(img);
                        fabricCanvasRef.current?.renderAll();
                      });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            {/* Background Color */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Arka Plan Rengi
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { color: '#fdf6e9', name: 'Krem' },
                  { color: '#ffffff', name: 'Beyaz' },
                  { color: '#f8f9fa', name: 'Açık Gri' },
                  { color: '#e9ecef', name: 'Gri' },
                  { color: '#dee2e6', name: 'Koyu Gri' }
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => setBackgroundColor(item.color)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                      backgroundColor === item.color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            {/* Text Properties */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Metin Özellikleri
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Font Boyutu</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-700 w-12">{fontSize}px</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Font Ailesi</label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Arial">Arial</option>
                    <option value="Playfair Display">Playfair Display</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Metin Rengi</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                İşlemler
              </h4>
              <div className="space-y-3">
                <button
                  onClick={deleteSelected}
                  className="w-full flex items-center gap-3 p-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Seçili Öğeyi Sil</span>
                </button>
                <button
                  onClick={bringToFront}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <ChevronUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Öne Getir</span>
                </button>
                <button
                  onClick={sendToBack}
                  className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-all duration-200 hover:scale-105"
                >
                  <ChevronDown className="w-5 h-5" />
                  <span className="text-sm font-medium">Arkaya Gönder</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Container */}
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-8">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-200">
              <div className="text-center mb-4">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  1080 × 1350px (Instagram Post)
                </span>
              </div>
              <canvas
                ref={canvasRef}
                className="border border-gray-300 rounded-xl shadow-lg"
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '100%',
                  display: 'block'
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        {showProperties && selectedObject && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Özellikler
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Position */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Konum</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={Math.round(selectedObject.left || 0)}
                    onChange={(e) => updateObjectProperty('left', Number(e.target.value))}
                    className="p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="X"
                  />
                  <input
                    type="number"
                    value={Math.round(selectedObject.top || 0)}
                    onChange={(e) => updateObjectProperty('top', Number(e.target.value))}
                    className="p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Y"
                  />
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Boyut</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={Math.round((selectedObject.width || 0) * (selectedObject.scaleX || 1))}
                    onChange={(e) => {
                      const newScaleX = Number(e.target.value) / (selectedObject.width || 1);
                      updateObjectProperty('scaleX', newScaleX);
                    }}
                    className="p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Genişlik"
                  />
                  <input
                    type="number"
                    value={Math.round((selectedObject.height || 0) * (selectedObject.scaleY || 1))}
                    onChange={(e) => {
                      const newScaleY = Number(e.target.value) / (selectedObject.height || 1);
                      updateObjectProperty('scaleY', newScaleY);
                    }}
                    className="p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Yükseklik"
                  />
                </div>
              </div>

              {/* Text Properties */}
              {selectedObject.type === 'textbox' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">Metin İçeriği</label>
                    <textarea
                      value={selectedObject.text || ''}
                      onChange={(e) => updateObjectProperty('text', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">Font Boyutu</label>
                    <input
                      type="number"
                      value={selectedObject.fontSize || 16}
                      onChange={(e) => updateObjectProperty('fontSize', Number(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">Metin Rengi</label>
                    <input
                      type="color"
                      value={selectedObject.fill || '#000000'}
                      onChange={(e) => updateObjectProperty('fill', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Fill Color */}
              {selectedObject.type !== 'textbox' && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="text-xs font-medium text-gray-600 block mb-2">Dolgu Rengi</label>
                  <input
                    type="color"
                    value={selectedObject.fill || '#000000'}
                    onChange={(e) => updateObjectProperty('fill', e.target.value)}
                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Opacity */}
              <div className="pt-4 border-t border-gray-200">
                <label className="text-xs font-medium text-gray-600 block mb-2">Şeffaflık</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={selectedObject.opacity || 1}
                    onChange={(e) => updateObjectProperty('opacity', Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12">{Math.round((selectedObject.opacity || 1) * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasEditor;