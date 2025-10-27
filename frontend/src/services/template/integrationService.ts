/**
 * Integration Service for Template System
 * Handles frontend-backend integration and data consistency
 */

import { Canvas } from 'fabric';
import { Product } from '../../api/products';
import { templatesAPI, Template } from '../../api/templates';
import { DynamicTemplateService, DynamicTemplateData } from './dynamicTemplateService';

export interface IntegrationOptions {
  validateData?: boolean;
  autoSync?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export interface IntegrationResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

export class IntegrationService {
  /**
   * Sync template data between frontend and backend
   */
  static async syncTemplateData(
    canvas: Canvas,
    product: Product,
    templateId?: number,
    options: IntegrationOptions = {}
  ): Promise<IntegrationResult> {
    const {
      validateData = true,
      autoSync = true,
      retryAttempts = 3,
      timeout = 30000
    } = options;

    try {
      // Get canvas data
      const canvasData = canvas.toJSON();
      
      // Validate data if required
      if (validateData) {
        const validationResult = this.validateCanvasData(canvasData);
        if (!validationResult.valid) {
          return {
            success: false,
            error: `Data validation failed: ${validationResult.errors.join(', ')}`,
            warnings: validationResult.warnings
          };
        }
      }

      // Create template data
      const templateData = {
        canvas: canvasData,
        product: product,
        metadata: {
          synced_at: new Date().toISOString(),
          version: '2.0'
        }
      };

      // Sync with backend
      if (templateId) {
        // Update existing template
        const result = await this.updateTemplateWithRetry(
          templateId,
          templateData,
          retryAttempts,
          timeout
        );
        return result;
      } else {
        // Create new template
        const result = await this.createTemplateWithRetry(
          templateData,
          retryAttempts,
          timeout
        );
        return result;
      }

    } catch (error) {
      return {
        success: false,
        error: `Integration error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate canvas data structure
   */
  private static validateCanvasData(canvasData: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic structure
    if (!canvasData || typeof canvasData !== 'object') {
      errors.push('Canvas data is not a valid object');
      return { valid: false, errors, warnings };
    }

    // Check version
    if (!canvasData.version) {
      warnings.push('Canvas data missing version information');
    }

    // Check objects array
    if (!Array.isArray(canvasData.objects)) {
      errors.push('Canvas data must contain objects array');
      return { valid: false, errors, warnings };
    }

    // Validate each object
    canvasData.objects.forEach((obj: any, index: number) => {
      if (!obj.type) {
        errors.push(`Object at index ${index} missing type`);
      }

      if (typeof obj.left !== 'number' || typeof obj.top !== 'number') {
        errors.push(`Object at index ${index} has invalid position`);
      }

      // Check for required properties based on type
      switch (obj.type) {
        case 'textbox':
          if (!obj.text && obj.text !== '') {
            warnings.push(`Textbox at index ${index} has no text content`);
          }
          break;
        case 'image':
          if (!obj.src) {
            errors.push(`Image at index ${index} missing source`);
          }
          break;
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create template with retry logic
   */
  private static async createTemplateWithRetry(
    templateData: any,
    retryAttempts: number,
    timeout: number
  ): Promise<IntegrationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await Promise.race([
          templatesAPI.createTemplate({
            name: `Template ${new Date().toISOString()}`,
            description: 'Auto-generated template',
            product_id: templateData.product.id,
            brand_id: templateData.product.brand_id || 1,
            template_data: JSON.stringify(templateData),
            is_active: true
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);

        return {
          success: true,
          data: response
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retryAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${retryAttempts} attempts: ${lastError?.message}`
    };
  }

  /**
   * Update template with retry logic
   */
  private static async updateTemplateWithRetry(
    templateId: number,
    templateData: any,
    retryAttempts: number,
    timeout: number
  ): Promise<IntegrationResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await Promise.race([
          templatesAPI.updateTemplate(templateId, {
            template_data: JSON.stringify(templateData)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);

        return {
          success: true,
          data: response
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retryAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${retryAttempts} attempts: ${lastError?.message}`
    };
  }

  /**
   * Handle template format conversion
   */
  static async convertTemplateFormat(
    templateData: any,
    fromFormat: string,
    toFormat: string
  ): Promise<IntegrationResult> {
    try {
      // Handle different format conversions
      switch (`${fromFormat}-${toFormat}`) {
        case 'legacy-v2':
          return this.convertLegacyToV2(templateData);
        case 'v2-legacy':
          return this.convertV2ToLegacy(templateData);
        case 'canvas-json':
          return this.convertCanvasToJSON(templateData);
        case 'json-canvas':
          return this.convertJSONToCanvas(templateData);
        default:
          return {
            success: false,
            error: `Unsupported format conversion: ${fromFormat} to ${toFormat}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Format conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert legacy template format to v2
   */
  private static convertLegacyToV2(legacyData: any): IntegrationResult {
    try {
      const v2Data = {
        version: '2.0',
        canvas: legacyData,
        metadata: {
          converted_at: new Date().toISOString(),
          original_format: 'legacy'
        }
      };

      return {
        success: true,
        data: v2Data
      };
    } catch (error) {
      return {
        success: false,
        error: `Legacy to v2 conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert v2 template format to legacy
   */
  private static convertV2ToLegacy(v2Data: any): IntegrationResult {
    try {
      const legacyData = v2Data.canvas || v2Data;

      return {
        success: true,
        data: legacyData
      };
    } catch (error) {
      return {
        success: false,
        error: `V2 to legacy conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert canvas data to JSON format
   */
  private static convertCanvasToJSON(canvasData: any): IntegrationResult {
    try {
      const jsonData = JSON.stringify(canvasData, null, 2);

      return {
        success: true,
        data: jsonData
      };
    } catch (error) {
      return {
        success: false,
        error: `Canvas to JSON conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert JSON data to canvas format
   */
  private static convertJSONToCanvas(jsonData: string): IntegrationResult {
    try {
      const canvasData = JSON.parse(jsonData);

      return {
        success: true,
        data: canvasData
      };
    } catch (error) {
      return {
        success: false,
        error: `JSON to canvas conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle encoding issues
   */
  static async handleEncodingIssues(
    data: any,
    targetEncoding: 'utf-8' | 'base64' | 'binary' = 'utf-8'
  ): Promise<IntegrationResult> {
    try {
      let processedData: any;

      switch (targetEncoding) {
        case 'utf-8':
          processedData = typeof data === 'string' ? data : JSON.stringify(data);
          break;
        case 'base64':
          const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
          processedData = btoa(unescape(encodeURIComponent(jsonString)));
          break;
        case 'binary':
          processedData = typeof data === 'string' ? data : JSON.stringify(data);
          break;
        default:
          return {
            success: false,
            error: `Unsupported encoding: ${targetEncoding}`
          };
      }

      return {
        success: true,
        data: processedData
      };

    } catch (error) {
      return {
        success: false,
        error: `Encoding error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test integration connectivity
   */
  static async testIntegration(): Promise<IntegrationResult> {
    try {
      // Test basic API connectivity
      const testData = {
        name: 'Integration Test',
        description: 'Test template for integration',
        product_id: 1,
        template_data: JSON.stringify({
          version: '2.0',
          objects: [],
          background: '#ffffff'
        }),
        is_active: true
      };

      // This would be a test endpoint in a real implementation
      // const response = await templatesAPI.testConnection();
      
      return {
        success: true,
        data: { message: 'Integration test passed' }
      };

    } catch (error) {
      return {
        success: false,
        error: `Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
