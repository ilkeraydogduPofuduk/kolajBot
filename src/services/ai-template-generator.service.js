/**
 * AI Template Generator Service
 * Automatically generates collage templates for different social media platforms
 * @module services/ai-template-generator
 */

import ImageProcessingService from './image-processing.service.js';
import OCRService from './ocr.service.js';
import TemplateModel from '../models/template.model.js';
import ProductModel from '../models/product.model.js';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * AI Template Generator Service Class
 */
class AITemplateGeneratorService {
  constructor() {
    // Platform-specific configurations
    this.platformConfigs = {
      whatsapp: {
        name: 'WhatsApp',
        dimensions: { width: 1080, height: 1080 },
        maxProducts: 9,
        layouts: ['grid_3x3', 'grid_2x2', 'magazine'],
        features: ['price_overlay', 'brand_watermark', 'contact_info'],
        colorScheme: {
          background: '#128C7E',
          text: '#FFFFFF',
          accent: '#25D366'
        }
      },
      telegram: {
        name: 'Telegram',
        dimensions: { width: 1280, height: 1280 },
        maxProducts: 12,
        layouts: ['grid_4x4', 'grid_3x3', 'magazine'],
        features: ['price_overlay', 'brand_watermark', 'channel_link'],
        colorScheme: {
          background: '#0088cc',
          text: '#FFFFFF',
          accent: '#64B5F6'
        }
      },
      instagram: {
        name: 'Instagram',
        dimensions: { width: 1080, height: 1350 },
        maxProducts: 6,
        layouts: ['grid_3x3', 'grid_2x2', 'magazine'],
        features: ['hashtags', 'brand_logo', 'story_ready'],
        colorScheme: {
          background: '#E1306C',
          text: '#FFFFFF',
          accent: '#F77737'
        }
      },
      facebook: {
        name: 'Facebook',
        dimensions: { width: 1200, height: 630 },
        maxProducts: 4,
        layouts: ['horizontal_strip', 'grid_2x2'],
        features: ['price_overlay', 'call_to_action', 'brand_logo'],
        colorScheme: {
          background: '#1877F2',
          text: '#FFFFFF',
          accent: '#4267B2'
        }
      }
    };
  }

  /**
   * Generate template automatically from products
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated template and collage
   */
  async generateTemplate(options) {
    const {
      brandId,
      productIds = [],
      platform = 'whatsapp',
      layout = 'auto',
      customSettings = {}
    } = options;

    try {
      Logger.info(`Generating ${platform} template for brand ${brandId} with ${productIds.length} products`);

      // Validate platform
      if (!this.platformConfigs[platform]) {
        throw new AppError(`Unsupported platform: ${platform}`, 400);
      }

      const platformConfig = this.platformConfigs[platform];

      // Fetch products
      const products = await this.fetchProducts(productIds);
      if (products.length === 0) {
        throw new AppError('No valid products found', 400);
      }

      // Limit products based on platform
      const limitedProducts = products.slice(0, platformConfig.maxProducts);

      // Collect product images
      const productImages = await this.collectProductImages(limitedProducts);
      if (productImages.length === 0) {
        throw new AppError('No product images found', 400);
      }

      // Analyze images with OCR
      const analysisResults = await this.analyzeImages(productImages);

      // Determine best layout
      const selectedLayout = layout === 'auto'
        ? this.selectBestLayout(productImages.length, platformConfig)
        : layout;

      // Generate collage
      const collageOptions = {
        layout: selectedLayout,
        width: platformConfig.dimensions.width,
        height: platformConfig.dimensions.height,
        backgroundColor: platformConfig.colorScheme.background,
        ...customSettings
      };

      const collage = await ImageProcessingService.createCollage(
        productImages.map(p => p.buffer),
        collageOptions
      );

      // Extract template data
      const templateData = this.buildTemplateData(
        limitedProducts,
        analysisResults,
        platformConfig,
        selectedLayout
      );

      // Create template record
      const template = await TemplateModel.createTemplate({
        name: `Auto-generated ${platformConfig.name} Template`,
        platform,
        brand_id: brandId,
        template_type: 'auto_generated',
        dimensions: platformConfig.dimensions,
        layout: selectedLayout,
        template_data: templateData,
        settings: {
          ...collageOptions,
          features: platformConfig.features
        },
        is_active: true
      });

      Logger.info(`Template generated successfully: ${template.id}`);

      return {
        template,
        collage,
        products: limitedProducts,
        analysis: analysisResults,
        platformConfig
      };
    } catch (error) {
      Logger.error('Template generation failed', error);
      throw error instanceof AppError ? error : new AppError('Failed to generate template', 500);
    }
  }

  /**
   * Fetch products by IDs
   * @private
   */
  async fetchProducts(productIds) {
    const products = [];

    for (const id of productIds) {
      try {
        const product = await ProductModel.findById(id);
        if (product && product.is_active) {
          products.push(product);
        }
      } catch (error) {
        Logger.warn(`Failed to fetch product ${id}`, error);
      }
    }

    return products;
  }

  /**
   * Collect product images
   * @private
   */
  async collectProductImages(products) {
    const images = [];

    for (const product of products) {
      if (product.images && product.images.length > 0) {
        // Use first image of each product
        const imageUrl = Array.isArray(product.images) ? product.images[0] : product.images;

        try {
          // If it's a URL, fetch it; if it's a local path, read it
          let buffer;
          if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            const axios = (await import('axios')).default;
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
          } else {
            const fs = await import('fs/promises');
            buffer = await fs.readFile(imageUrl);
          }

          images.push({
            productId: product.id,
            productName: product.name,
            buffer,
            url: imageUrl
          });
        } catch (error) {
          Logger.warn(`Failed to load image for product ${product.id}`, error);
        }
      }
    }

    return images;
  }

  /**
   * Analyze images with OCR
   * @private
   */
  async analyzeImages(productImages) {
    const analysisResults = [];

    // Batch analyze for efficiency
    try {
      const results = await OCRService.batchAnalyze(
        productImages.map(img => img.buffer)
      );

      for (let i = 0; i < results.length; i++) {
        if (results[i].success) {
          analysisResults.push({
            productId: productImages[i].productId,
            ...results[i].data
          });
        } else {
          analysisResults.push({
            productId: productImages[i].productId,
            error: results[i].error
          });
        }
      }
    } catch (error) {
      Logger.error('Batch image analysis failed', error);
      // Continue without analysis
    }

    return analysisResults;
  }

  /**
   * Select best layout based on product count
   * @private
   */
  selectBestLayout(productCount, platformConfig) {
    const availableLayouts = platformConfig.layouts;

    if (productCount <= 4) {
      return availableLayouts.includes('grid_2x2') ? 'grid_2x2' : availableLayouts[0];
    } else if (productCount <= 6) {
      return availableLayouts.includes('magazine') ? 'magazine' : availableLayouts[0];
    } else if (productCount <= 9) {
      return availableLayouts.includes('grid_3x3') ? 'grid_3x3' : availableLayouts[0];
    } else {
      return availableLayouts.includes('grid_4x4') ? 'grid_4x4' : availableLayouts[0];
    }
  }

  /**
   * Build template data structure
   * @private
   */
  buildTemplateData(products, analysisResults, platformConfig, layout) {
    return {
      products: products.map(product => ({
        id: product.id,
        name: product.name,
        code: product.code,
        price: product.price,
        currency: product.currency,
        color: product.color,
        size_range: product.size_range
      })),
      analysis: analysisResults.map(result => ({
        productId: result.productId,
        detectedPrices: result.prices || [],
        detectedLabels: result.labels || [],
        detectedColors: result.text?.words?.length || 0
      })),
      layout: {
        type: layout,
        dimensions: platformConfig.dimensions
      },
      platform: {
        name: platformConfig.name,
        features: platformConfig.features,
        colorScheme: platformConfig.colorScheme
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Regenerate template with different settings
   * @param {number} templateId - Template ID
   * @param {Object} newSettings - New settings
   * @returns {Promise<Object>} Updated template
   */
  async regenerateTemplate(templateId, newSettings) {
    try {
      const template = await TemplateModel.findById(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      // Extract product IDs from template data
      const productIds = template.template_data.products.map(p => p.id);

      // Generate new template with new settings
      const result = await this.generateTemplate({
        brandId: template.brand_id,
        productIds,
        platform: template.platform,
        layout: newSettings.layout || template.layout,
        customSettings: newSettings
      });

      // Update existing template
      const updatedTemplate = await TemplateModel.update(templateId, {
        template_data: result.template.template_data,
        settings: result.template.settings,
        updated_at: new Date()
      });

      return {
        template: updatedTemplate,
        collage: result.collage
      };
    } catch (error) {
      Logger.error('Template regeneration failed', error);
      throw error instanceof AppError ? error : new AppError('Failed to regenerate template', 500);
    }
  }

  /**
   * Generate multiple templates for different platforms
   * @param {Object} options - Generation options
   * @returns {Promise<Array>} Array of generated templates
   */
  async generateMultiPlatformTemplates(options) {
    const {
      brandId,
      productIds,
      platforms = ['whatsapp', 'telegram', 'instagram']
    } = options;

    Logger.info(`Generating templates for ${platforms.length} platforms`);

    const results = await Promise.allSettled(
      platforms.map(platform =>
        this.generateTemplate({
          brandId,
          productIds,
          platform
        })
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          platform: platforms[index],
          success: true,
          data: result.value
        };
      } else {
        return {
          platform: platforms[index],
          success: false,
          error: result.reason.message
        };
      }
    });
  }

  /**
   * Get template suggestions based on brand and products
   * @param {number} brandId - Brand ID
   * @param {Array<number>} productIds - Product IDs
   * @returns {Promise<Object>} Template suggestions
   */
  async getTemplateSuggestions(brandId, productIds) {
    try {
      const products = await this.fetchProducts(productIds);
      const productImages = await this.collectProductImages(products);

      const suggestions = {};

      for (const [platform, config] of Object.entries(this.platformConfigs)) {
        const maxProducts = Math.min(productImages.length, config.maxProducts);
        const suggestedLayout = this.selectBestLayout(maxProducts, config);

        suggestions[platform] = {
          recommendedProducts: maxProducts,
          recommendedLayout: suggestedLayout,
          dimensions: config.dimensions,
          features: config.features,
          estimatedGenerationTime: maxProducts * 2 // seconds
        };
      }

      return suggestions;
    } catch (error) {
      Logger.error('Failed to get template suggestions', error);
      throw new AppError('Failed to get template suggestions', 500);
    }
  }

  /**
   * Apply custom branding to template
   * @param {number} templateId - Template ID
   * @param {Object} branding - Branding options
   * @returns {Promise<Object>} Updated template
   */
  async applyBranding(templateId, branding) {
    const {
      logo,
      watermark,
      colorScheme,
      fonts
    } = branding;

    try {
      const template = await TemplateModel.findById(templateId);
      if (!template) {
        throw new AppError('Template not found', 404);
      }

      // Update template settings with branding
      const updatedSettings = {
        ...template.settings,
        branding: {
          logo: logo || null,
          watermark: watermark || null,
          colorScheme: colorScheme || template.settings.colorScheme,
          fonts: fonts || {}
        }
      };

      const updatedTemplate = await TemplateModel.update(templateId, {
        settings: updatedSettings,
        updated_at: new Date()
      });

      Logger.info(`Branding applied to template ${templateId}`);

      return updatedTemplate;
    } catch (error) {
      Logger.error('Failed to apply branding', error);
      throw error instanceof AppError ? error : new AppError('Failed to apply branding', 500);
    }
  }
}

export default new AITemplateGeneratorService();
