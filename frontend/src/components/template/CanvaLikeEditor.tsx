import React, { useState, useEffect, useRef, useCallback } from 'react';
// @ts-ignore - Fabric.js import
import * as fabric from 'fabric';
import toast from 'react-hot-toast';

// Import modular components
import Toolbar from './editor/Toolbar';
import PropertiesPanel from './editor/PropertiesPanel';
import LayersPanel from './editor/LayersPanel';
import Canvas from './editor/Canvas';
import AIModal from './editor/AIModal';
import PlaceholderSystem from './editor/PlaceholderSystem';
import TemplateCategories from './editor/TemplateCategories';
import BrandAssignment from './editor/BrandAssignment';
import DataBindingSystem from './editor/DataBindingSystem';
import TemplatePreview from './editor/TemplatePreview';
import UsageGuide from './editor/UsageGuide';
import AdvancedTools from './editor/AdvancedTools';
import { aiTemplateService } from '../../services/aiTemplateService';

interface CanvaLikeEditorProps {
  initialTemplate?: any;
  onSave?: (template: any) => void;
  onClose?: () => void;
}

interface Layer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

const CanvaLikeEditor: React.FC<CanvaLikeEditorProps> = ({
  initialTemplate,
  onSave,
  onClose
}) => {
  // Canvas state
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  
  // Tool states
  const [activeTool, setActiveTool] = useState<string>('select');
  const [zoom, setZoom] = useState(1);
  
  // Object properties
  const [textColor, setTextColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#3B82F6');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(24);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [opacity, setOpacity] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [scaleX, setScaleX] = useState(1);
  const [scaleY, setScaleY] = useState(1);
  
  // Shadow properties
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  
  // Border properties
  const [borderRadius, setBorderRadius] = useState(0);
  
  // Template state
  const [templateName, setTemplateName] = useState('Yeni Şablon');
  
  // History for undo/redo
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // AI state
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  // Usage guide state
  const [showUsageGuide, setShowUsageGuide] = useState(false);
  
  // Template system state
  const [activePanel, setActivePanel] = useState<'layers' | 'categories' | 'placeholders' | 'brands' | 'data' | 'preview' | 'advanced'>('layers');
  const [selectedCategory, setSelectedCategory] = useState('ecommerce');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<number[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [templateId, setTemplateId] = useState(`template-${Date.now()}`);
  
  // Auto-save
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Canvas dimensions
  const canvasWidth = 720;
  const canvasHeight = 1280;

  // Initialize canvas
  const handleCanvasReady = useCallback((fabricCanvas: fabric.Canvas) => {
    setCanvas(fabricCanvas);
    saveToHistory(fabricCanvas);
  }, []);

  // Save to history for undo/redo
  const saveToHistory = useCallback((fabricCanvas: fabric.Canvas) => {
    const state = JSON.stringify(fabricCanvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Update layers when canvas changes
  const updateLayers = useCallback((fabricCanvas: fabric.Canvas) => {
    const objects = fabricCanvas.getObjects();
    const newLayers: Layer[] = objects.map((obj, index) => ({
      id: (obj as any).id || `layer-${index}`,
      name: (obj as any).name || `${obj.type} ${index + 1}`,
      type: obj.type || 'unknown',
      visible: obj.visible !== false,
      locked: obj.selectable === false,
      opacity: obj.opacity || 1,
      order: index
    }));
    setLayers(newLayers);
  }, []);

  // Handle object selection
  const handleObjectSelect = useCallback((object: any) => {
    setSelectedObject(object);
    if (object) {
      setTextColor(object.fill || '#000000');
      setFillColor(object.fill || '#3B82F6');
      setStrokeColor(object.stroke || '#000000');
      setStrokeWidth(object.strokeWidth || 2);
      setFontSize(object.fontSize || 24);
      setFontFamily(object.fontFamily || 'Arial');
      setOpacity(object.opacity || 1);
      setRotation(object.angle || 0);
      setScaleX(object.scaleX || 1);
      setScaleY(object.scaleY || 1);
    }
  }, []);

  const handleObjectDeselect = useCallback(() => {
    setSelectedObject(null);
  }, []);

  const handleObjectModified = useCallback(() => {
    if (canvas) {
      updateLayers(canvas);
      saveToHistory(canvas);
    }
  }, [canvas, updateLayers, saveToHistory]);

  const handleObjectAdded = useCallback(() => {
    if (canvas) {
      updateLayers(canvas);
      saveToHistory(canvas);
    }
  }, [canvas, updateLayers, saveToHistory]);

  const handleObjectRemoved = useCallback(() => {
    if (canvas) {
      updateLayers(canvas);
      saveToHistory(canvas);
    }
  }, [canvas, updateLayers, saveToHistory]);

  // Toolbar handlers
  const handleSave = useCallback(() => {
    if (!canvas) return;
    
    const templateData = {
      name: templateName,
      canvas_data: canvas.toJSON(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    onSave?.(templateData);
    toast.success('Şablon kaydedildi!');
  }, [canvas, templateName, onSave]);

  const handleCanvasExport = useCallback(() => {
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });
    
    const link = document.createElement('a');
    link.download = `${templateName}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success('Şablon dışa aktarıldı!');
  }, [canvas, templateName]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && canvas) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(history[newIndex], () => {
        canvas.renderAll();
        updateLayers(canvas);
      });
    }
  }, [historyIndex, history, canvas, updateLayers]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && canvas) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(history[newIndex], () => {
        canvas.renderAll();
        updateLayers(canvas);
      });
    }
  }, [historyIndex, history, canvas, updateLayers]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  }, []);

  const handleDelete = useCallback(() => {
    if (canvas && selectedObject) {
      canvas.remove(selectedObject);
      canvas.renderAll();
      setSelectedObject(null);
    }
  }, [canvas, selectedObject]);

  const handleCopy = useCallback(async () => {
    if (canvas && selectedObject) {
      try {
        const cloned = await selectedObject.clone();
        cloned.set({
          left: (selectedObject.left || 0) + 20,
          top: (selectedObject.top || 0) + 20
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
      } catch (error) {
        console.error('Copy error:', error);
      }
    }
  }, [canvas, selectedObject]);

  // AI handlers
  const handleAIGenerate = useCallback(() => {
    setShowAIModal(true);
  }, []);

  const handleAIGenerateTemplate = useCallback(async (prompt: string, style: string) => {
    setIsAIGenerating(true);
    setShowAIModal(false);
    
    try {
      const result = await aiTemplateService.generateTemplate({ prompt, style });
      
      if (result.success && result.template && canvas) {
        // AI template'i canvas'a yükle
        canvas.loadFromJSON(result.template.canvas_data, () => {
          canvas.renderAll();
          updateLayers(canvas);
          setTemplateName(result.template.name);
          toast.success('AI şablonu başarıyla oluşturuldu!');
        });
      } else {
        toast.error(result.error || 'AI şablonu oluşturulamadı');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('AI servisi hatası');
    } finally {
      setIsAIGenerating(false);
    }
  }, [canvas, updateLayers]);

  // Property change handlers
  const handlePropertyChange = useCallback((property: string, value: any) => {
    if (selectedObject && canvas) {
      (selectedObject as any)[property] = value;
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleColorChange = useCallback((type: 'text' | 'fill' | 'stroke', color: string) => {
    if (selectedObject && canvas) {
      if (type === 'text' || type === 'fill') {
        selectedObject.set('fill', color);
        setTextColor(color);
        setFillColor(color);
      } else if (type === 'stroke') {
        selectedObject.set('stroke', color);
        setStrokeColor(color);
      }
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleFontSizeChange = useCallback((size: number) => {
    if (selectedObject && canvas) {
      selectedObject.set('fontSize', size);
      setFontSize(size);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleFontFamilyChange = useCallback((family: string) => {
    if (selectedObject && canvas) {
      selectedObject.set('fontFamily', family);
      setFontFamily(family);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleOpacityChange = useCallback((opacity: number) => {
    if (selectedObject && canvas) {
      selectedObject.set('opacity', opacity);
      setOpacity(opacity);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleRotationChange = useCallback((rotation: number) => {
    if (selectedObject && canvas) {
      selectedObject.set('angle', rotation);
      setRotation(rotation);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  const handleScaleChange = useCallback((scaleX: number, scaleY: number) => {
    if (selectedObject && canvas) {
      selectedObject.set('scaleX', scaleX);
      selectedObject.set('scaleY', scaleY);
      setScaleX(scaleX);
      setScaleY(scaleY);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  // Shadow handlers
  const handleShadowChange = useCallback((property: string, value: any) => {
    if (selectedObject && canvas) {
      selectedObject.set(property, value);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  // Border radius handler
  const handleBorderRadiusChange = useCallback((radius: number) => {
    if (selectedObject && canvas) {
      selectedObject.set('rx', radius);
      selectedObject.set('ry', radius);
      setBorderRadius(radius);
      canvas.renderAll();
    }
  }, [selectedObject, canvas]);

  // Layer handlers
  const handleLayerSelect = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        canvas.setActiveObject(object);
        canvas.renderAll();
      }
    }
  }, [canvas]);

  const handleLayerToggleVisibility = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        object.set('visible', !object.visible);
        canvas.renderAll();
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerToggleLock = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        object.set('selectable', object.selectable === false);
        canvas.renderAll();
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        canvas.remove(object);
        canvas.renderAll();
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerDuplicate = useCallback(async (layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        try {
          const cloned = await object.clone();
          cloned.set({
            left: (object.left || 0) + 20,
            top: (object.top || 0) + 20
          });
          canvas.add(cloned);
          canvas.renderAll();
          updateLayers(canvas);
        } catch (error) {
          console.error('Duplicate error:', error);
        }
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerMoveUp = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        (object as any).bringForward();
        canvas.renderAll();
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerMoveDown = useCallback((layerId: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        (object as any).sendBackwards();
        canvas.renderAll();
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  const handleLayerRename = useCallback((layerId: string, newName: string) => {
    if (canvas) {
      const object = canvas.getObjects().find(obj => ((obj as any).id || '') === layerId);
      if (object) {
        (object as any).name = newName;
        updateLayers(canvas);
      }
    }
  }, [canvas, updateLayers]);

  // Template system handlers
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    setActivePanel('categories');
  }, []);

  const handleSubcategorySelect = useCallback((subcategory: string) => {
    setSelectedSubcategory(subcategory);
    toast.success(`${subcategory} alt kategorisi seçildi`);
  }, []);

  const handlePlaceholderAdd = useCallback((placeholder: any) => {
    setPlaceholders(prev => [...prev, placeholder]);
    toast.success('Placeholder eklendi');
  }, []);

  const handlePlaceholderEdit = useCallback((id: string, placeholder: any) => {
    setPlaceholders(prev => prev.map(p => p.id === id ? placeholder : p));
    toast.success('Placeholder güncellendi');
  }, []);

  const handlePlaceholderDelete = useCallback((id: string) => {
    setPlaceholders(prev => prev.filter(p => p.id !== id));
    toast.success('Placeholder silindi');
  }, []);

  const handleBrandSelect = useCallback((brandIds: number[]) => {
    setSelectedBrands(brandIds);
  }, []);

  const handleTemplateAssign = useCallback((templateId: string, brandIds: number[]) => {
    toast.success(`Şablon ${brandIds.length} markaya atandı`);
  }, []);

  const handleDataChange = useCallback((data: Record<string, any>) => {
    setPreviewData(data);
  }, []);

  const handlePreview = useCallback((data: Record<string, any>) => {
    setPreviewData(data);
    setActivePanel('preview');
  }, []);

  const handleExport = useCallback((format: 'png' | 'jpg' | 'pdf') => {
    toast.success(`${format.toUpperCase()} formatında dışa aktarıldı`);
  }, []);

  const handleShare = useCallback(() => {
    toast.success('Paylaşılabilir link oluşturuldu');
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts when canvas is focused
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'a':
            e.preventDefault();
            if (canvas) {
              canvas.discardActiveObject();
              canvas.setActiveObject(new fabric.ActiveSelection(canvas.getObjects(), {
                canvas: canvas,
              }));
              canvas.requestRenderAll();
            }
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'c':
            e.preventDefault();
            handleCopy();
            break;
          case 'v':
            e.preventDefault();
            // Paste functionality would go here
            break;
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (canvas && canvas.getActiveObject()) {
          const activeObject = canvas.getActiveObject();
          if (activeObject) {
            canvas.remove(activeObject);
            canvas.requestRenderAll();
            updateLayers(canvas);
            if (canvas) saveToHistory(canvas);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvas, handleUndo, handleRedo, handleSave, handleCopy, updateLayers, saveToHistory]);

  // Auto-save
  useEffect(() => {
    if (canvas) {
      autoSaveIntervalRef.current = setInterval(() => {
        const templateData = {
          name: templateName,
          canvas_data: canvas.toJSON(),
          auto_saved: true
        };
        localStorage.setItem('template_draft', JSON.stringify(templateData));
      }, 30000); // Auto-save every 30 seconds
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [canvas, templateName]);

  // Load initial template
  useEffect(() => {
    if (initialTemplate && canvas) {
      canvas.loadFromJSON(initialTemplate.canvas_data, () => {
        canvas.renderAll();
        updateLayers(canvas);
      });
      setTemplateName(initialTemplate.name || 'Yeni Şablon');
    }
  }, [initialTemplate, canvas, updateLayers]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onSave={handleSave}
          onExport={handleCanvasExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onAIGenerate={handleAIGenerate}
        onShowUsageGuide={() => setShowUsageGuide(true)}
        zoom={zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasSelection={!!selectedObject}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Dynamic Panels */}
        <div className="flex">
          {/* Panel Tabs */}
          <div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col">
            {[
              { id: 'layers', label: 'Katmanlar', icon: '📄' },
              { id: 'categories', label: 'Kategoriler', icon: '📁' },
              { id: 'placeholders', label: 'Alanlar', icon: '🔗' },
              { id: 'brands', label: 'Markalar', icon: '🏢' },
              { id: 'data', label: 'Veri', icon: '📊' },
              { id: 'preview', label: 'Önizleme', icon: '👁️' },
              { id: 'advanced', label: 'Gelişmiş', icon: '🎨' }
            ].map(panel => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id as any)}
                className={`p-3 border-b border-gray-200 hover:bg-gray-200 transition-colors ${
                  activePanel === panel.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'
                }`}
                title={panel.label}
              >
                <span className="text-lg">{panel.icon}</span>
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="w-80">
            {activePanel === 'layers' && (
              <LayersPanel
                layers={layers}
                selectedLayerId={selectedObject ? (selectedObject as any).id || null : null}
                onLayerSelect={handleLayerSelect}
                onLayerToggleVisibility={handleLayerToggleVisibility}
                onLayerToggleLock={handleLayerToggleLock}
                onLayerDelete={handleLayerDelete}
                onLayerDuplicate={handleLayerDuplicate}
                onLayerMoveUp={handleLayerMoveUp}
                onLayerMoveDown={handleLayerMoveDown}
                onLayerRename={handleLayerRename}
              />
            )}
            {activePanel === 'categories' && (
              <TemplateCategories
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
                onSubcategorySelect={handleSubcategorySelect}
              />
            )}
            {activePanel === 'placeholders' && (
              <PlaceholderSystem
                onAddPlaceholder={handlePlaceholderAdd}
                onEditPlaceholder={handlePlaceholderEdit}
                onDeletePlaceholder={handlePlaceholderDelete}
                placeholders={placeholders}
              />
            )}
            {activePanel === 'brands' && (
              <BrandAssignment
                selectedBrands={selectedBrands}
                onBrandSelect={handleBrandSelect}
                onTemplateAssign={handleTemplateAssign}
                templateId={templateId}
              />
            )}
            {activePanel === 'data' && (
              <DataBindingSystem
                templateId={templateId}
                onDataChange={handleDataChange}
                onPreview={handlePreview}
              />
            )}
            {activePanel === 'preview' && (
              <TemplatePreview
                templateData={initialTemplate}
                previewData={previewData}
                onExport={handleExport}
                onShare={handleShare}
              />
            )}
            {activePanel === 'advanced' && (
              <AdvancedTools
                onToolSelect={setActiveTool}
                onColorChange={(color) => handleColorChange('fill', color)}
                onGradientChange={(gradient) => console.log('Gradient:', gradient)}
                onFilterApply={(filter) => console.log('Filter:', filter)}
                onTransform={(transform) => console.log('Transform:', transform)}
                onEffectApply={(effect) => console.log('Effect:', effect)}
              />
            )}
          </div>
        </div>

        {/* Center - Canvas */}
        <Canvas
          width={canvasWidth}
          height={canvasHeight}
          backgroundColor="#ffffff"
          zoom={zoom}
          onObjectSelect={handleObjectSelect}
          onObjectDeselect={handleObjectDeselect}
          onObjectModified={handleObjectModified}
          onObjectAdded={handleObjectAdded}
          onObjectRemoved={handleObjectRemoved}
          activeTool={activeTool}
          onCanvasReady={handleCanvasReady}
          initialData={initialTemplate?.canvas_data}
        />

        {/* Right Sidebar - Properties */}
        <PropertiesPanel
          selectedObject={selectedObject}
          activeTool={activeTool}
          onPropertyChange={handlePropertyChange}
          textColor={textColor}
          fillColor={fillColor}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          fontSize={fontSize}
          fontFamily={fontFamily}
          opacity={opacity}
          rotation={rotation}
          scaleX={scaleX}
          scaleY={scaleY}
          onColorChange={handleColorChange}
          onFontSizeChange={handleFontSizeChange}
          onFontFamilyChange={handleFontFamilyChange}
          onOpacityChange={handleOpacityChange}
          onRotationChange={handleRotationChange}
          onScaleChange={handleScaleChange}
          shadowColor={shadowColor}
          shadowBlur={shadowBlur}
          shadowOffsetX={shadowOffsetX}
          shadowOffsetY={shadowOffsetY}
          borderRadius={borderRadius}
          onShadowChange={handleShadowChange}
          onBorderRadiusChange={handleBorderRadiusChange}
        />
      </div>

      {/* Template Name Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Şablon Adı:</label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
            placeholder="Şablon adını girin..."
          />
          <button
            onClick={onClose}
            className="px-4 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Kapat
          </button>
        </div>
      </div>

                  {/* AI Modal */}
                  <AIModal
                    isOpen={showAIModal}
                    onClose={() => setShowAIModal(false)}
                    onGenerate={handleAIGenerateTemplate}
                    isGenerating={isAIGenerating}
                  />

                  {/* Usage Guide */}
                  {showUsageGuide && (
                    <UsageGuide
                      onClose={() => setShowUsageGuide(false)}
                    />
                  )}
    </div>
  );
};

export default CanvaLikeEditor;