/**
 * Dynamic Template Service
 * Handles dynamic template creation, rendering, and export/import
 */

import { Canvas } from 'fabric';
import { Product } from '../../api/products';
import { templatesAPI } from '../../api/templates';

export interface DynamicTemplateOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  responsive?: boolean;
  autoScale?: boolean;
}

export interface DynamicTemplateData {
  version: string;
  canvas: any;
  product: Product;
  metadata: {
    created_at: string;
    exported_at: string;
    dimensions: {
      width: number;
      height: number;
    };
    format: string;
    quality: number;
  };
}

export class DynamicTemplateService {
  /**
   * Create dynamic template with responsive dimensions
   */
  static async createDynamicTemplate(
    canvas: Canvas,
    product: Product,
    options: DynamicTemplateOptions = {}
  ): Promise<DynamicTemplateData> {
    const {
      width = 700,
      height = 900,
      format = 'png',
      quality = 1,
      responsive = true,
      autoScale = true
    } = options;

    // Get canvas data
    const canvasData = canvas.toJSON();
    
    // Calculate dynamic dimensions
    const dynamicDimensions = this.calculateDynamicDimensions(
      canvasData,
      { width, height },
      { responsive, autoScale }
    );

    // Create dynamic template data
    const templateData: DynamicTemplateData = {
      version: '2.0',
      canvas: canvasData,
      product: product,
      metadata: {
        created_at: new Date().toISOString(),
        exported_at: new Date().toISOString(),
        dimensions: dynamicDimensions,
        format,
        quality
      }
    };

    return templateData;
  }

  /**
   * Calculate dynamic dimensions based on content and options
   */
  private static calculateDynamicDimensions(
    canvasData: any,
    baseDimensions: { width: number; height: number },
    options: { responsive: boolean; autoScale: boolean }
  ): { width: number; height: number } {
    const { width: baseWidth, height: baseHeight } = baseDimensions;
    const { responsive, autoScale } = options;

    if (!responsive && !autoScale) {
      return { width: baseWidth, height: baseHeight };
    }

    // Analyze canvas objects to determine optimal dimensions
    const objects = canvasData.objects || [];
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    objects.forEach((obj: any) => {
      const left = obj.left || 0;
      const top = obj.top || 0;
      const width = (obj.width || 0) * (obj.scaleX || 1);
      const height = (obj.height || 0) * (obj.scaleY || 1);

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    });

    // Calculate content bounds
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    // Add padding
    const padding = 50;
    const calculatedWidth = Math.max(baseWidth, contentWidth + padding * 2);
    const calculatedHeight = Math.max(baseHeight, contentHeight + padding * 2);

    // Apply responsive scaling
    if (responsive) {
      const aspectRatio = calculatedWidth / calculatedHeight;
      
      // Common aspect ratios
      const ratios = {
        square: 1,
        portrait: 3/4,
        landscape: 4/3,
        instagram: 1,
        facebook: 1.91,
        twitter: 16/9
      };

      // Find closest ratio
      let closestRatio = aspectRatio;
      let minDiff = Infinity;
      
      Object.values(ratios).forEach(ratio => {
        const diff = Math.abs(aspectRatio - ratio);
        if (diff < minDiff) {
          minDiff = diff;
          closestRatio = ratio;
        }
      });

      // Adjust dimensions to match closest ratio
      if (closestRatio > aspectRatio) {
        return {
          width: Math.round(calculatedHeight * closestRatio),
          height: calculatedHeight
        };
      } else {
        return {
          width: calculatedWidth,
          height: Math.round(calculatedWidth / closestRatio)
        };
      }
    }

    return {
      width: Math.round(calculatedWidth),
      height: Math.round(calculatedHeight)
    };
  }

  /**
   * Render template with dynamic dimensions
   */
  static async renderDynamicTemplate(
    templateData: DynamicTemplateData,
    options: DynamicTemplateOptions = {}
  ): Promise<Canvas> {
    const { width, height } = templateData.metadata.dimensions;
    
    // Create canvas with dynamic dimensions
    const canvas = new Canvas(undefined, {
      width,
      height,
      backgroundColor: '#ffffff'
    });

    // Load template data
    await new Promise((resolve, reject) => {
      canvas.loadFromJSON(templateData.canvas, () => {
        canvas.renderAll();
        resolve(true);
      });
    });

    return canvas;
  }

  /**
   * Export template in multiple formats with dynamic sizing
   */
  static async exportDynamicTemplate(
    templateData: DynamicTemplateData,
    formats: Array<'png' | 'jpeg' | 'webp'> = ['png'],
    options: DynamicTemplateOptions = {}
  ): Promise<{ [key: string]: string }> {
    const results: { [key: string]: string } = {};
    
    for (const format of formats) {
      try {
        const canvas = await this.renderDynamicTemplate(templateData, options);
        const dataURL = canvas.toDataURL({
          format,
          quality: options.quality || 1,
          multiplier: 1
        });
        
        results[format] = dataURL;
      } catch (error) {
        console.error(`Error exporting ${format}:`, error);
      }
    }

    return results;
  }

  /**
   * Import template with dynamic validation
   */
  static async importDynamicTemplate(
    file: File,
    options: DynamicTemplateOptions = {}
  ): Promise<DynamicTemplateData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          // Validate dynamic template structure
          if (!this.validateDynamicTemplate(data)) {
            throw new Error('Invalid dynamic template format');
          }
          
          resolve(data as DynamicTemplateData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('File read error'));
      reader.readAsText(file);
    });
  }

  /**
   * Validate dynamic template structure
   */
  private static validateDynamicTemplate(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.version &&
      data.canvas &&
      data.product &&
      data.metadata &&
      data.metadata.dimensions &&
      typeof data.metadata.dimensions.width === 'number' &&
      typeof data.metadata.dimensions.height === 'number'
    );
  }

  /**
   * Get optimal template dimensions for different use cases
   */
  static getOptimalDimensions(useCase: string): { width: number; height: number } {
    const dimensions: { [key: string]: { width: number; height: number } } = {
      'social-media': { width: 1080, height: 1080 },
      'instagram-post': { width: 1080, height: 1080 },
      'instagram-story': { width: 1080, height: 1920 },
      'facebook-post': { width: 1200, height: 630 },
      'twitter-post': { width: 1200, height: 675 },
      'linkedin-post': { width: 1200, height: 627 },
      'print-a4': { width: 2480, height: 3508 },
      'print-letter': { width: 2550, height: 3300 },
      'web-banner': { width: 1200, height: 300 },
      'email-header': { width: 600, height: 200 },
      'catalog': { width: 800, height: 1000 },
      'business-card': { width: 1050, height: 600 }
    };

    return dimensions[useCase] || { width: 700, height: 900 };
  }

  /**
   * Auto-optimize template for specific platform
   */
  static async optimizeForPlatform(
    templateData: DynamicTemplateData,
    platform: string
  ): Promise<DynamicTemplateData> {
    const optimalDimensions = this.getOptimalDimensions(platform);
    
    // Create optimized template
    const optimizedTemplate = {
      ...templateData,
      metadata: {
        ...templateData.metadata,
        dimensions: optimalDimensions,
        platform,
        optimized_at: new Date().toISOString()
      }
    };

    return optimizedTemplate;
  }
}
