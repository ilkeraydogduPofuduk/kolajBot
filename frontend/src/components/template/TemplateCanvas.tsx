import React, { RefObject, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { toast } from 'react-hot-toast';
import { templatesAPI } from '../../api/templates';
import { CanvasRenderService } from '../../services/template/renderService';

interface TemplateCanvasProps {
  canvasElementRef: RefObject<HTMLCanvasElement | null>;
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  canvas: Canvas | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onClearCanvas: () => void;
  onRenderCanvas: () => void;
  product?: any;
  templateId?: number;
}

const TemplateCanvas: React.FC<TemplateCanvasProps> = ({
  canvasElementRef,
  canvasContainerRef,
  canvas,
  zoom,
  onZoomChange,
  onClearCanvas,
  onRenderCanvas,
  product,
  templateId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleZoomIn = () => {
    const newZoom = zoom * 1.1;
    onZoomChange(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = zoom * 0.9;
    onZoomChange(newZoom);
  };

  const handleResetZoom = () => {
    onZoomChange(1);
  };

  const handleExportPNG = async () => {
    if (!canvas) {
      toast.error('Canvas bulunamadı');
      return;
    }

    try {
      setIsExporting(true);
      
      // Canvas verisini al
      const canvasData = canvas.toJSON();
      
      // Template verisini oluştur
      const templateData = {
        version: '1.0',
        canvas: canvasData,
        product: product,
        exportedAt: new Date().toISOString()
      };
      
      // Template'i render et ve indir
      if (templateId) {
        // Varolan template'i dışa aktar
        const blob = await templatesAPI.exportTemplatePNG(templateId, 800, 1000);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `template_${templateId}_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Yeni template'i dışa aktar
        const blob = await templatesAPI.renderTemplate(templateData, 800, 1000);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `new_template_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast.success('Şablon PNG olarak dışa aktarıldı!');
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('PNG dışa aktarma başarısız oldu');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!canvas) {
      toast.error('Canvas bulunamadı');
      return;
    }

    try {
      // Canvas verisini al
      const canvasData = canvas.toJSON();
      
      // Template verisini oluştur
      const templateData = {
        version: '1.0',
        canvas: canvasData,
        product: product,
        exportedAt: new Date().toISOString()
      };
      
      // JSON verisini indir
      const dataStr = JSON.stringify(templateData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `template_${new Date().toISOString().slice(0, 10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Şablon JSON olarak dışa aktarıldı!');
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error('JSON dışa aktarma başarısız oldu');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Sadece JSON dosyaları kabul edilir');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Dosya okunamadı');
        }

        const content = event.target.result as string;
        const templateData = JSON.parse(content);

        // Canvas'ı temizle
        if (canvas) {
          canvas.clear();
          
          // JSON verisini yükle
          const canvasData = templateData.canvas || templateData;
          canvas.loadFromJSON(canvasData, () => {
            canvas.renderAll();
            toast.success('Şablon başarıyla yüklendi!');
          });
        }
      } catch (error) {
        console.error('JSON import error:', error);
        toast.error('JSON yükleme başarısız oldu');
      }
    };

    reader.readAsText(file);
    // Input'u sıfırla
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Canvas Toolbar - Expanded with export/import buttons */}
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">Zoom:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomOut}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                -
              </button>
              <span className="text-xs min-w-[35px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                +
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
              >
                100%
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
              id="import-json-input"
            />
            <label
              htmlFor="import-json-input"
              className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded cursor-pointer"
            >
              JSON Yükle
            </label>
            <button
              onClick={handleExportJSON}
              className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
            >
              JSON Dışa Aktar
            </button>
            <button
              onClick={handleExportPNG}
              disabled={isExporting}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded disabled:opacity-50"
            >
              {isExporting ? 'Dışa Aktarılıyor...' : 'PNG Dışa Aktar'}
            </button>
            <button
              onClick={onClearCanvas}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
            >
              Temizle
            </button>
            <button
              onClick={onRenderCanvas}
              className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
            >
              Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container - Much Larger */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div 
          ref={canvasContainerRef}
          className="relative bg-white flex items-center justify-center rounded-lg shadow-2xl border border-gray-300"
          style={{
            width: '700px',
            height: '900px',
            overflow: 'visible'
          }}
        >
          <canvas
            ref={canvasElementRef}
            id="template-canvas"
            style={{
              display: canvas ? 'block' : 'none',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}
          />
          {!canvas && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Canvas yükleniyor...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateCanvas;
