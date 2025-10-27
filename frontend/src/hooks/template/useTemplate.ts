import { useState, useCallback } from 'react';
import { Canvas } from 'fabric';
import { toast } from 'react-hot-toast';
import { templatesAPI, Template } from '../../api/templates';
import { Product } from '../../api/products';

export const useTemplate = () => {
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load saved templates
  const loadSavedTemplates = useCallback(async (productId: number) => {
    try {
      const response = await templatesAPI.getTemplatesByProduct(productId);
      setSavedTemplates(response.templates || []);
    } catch (error) {
      console.error('Templates load error:', error);
    }
  }, []);

  // Save template to database
  const saveTemplateToDatabase = useCallback(async (canvas: Canvas, product: Product) => {
    if (!templateName.trim()) {
      toast.error('Şablon adı gerekli!');
      return;
    }

    try {
      setLoading(true);
      const templateData = canvas.toJSON();
      
      const response = await templatesAPI.createTemplate({
        name: templateName,
        description: `${product.code} için oluşturulan şablon`,
        product_id: product.id,
        brand_id: product.brand_id || 1,
        template_data: JSON.stringify(templateData), // Stringify for database storage
      });

      toast.success('Şablon veritabanına kaydedildi!');
      setShowTemplateModal(false);
      setTemplateName('');
      loadSavedTemplates(product.id);
      
      return response;
    } catch (error) {
      console.error('Template save error:', error);
      toast.error('Şablon kaydedilemedi!');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [templateName, loadSavedTemplates]);

  // Load template from database
  const loadTemplate = useCallback(async (canvas: Canvas, template: Template) => {
    try {
      setLoading(true);
      canvas.clear();
      
      // Parse template data
      const templateData = typeof template.template_data === 'string' 
        ? JSON.parse(template.template_data) 
        : template.template_data;
      
      await canvas.loadFromJSON(templateData);
      canvas.renderAll();
      toast.success(`Şablon "${template.name}" yüklendi!`);
    } catch (error) {
      console.error('Template load error:', error);
      toast.error('Şablon yüklenemedi!');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save template as file
  const saveTemplateAsFile = useCallback((canvas: Canvas, product: Product) => {
    try {
      const canvasData = canvas.toJSON();
      
      // Create comprehensive template data
      const templateData = {
        version: '1.0',
        name: `${product.code}_${product.color || 'template'}_${new Date().toISOString().slice(0, 10)}`,
        description: `${product.code} - ${product.color || 'Ürün'} şablonu`,
        product: {
          id: product.id,
          code: product.code,
          color: product.color,
          product_type: product.product_type,
          size_range: product.size_range,
          price: product.price,
          currency: product.currency
        },
        canvas: canvasData,
        created_at: new Date().toISOString(),
        exported_at: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(templateData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${product.code}_${product.color || 'template'}_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Şablon dosya olarak kaydedildi!');
    } catch (error) {
      console.error('Template save as file error:', error);
      toast.error('Şablon dosya olarak kaydedilemedi');
    }
  }, []);

  // Export functions
  const exportPNG = useCallback(async (canvas: Canvas, product: Product) => {
    try {
      setExporting(true);
      
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 4,
        enableRetinaScaling: true,
      });

      const link = document.createElement('a');
      link.download = `${product.brand?.name || 'Brand'}-${product.code || 'Product'}-Template.png`;
      link.href = dataURL;
      link.click();

      toast.success('Ultra kaliteli şablon indirildi! (2160x2700px)');
    } catch (error) {
      console.error('PNG export error:', error);
      toast.error('PNG dışa aktarma başarısız oldu');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportAsFormat = useCallback(async (canvas: Canvas, product: Product, format: 'jpeg' | 'webp') => {
    try {
      setExporting(true);
      const quality = format === 'jpeg' ? 0.9 : 0.8;
      const dataURL = canvas.toDataURL({
        format: format,
        quality: quality,
        multiplier: 3,
      });
      
      const link = document.createElement('a');
      link.download = `template-${product.code || 'design'}-${Date.now()}.${format}`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${format.toUpperCase()} olarak indirildi!`);
    } catch (error) {
      console.error('Format export error:', error);
      toast.error(`${format.toUpperCase()} dışa aktarma başarısız oldu`);
    } finally {
      setExporting(false);
    }
  }, []);

  const exportForSocialMedia = useCallback(async (canvas: Canvas, product: Product) => {
    try {
      setExporting(true);
      const originalWidth = canvas.width!;
      const originalHeight = canvas.height!;
      
      canvas.setDimensions({ width: 1080, height: 1080 });
      
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
      
      canvas.setDimensions({ width: originalWidth, height: originalHeight });
      
      const link = document.createElement('a');
      link.download = `social-${product.code || 'design'}-1080x1080.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Sosyal medya formatında indirildi! (1080x1080)');
    } catch (error) {
      console.error('Social media export error:', error);
      toast.error('Sosyal medya dışa aktarma başarısız oldu');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportMultipleFormats = useCallback(async (canvas: Canvas, product: Product) => {
    try {
      setExporting(true);
      toast.loading('Çoklu format dışa aktarılıyor...', { duration: 3000 });
      
      setTimeout(() => exportPNG(canvas, product), 500);
      setTimeout(() => exportAsFormat(canvas, product, 'jpeg'), 1000);
      setTimeout(() => exportForSocialMedia(canvas, product), 1500);
      
      setTimeout(() => {
        toast.success('Tüm formatlar indirildi!');
      }, 2000);
    } catch (error) {
      console.error('Multiple format export error:', error);
      toast.error('Çoklu format dışa aktarma başarısız oldu');
    } finally {
      setExporting(false);
    }
  }, [exportPNG, exportAsFormat, exportForSocialMedia]);

  // Export template as PNG using backend service
  const exportTemplatePNG = useCallback(async (templateId: number, product: Product) => {
    try {
      setExporting(true);
      
      // Call backend API to export template as PNG
      const blob = await templatesAPI.exportTemplatePNG(templateId, 800, 1000);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${product.code}_${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Şablon PNG olarak dışa aktarıldı!');
    } catch (error) {
      console.error('Template PNG export error:', error);
      toast.error('Şablon PNG dışa aktarma başarısız oldu');
    } finally {
      setExporting(false);
    }
  }, []);

  // Import template from JSON file
  const importTemplateFromJSON = useCallback(async (file: File, canvas: Canvas) => {
    try {
      setLoading(true);
      
      // Read file content
      const content = await file.text();
      const templateData = JSON.parse(content);
      
      // Clear canvas
      canvas.clear();
      
      // Load canvas data
      const canvasData = templateData.canvas || templateData;
      canvas.loadFromJSON(canvasData, () => {
        canvas.renderAll();
        toast.success('Şablon başarıyla yüklendi!');
      });
      
    } catch (error) {
      console.error('Template import error:', error);
      toast.error('Şablon yükleme başarısız oldu');
    } finally {
      setLoading(false);
    }
  }, []);





  // Render template using backend service
  const renderTemplate = useCallback(async (templateData: any) => {
    try {
      setExporting(true);
      
      // Call backend API to render template
      const blob = await templatesAPI.renderTemplate(templateData, 800, 1000);
      
      return blob;
    } catch (error) {
      console.error('Template render error:', error);
      toast.error('Şablon render edilemedi');
      throw error;
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    savedTemplates,
    showTemplateModal,
    templateName,
    loading,
    exporting,
    setShowTemplateModal,
    setTemplateName,
    loadSavedTemplates,
    saveTemplateToDatabase,
    loadTemplate,
    saveTemplateAsFile,
    exportPNG,
    exportAsFormat,
    exportForSocialMedia,
    exportMultipleFormats,
    exportTemplatePNG,
    importTemplateFromJSON,
    renderTemplate,
  };
};