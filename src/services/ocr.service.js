/**
 * OCR Service
 * Handles text extraction from images using Google Vision API
 * @module services/ocr
 */

import vision from '@google-cloud/vision';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * OCR Service Class for Text and Price Extraction
 */
class OCRService {
  constructor() {
    this.client = null;
    this.initialized = false;

    // Price pattern regex
    this.pricePatterns = [
      /\$\s*(\d{1,6}(?:[.,]\d{2})?)/g,           // $123.45
      /(\d{1,6}(?:[.,]\d{2})?)\s*USD/gi,         // 123.45 USD
      /(\d{1,6}(?:[.,]\d{2})?)\s*EUR/gi,         // 123.45 EUR
      /(\d{1,6}(?:[.,]\d{2})?)\s*TL/gi,          // 123.45 TL
      /₺\s*(\d{1,6}(?:[.,]\d{2})?)/g,            // ₺123.45
      /€\s*(\d{1,6}(?:[.,]\d{2})?)/g,            // €123.45
      /£\s*(\d{1,6}(?:[.,]\d{2})?)/g,            // £123.45
      /(\d{1,6}(?:[.,]\d{2})?)\s*(?:TRY|try)/gi  // 123.45 TRY
    ];

    this.initialize();
  }

  /**
   * Initialize Google Vision API client
   */
  async initialize() {
    try {
      // Check if credentials are provided
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const apiKey = process.env.GOOGLE_VISION_API_KEY;

      if (!credentialsPath && !apiKey) {
        Logger.warn('Google Vision API credentials not configured - OCR features will be disabled');
        return;
      }

      // Initialize client
      if (apiKey) {
        this.client = new vision.ImageAnnotatorClient({
          apiKey: apiKey
        });
      } else {
        this.client = new vision.ImageAnnotatorClient();
      }

      this.initialized = true;
      Logger.info('Google Vision API client initialized successfully');
    } catch (error) {
      Logger.error('Failed to initialize Google Vision API client', error);
      this.initialized = false;
    }
  }

  /**
   * Ensure client is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.initialized || !this.client) {
      throw new AppError('OCR service not initialized - check Google Vision API credentials', 500);
    }
  }

  /**
   * Extract all text from image
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<Object>} Extracted text and metadata
   */
  async extractText(image) {
    this.ensureInitialized();

    try {
      Logger.info('Extracting text from image using Google Vision API');

      const [result] = await this.client.textDetection(image);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return {
          fullText: '',
          words: [],
          confidence: 0
        };
      }

      // First annotation contains full text
      const fullText = detections[0].description;

      // Rest contain individual words with positions
      const words = detections.slice(1).map(word => ({
        text: word.description,
        confidence: word.confidence || 0,
        boundingBox: word.boundingPoly.vertices
      }));

      Logger.info(`Text extraction completed: ${words.length} words detected`);

      return {
        fullText,
        words,
        confidence: detections[0].confidence || 0
      };
    } catch (error) {
      Logger.error('Text extraction failed', error);
      throw new AppError('Failed to extract text from image', 500);
    }
  }

  /**
   * Extract prices from image
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<Array>} Array of detected prices
   */
  async extractPrices(image) {
    try {
      const { fullText, words } = await this.extractText(image);

      const prices = [];

      // Search full text for price patterns
      for (const pattern of this.pricePatterns) {
        const matches = fullText.matchAll(pattern);
        for (const match of matches) {
          const priceValue = match[1];
          if (priceValue) {
            prices.push({
              value: parseFloat(priceValue.replace(',', '.')),
              raw: match[0],
              currency: this.extractCurrency(match[0])
            });
          }
        }
      }

      // Remove duplicates
      const uniquePrices = this.deduplicatePrices(prices);

      Logger.info(`Price extraction completed: ${uniquePrices.length} prices detected`);

      return uniquePrices;
    } catch (error) {
      Logger.error('Price extraction failed', error);
      return [];
    }
  }

  /**
   * Extract currency from price string
   * @private
   */
  extractCurrency(priceString) {
    if (priceString.includes('$') || priceString.toUpperCase().includes('USD')) return 'USD';
    if (priceString.includes('€') || priceString.toUpperCase().includes('EUR')) return 'EUR';
    if (priceString.includes('₺') || priceString.toUpperCase().includes('TL') || priceString.toUpperCase().includes('TRY')) return 'TRY';
    if (priceString.includes('£') || priceString.toUpperCase().includes('GBP')) return 'GBP';
    return 'USD'; // Default
  }

  /**
   * Remove duplicate prices
   * @private
   */
  deduplicatePrices(prices) {
    const seen = new Map();

    for (const price of prices) {
      const key = `${price.value}_${price.currency}`;
      if (!seen.has(key)) {
        seen.set(key, price);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Detect labels/categories in image
   * @param {Buffer|string} image - Image buffer or path
   * @param {number} maxResults - Maximum number of labels to return
   * @returns {Promise<Array>} Array of detected labels
   */
  async detectLabels(image, maxResults = 10) {
    this.ensureInitialized();

    try {
      Logger.info('Detecting labels in image using Google Vision API');

      const [result] = await this.client.labelDetection(image);
      const labels = result.labelAnnotations;

      if (!labels || labels.length === 0) {
        return [];
      }

      const detectedLabels = labels.slice(0, maxResults).map(label => ({
        description: label.description,
        confidence: label.score,
        topicality: label.topicality || 0
      }));

      Logger.info(`Label detection completed: ${detectedLabels.length} labels detected`);

      return detectedLabels;
    } catch (error) {
      Logger.error('Label detection failed', error);
      return [];
    }
  }

  /**
   * Detect product information (combined text, prices, labels)
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<Object>} Comprehensive product information
   */
  async analyzeProductImage(image) {
    try {
      Logger.info('Analyzing product image for comprehensive information');

      // Run all detections in parallel
      const [textResult, prices, labels] = await Promise.all([
        this.extractText(image),
        this.extractPrices(image),
        this.detectLabels(image)
      ]);

      // Extract potential product attributes from text
      const attributes = this.extractProductAttributes(textResult.fullText);

      const result = {
        text: textResult,
        prices,
        labels,
        attributes,
        analyzedAt: new Date().toISOString()
      };

      Logger.info('Product image analysis completed');

      return result;
    } catch (error) {
      Logger.error('Product image analysis failed', error);
      throw new AppError('Failed to analyze product image', 500);
    }
  }

  /**
   * Extract product attributes from text (size, color, material, etc.)
   * @private
   */
  extractProductAttributes(text) {
    const attributes = {};

    // Size patterns
    const sizePatterns = [
      /\b(XS|S|M|L|XL|XXL|XXXL)\b/gi,
      /\b(\d{2,3}(?:\s*x\s*\d{2,3})?)\s*cm\b/gi,
      /\b(?:size|beden)[\s:]*(\d+(?:-\d+)?)\b/gi
    ];

    // Color patterns
    const colorPatterns = [
      /\b(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|beige)\b/gi,
      /\b(siyah|beyaz|kırmızı|mavi|yeşil|sarı|turuncu|mor|pembe|kahverengi|gri|bej)\b/gi
    ];

    // Material patterns
    const materialPatterns = [
      /\b(cotton|polyester|wool|silk|leather|denim|linen)\b/gi,
      /\b(pamuk|polyester|yün|ipek|deri|kot|keten)\b/gi
    ];

    // Extract sizes
    const sizes = new Set();
    for (const pattern of sizePatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        sizes.add(match[1].toUpperCase());
      }
    }
    if (sizes.size > 0) {
      attributes.sizes = Array.from(sizes);
    }

    // Extract colors
    const colors = new Set();
    for (const pattern of colorPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        colors.add(match[1].toLowerCase());
      }
    }
    if (colors.size > 0) {
      attributes.colors = Array.from(colors);
    }

    // Extract materials
    const materials = new Set();
    for (const pattern of materialPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        materials.add(match[1].toLowerCase());
      }
    }
    if (materials.size > 0) {
      attributes.materials = Array.from(materials);
    }

    return attributes;
  }

  /**
   * Detect if image contains a logo
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<Array>} Array of detected logos
   */
  async detectLogos(image) {
    this.ensureInitialized();

    try {
      Logger.info('Detecting logos in image');

      const [result] = await this.client.logoDetection(image);
      const logos = result.logoAnnotations;

      if (!logos || logos.length === 0) {
        return [];
      }

      const detectedLogos = logos.map(logo => ({
        description: logo.description,
        confidence: logo.score,
        boundingBox: logo.boundingPoly.vertices
      }));

      Logger.info(`Logo detection completed: ${detectedLogos.length} logos detected`);

      return detectedLogos;
    } catch (error) {
      Logger.error('Logo detection failed', error);
      return [];
    }
  }

  /**
   * Detect dominant colors in image
   * @param {Buffer|string} image - Image buffer or path
   * @returns {Promise<Array>} Array of dominant colors
   */
  async detectColors(image) {
    this.ensureInitialized();

    try {
      Logger.info('Detecting dominant colors in image');

      const [result] = await this.client.imageProperties(image);
      const colors = result.imagePropertiesAnnotation.dominantColors.colors;

      if (!colors || colors.length === 0) {
        return [];
      }

      const dominantColors = colors.map(color => ({
        color: {
          red: Math.round(color.color.red || 0),
          green: Math.round(color.color.green || 0),
          blue: Math.round(color.color.blue || 0)
        },
        hex: this.rgbToHex(
          Math.round(color.color.red || 0),
          Math.round(color.color.green || 0),
          Math.round(color.color.blue || 0)
        ),
        score: color.score,
        pixelFraction: color.pixelFraction
      }));

      Logger.info(`Color detection completed: ${dominantColors.length} colors detected`);

      return dominantColors;
    } catch (error) {
      Logger.error('Color detection failed', error);
      return [];
    }
  }

  /**
   * Convert RGB to hex
   * @private
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Batch process multiple images
   * @param {Array<Buffer|string>} images - Array of images
   * @returns {Promise<Array>} Array of analysis results
   */
  async batchAnalyze(images) {
    Logger.info(`Starting batch OCR analysis of ${images.length} images`);

    const results = await Promise.allSettled(
      images.map(image => this.analyzeProductImage(image))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          index,
          success: true,
          data: result.value
        };
      } else {
        return {
          index,
          success: false,
          error: result.reason.message
        };
      }
    });
  }
}

export default new OCRService();
