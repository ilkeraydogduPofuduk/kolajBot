/**
 * Image Processing Service
 * Handles image manipulation, collage generation, and optimization
 * @module services/image-processing
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { AppError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Image Processing Service Class
 */
class ImageProcessingService {
  constructor() {
    this.outputDir = process.env.COLLAGE_OUTPUT_DIR || './storage/collages';
    this.maxImageSize = 10 * 1024 * 1024; // 10MB
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp'];

    // Collage layout configurations
    this.layouts = {
      grid_2x2: { rows: 2, cols: 2, padding: 10 },
      grid_3x3: { rows: 3, cols: 3, padding: 10 },
      grid_4x4: { rows: 4, cols: 4, padding: 8 },
      horizontal_strip: { rows: 1, cols: 4, padding: 5 },
      vertical_strip: { rows: 4, cols: 1, padding: 5 },
      magazine: { custom: true } // Custom layout with varying sizes
    };

    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      Logger.error('Failed to create collage output directory', error);
    }
  }

  /**
   * Validate image file
   * @param {Buffer} buffer - Image buffer
   * @param {string} filename - Original filename
   * @returns {Promise<Object>} Image metadata
   */
  async validateImage(buffer, filename) {
    try {
      const metadata = await sharp(buffer).metadata();

      if (!this.supportedFormats.includes(metadata.format)) {
        throw new AppError(`Unsupported image format: ${metadata.format}`, 400);
      }

      if (buffer.length > this.maxImageSize) {
        throw new AppError('Image size exceeds maximum allowed size', 400);
      }

      return metadata;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Invalid image file: ${filename}`, 400);
    }
  }

  /**
   * Optimize image for web
   * @param {Buffer|string} input - Image buffer or path
   * @param {Object} options - Optimization options
   * @returns {Promise<Buffer>} Optimized image buffer
   */
  async optimizeImage(input, options = {}) {
    const {
      width = null,
      height = null,
      quality = 85,
      format = 'jpeg',
      fit = 'cover'
    } = options;

    try {
      let pipeline = sharp(input);

      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
      }

      if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      } else if (format === 'png') {
        pipeline = pipeline.png({ quality, compressionLevel: 9 });
      } else if (format === 'webp') {
        pipeline = pipeline.webp({ quality });
      }

      return await pipeline.toBuffer();
    } catch (error) {
      Logger.error('Image optimization failed', error);
      throw new AppError('Failed to optimize image', 500);
    }
  }

  /**
   * Create collage from multiple images
   * @param {Array<string|Buffer>} images - Array of image paths or buffers
   * @param {Object} options - Collage options
   * @returns {Promise<Object>} Collage result with buffer and metadata
   */
  async createCollage(images, options = {}) {
    const {
      layout = 'grid_2x2',
      width = 1200,
      height = 1200,
      backgroundColor = '#FFFFFF',
      padding = 10,
      quality = 90,
      format = 'jpeg',
      addBranding = true,
      brandLogo = null,
      watermark = null
    } = options;

    try {
      if (!images || images.length === 0) {
        throw new AppError('No images provided for collage', 400);
      }

      Logger.info(`Creating collage with ${images.length} images using ${layout} layout`);

      const layoutConfig = this.layouts[layout];
      if (!layoutConfig) {
        throw new AppError(`Unknown layout: ${layout}`, 400);
      }

      // Load and process all images
      const processedImages = await this.loadAndResizeImages(images, {
        layout: layoutConfig,
        totalWidth: width,
        totalHeight: height,
        padding
      });

      // Create composite based on layout
      let compositeOperations;
      if (layoutConfig.custom) {
        compositeOperations = await this.createMagazineLayout(processedImages, width, height, padding);
      } else {
        compositeOperations = this.createGridLayout(processedImages, layoutConfig, width, height, padding);
      }

      // Create base canvas
      let collage = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: backgroundColor
        }
      }).composite(compositeOperations);

      // Add watermark if provided
      if (watermark) {
        collage = await this.addWatermark(collage, watermark, width, height);
      }

      // Add branding if enabled
      if (addBranding && brandLogo) {
        collage = await this.addBrandLogo(collage, brandLogo, width, height);
      }

      // Convert to final format
      const buffer = await collage[format]({ quality }).toBuffer();

      const metadata = await sharp(buffer).metadata();

      Logger.info(`Collage created successfully: ${metadata.width}x${metadata.height}, ${(buffer.length / 1024).toFixed(2)}KB`);

      return {
        buffer,
        metadata,
        filename: `collage_${Date.now()}.${format}`,
        size: buffer.length
      };
    } catch (error) {
      Logger.error('Collage creation failed', error);
      throw error instanceof AppError ? error : new AppError('Failed to create collage', 500);
    }
  }

  /**
   * Load and resize images for collage
   * @private
   */
  async loadAndResizeImages(images, config) {
    const { layout, totalWidth, totalHeight, padding } = config;
    const cellWidth = Math.floor((totalWidth - (layout.cols + 1) * padding) / layout.cols);
    const cellHeight = Math.floor((totalHeight - (layout.rows + 1) * padding) / layout.rows);

    const processed = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const buffer = await sharp(images[i])
          .resize(cellWidth, cellHeight, { fit: 'cover' })
          .toBuffer();

        processed.push(buffer);
      } catch (error) {
        Logger.error(`Failed to process image ${i}`, error);
        // Continue with other images
      }
    }

    return processed;
  }

  /**
   * Create grid layout composite operations
   * @private
   */
  createGridLayout(images, layout, totalWidth, totalHeight, padding) {
    const { rows, cols } = layout;
    const cellWidth = Math.floor((totalWidth - (cols + 1) * padding) / cols);
    const cellHeight = Math.floor((totalHeight - (rows + 1) * padding) / rows);

    const composites = [];
    let imageIndex = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (imageIndex >= images.length) break;

        const left = padding + col * (cellWidth + padding);
        const top = padding + row * (cellHeight + padding);

        composites.push({
          input: images[imageIndex],
          left,
          top
        });

        imageIndex++;
      }
    }

    return composites;
  }

  /**
   * Create magazine-style layout with varying image sizes
   * @private
   */
  async createMagazineLayout(images, width, height, padding) {
    // Magazine layout: 1 large image on left, 3 smaller on right
    const composites = [];

    if (images.length === 0) return composites;

    // Large image on left (60% width, full height)
    const largeWidth = Math.floor(width * 0.6 - padding * 1.5);
    const largeHeight = height - padding * 2;

    const largeImage = await sharp(images[0])
      .resize(largeWidth, largeHeight, { fit: 'cover' })
      .toBuffer();

    composites.push({
      input: largeImage,
      left: padding,
      top: padding
    });

    // Small images on right (40% width, split into 3)
    const smallWidth = Math.floor(width * 0.4 - padding * 1.5);
    const smallHeight = Math.floor((height - padding * 4) / 3);

    for (let i = 1; i < Math.min(images.length, 4); i++) {
      const smallImage = await sharp(images[i])
        .resize(smallWidth, smallHeight, { fit: 'cover' })
        .toBuffer();

      composites.push({
        input: smallImage,
        left: largeWidth + padding * 2,
        top: padding + (i - 1) * (smallHeight + padding)
      });
    }

    return composites;
  }

  /**
   * Add watermark to collage
   * @private
   */
  async addWatermark(collage, watermarkText, width, height) {
    // Create SVG watermark
    const watermarkSvg = Buffer.from(`
      <svg width="${width}" height="${height}">
        <text x="50%" y="95%"
              font-family="Arial"
              font-size="20"
              fill="white"
              fill-opacity="0.5"
              text-anchor="middle">
          ${watermarkText}
        </text>
      </svg>
    `);

    const watermarkBuffer = await sharp(watermarkSvg).png().toBuffer();

    return collage.composite([{
      input: watermarkBuffer,
      blend: 'over'
    }]);
  }

  /**
   * Add brand logo to collage
   * @private
   */
  async addBrandLogo(collage, logoPath, width, height) {
    try {
      // Resize logo to fit in corner (max 150x150)
      const logoBuffer = await sharp(logoPath)
        .resize(150, 150, { fit: 'inside' })
        .toBuffer();

      return collage.composite([{
        input: logoBuffer,
        left: width - 170,
        top: 20,
        blend: 'over'
      }]);
    } catch (error) {
      Logger.error('Failed to add brand logo', error);
      return collage; // Return without logo if failed
    }
  }

  /**
   * Extract dominant colors from image
   * @param {Buffer|string} input - Image buffer or path
   * @param {number} count - Number of colors to extract
   * @returns {Promise<Array<string>>} Array of hex color codes
   */
  async extractColors(input, count = 5) {
    try {
      const { dominant } = await sharp(input).stats();

      // Convert RGB to hex
      const toHex = (r, g, b) => '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');

      return [toHex(dominant.r, dominant.g, dominant.b)];
    } catch (error) {
      Logger.error('Color extraction failed', error);
      return ['#000000'];
    }
  }

  /**
   * Crop image to specific region
   * @param {Buffer|string} input - Image buffer or path
   * @param {Object} region - Crop region {left, top, width, height}
   * @returns {Promise<Buffer>} Cropped image buffer
   */
  async cropImage(input, region) {
    try {
      return await sharp(input)
        .extract(region)
        .toBuffer();
    } catch (error) {
      Logger.error('Image crop failed', error);
      throw new AppError('Failed to crop image', 500);
    }
  }

  /**
   * Add text overlay to image
   * @param {Buffer|string} input - Image buffer or path
   * @param {Object} options - Text options
   * @returns {Promise<Buffer>} Image with text overlay
   */
  async addTextOverlay(input, options = {}) {
    const {
      text,
      x = 50,
      y = 50,
      fontSize = 32,
      color = 'white',
      anchor = 'start'
    } = options;

    try {
      const metadata = await sharp(input).metadata();

      const textSvg = Buffer.from(`
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="${x}" y="${y}"
                font-family="Arial"
                font-size="${fontSize}"
                font-weight="bold"
                fill="${color}"
                text-anchor="${anchor}">
            ${text}
          </text>
        </svg>
      `);

      return await sharp(input)
        .composite([{
          input: textSvg,
          blend: 'over'
        }])
        .toBuffer();
    } catch (error) {
      Logger.error('Text overlay failed', error);
      throw new AppError('Failed to add text overlay', 500);
    }
  }

  /**
   * Save collage to disk
   * @param {Buffer} buffer - Collage buffer
   * @param {string} filename - Output filename
   * @returns {Promise<string>} File path
   */
  async saveCollage(buffer, filename) {
    try {
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, buffer);
      Logger.info(`Collage saved to ${filePath}`);
      return filePath;
    } catch (error) {
      Logger.error('Failed to save collage', error);
      throw new AppError('Failed to save collage', 500);
    }
  }
}

export default new ImageProcessingService();
