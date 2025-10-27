import { Canvas } from 'fabric';
import { Template } from '../../api/templates';
import { templatesAPI } from '../../api/templates';

interface CanvasRenderOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

export class CanvasRenderService {
  static async renderTemplateToCanvas(
    templateData: any,
    options: CanvasRenderOptions = {}
  ): Promise<Canvas> {
    const canvas = new Canvas(undefined, {
      width: options.width || 700,
      height: options.height || 900,
      backgroundColor: '#ffffff'
    });
    
    try {
      // Eğer templateData.canvas varsa onu kullan, yoksa doğrudan templateData
      const canvasData = templateData.canvas || templateData;
      
      await new Promise((resolve, reject) => {
        try {
          canvas.loadFromJSON(canvasData, () => {
            canvas.renderAll();
            resolve(canvas);
          });
        } catch (error) {
          reject(error);
        }
      });
      
      return canvas;
    } catch (error) {
      console.error('Canvas rendering error:', error);
      throw error;
    }
  }
  
  static async renderTemplateToImage(
    templateData: any,
    options: CanvasRenderOptions = {}
  ): Promise<Blob> {
    const canvas = await this.renderTemplateToCanvas(templateData, options);
    
    return new Promise((resolve, reject) => {
      try {
        const dataURL = canvas.toDataURL({
          format: options.format || 'png',
          quality: options.quality || 1,
          multiplier: 1
        });
        
        fetch(dataURL)
          .then(res => res.blob())
          .then(resolve)
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  static async renderTemplateToBase64(
    templateData: any,
    options: CanvasRenderOptions = {}
  ): Promise<string> {
    const canvas = await this.renderTemplateToCanvas(templateData, options);
    
    return canvas.toDataURL({
      format: options.format || 'png',
      quality: options.quality || 1,
      multiplier: 1
    });
  }
  
  static async renderAndDownload(
    templateData: any,
    filename: string = 'template.png',
    options: CanvasRenderOptions = {}
  ): Promise<void> {
    const canvas = await this.renderTemplateToCanvas(templateData, options);
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL({
      format: options.format || 'png',
      quality: options.quality || 1,
      multiplier: 1
    });
    link.click();
  }
  
  // Render template using backend service
  static async renderTemplateBackend(
    templateData: any,
    width: number = 800,
    height: number = 1000,
    format: string = 'PNG'
  ): Promise<Blob> {
    try {
      const blob = await templatesAPI.renderTemplate(templateData, width, height, format);
      return blob;
    } catch (error) {
      console.error('Backend template rendering error:', error);
      throw error;
    }
  }
  
  // Export template as PNG using backend service
  static async exportTemplatePNG(
    templateId: number,
    width: number = 800,
    height: number = 1000
  ): Promise<Blob> {
    try {
      const blob = await templatesAPI.exportTemplatePNG(templateId, width, height);
      return blob;
    } catch (error) {
      console.error('Template PNG export error:', error);
      throw error;
    }
  }
  
  // Import template from JSON file
  static async importTemplateFromJSON(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const templateData = JSON.parse(content);
          resolve(templateData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  }
  
  // Export template to JSON file
  static async exportTemplateToJSON(templateData: any, filename: string = 'template.json'): Promise<void> {
    try {
      const dataStr = JSON.stringify(templateData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', filename);
      linkElement.click();
    } catch (error) {
      console.error('Template JSON export error:', error);
      throw error;
    }
  }
  
  // Render multiple templates in parallel
  static async renderMultipleTemplates(
    templates: any[],
    options: CanvasRenderOptions = {}
  ): Promise<Blob[]> {
    try {
      const blobs: Blob[] = [];
      
      // Paralel olarak tüm şablonları render et
      const promises = templates.map(template => 
        this.renderTemplateToImage(template, options)
      );
      
      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          blobs.push(result.value);
        } else {
          console.error(`Template ${index} rendering failed:`, result.reason);
        }
      });
      
      return blobs;
    } catch (error) {
      console.error('Multiple templates rendering error:', error);
      throw error;
    }
  }
  
  // Batch export templates
  static async batchExportTemplates(
    templates: Template[],
    exportType: 'png' | 'json' = 'png',
    options: CanvasRenderOptions = {}
  ): Promise<void> {
    try {
      if (exportType === 'png') {
        // PNG export için batch işlem
        const templateDatas = templates.map(t => 
          typeof t.template_data === 'string' ? JSON.parse(t.template_data) : t.template_data
        );
        
        const blobs = await this.renderMultipleTemplates(templateDatas, options);
        
        // Her bir PNG dosyasını indir
        blobs.forEach((blob, index) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${templates[index].name}_${new Date().toISOString().slice(0, 10)}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      } else {
        // JSON export için batch işlem
        templates.forEach(template => {
          const templateData = typeof template.template_data === 'string' 
            ? JSON.parse(template.template_data) 
            : template.template_data;
          
          this.exportTemplateToJSON(templateData, `${template.name}_${new Date().toISOString().slice(0, 10)}.json`);
        });
      }
    } catch (error) {
      console.error('Batch export error:', error);
      throw error;
    }
  }
}