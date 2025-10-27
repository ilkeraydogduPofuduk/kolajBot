import { useState, useCallback } from 'react';
import { Canvas } from 'fabric';
import { toast } from 'react-hot-toast';
import { templatesAPI, Template } from '../../api/templates';
import { Product } from '../../api/products';

export const useTemplateOperations = () => {
  const [isExporting, setIsExporting] = useState(false);

  // Export template as JSON
  const exportTemplateJSON = useCallback((canvas: Canvas, product: Product) => {
    if (!canvas || !product) {
      toast.error('Canvas veya ürün bulunamadı');
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
      
      const exportFileDefaultName = `${product.code}_template_${new Date().toISOString().slice(0, 10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Şablon JSON olarak dışa aktarıldı!');
    } catch (error) {
      console.error('JSON export error:', error);
      toast.error('JSON dışa aktarma başarısız oldu');
    }
  }, []);

  // Import template from JSON
  const importTemplateJSON = useCallback((canvas: Canvas, e: React.ChangeEvent<HTMLInputElement>) => {
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
    e.target.value = '';
  }, []);

  // Export template as PNG
  const exportTemplatePNG = useCallback(async (canvas: Canvas, product: Product, templateId?: number) => {
    if (!canvas || !product) {
      toast.error('Canvas veya ürün bulunamadı');
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
  }, []);

  return {
    isExporting,
    exportTemplateJSON,
    importTemplateJSON,
    exportTemplatePNG,
  };
};