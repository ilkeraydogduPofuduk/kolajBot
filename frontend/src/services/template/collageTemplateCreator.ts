import * as fabric from 'fabric';

export interface CollageTemplateConfig {
  width: number;
  height: number;
  backgroundColor: string;
  brandName: string;
  productCode: string;
  productColor: string;
  productType?: string;
  sizeRange?: string;
  price?: number;
  images: string[];
  showNewBadge?: boolean;
  showPrice?: boolean;
  showBrand?: boolean;
  layout?: 'grid' | 'single' | 'mixed';
  style?: 'modern' | 'minimal' | 'luxury' | 'creative';
}

export class CollageTemplateCreator {
  private canvas: fabric.Canvas;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Create a professional collage template based on the sample designs
   */
  async createCollageTemplate(config: CollageTemplateConfig): Promise<void> {
    // Clear canvas
    this.canvas.clear();
    this.canvas.setWidth(config.width);
    this.canvas.setHeight(config.height);

    // Set background
    await this.createGradientBackground(config.backgroundColor);

    // Add brand header
    if (config.showBrand) {
      await this.addBrandHeader(config.brandName);
    }

    // Add NEW badge
    if (config.showNewBadge) {
      await this.addNewBadge();
    }

    // Add product images
    await this.addProductImages(config.images, config.layout || 'grid');

    // Add logo box
    await this.addLogoBox(config.brandName);

    // Add product information
    await this.addProductInfo({
      code: config.productCode,
      color: config.productColor,
      type: config.productType,
      size: config.sizeRange,
      price: config.price,
      showPrice: config.showPrice
    });

    // Render canvas
    this.canvas.renderAll();
  }

  /**
   * Create gradient background similar to sample designs
   */
  private async createGradientBackground(baseColor: string): Promise<void> {
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: {
        x1: 0,
        y1: 0,
        x2: 0,
        y2: this.canvas.getHeight()
      },
      colorStops: [
        { offset: 0, color: this.lightenColor(baseColor, 0.1) },
        { offset: 1, color: baseColor }
      ]
    });

    const background = new fabric.Rect({
      left: 0,
      top: 0,
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight(),
      fill: gradient,
      selectable: false,
      evented: false
    });

    this.canvas.add(background);
    this.canvas.sendObjectToBack(background);
  }

  /**
   * Add brand header at the top
   */
  private async addBrandHeader(brandName: string): Promise<void> {
    const headerText = new fabric.Textbox(brandName.toUpperCase(), {
      left: this.canvas.getWidth() / 2,
      top: 60,
      width: this.canvas.getWidth() - 120,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#96785a',
      textAlign: 'center',
      selectable: true,
      editable: true
    });

    this.canvas.add(headerText);
  }

  /**
   * Add NEW badge in top right corner
   */
  private async addNewBadge(): Promise<void> {
    const badge = new fabric.Rect({
      left: this.canvas.getWidth() - 120,
      top: 20,
      width: 80,
      height: 40,
      fill: '#9632a8',
      rx: 20,
      ry: 20,
      selectable: true
    });

    const badgeText = new fabric.Textbox('NEW!', {
      left: this.canvas.getWidth() - 120,
      top: 20,
      width: 80,
      height: 40,
      fontSize: 16,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      selectable: false,
      evented: false
    });

    this.canvas.add(badge);
    this.canvas.add(badgeText);
  }

  /**
   * Add product images in various layouts
   */
  private async addProductImages(images: string[], layout: 'grid' | 'single' | 'mixed'): Promise<void> {
    if (images.length === 0) {
      // Add placeholder grid
      await this.addPlaceholderGrid();
      return;
    }

    switch (layout) {
      case 'grid':
        await this.addGridLayout(images);
        break;
      case 'single':
        await this.addSingleLayout(images[0]);
        break;
      case 'mixed':
        await this.addMixedLayout(images);
        break;
    }
  }

  /**
   * Add grid layout for multiple images
   */
  private async addGridLayout(images: string[]): Promise<void> {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const imageSize = Math.min(canvasWidth * 0.3, canvasHeight * 0.3);
    const spacing = 20;

    // Calculate grid positions
    const positions = [
      { x: centerX - imageSize/2 - spacing, y: centerY - imageSize/2 - spacing },
      { x: centerX + imageSize/2 + spacing, y: centerY - imageSize/2 - spacing },
      { x: centerX - imageSize/2 - spacing, y: centerY + imageSize/2 + spacing },
      { x: centerX + imageSize/2 + spacing, y: centerY + imageSize/2 + spacing }
    ];

    for (let i = 0; i < Math.min(images.length, 4); i++) {
      await this.addImageAtPosition(images[i], positions[i].x, positions[i].y, imageSize);
    }
  }

  /**
   * Add single large image
   */
  private async addSingleLayout(imageUrl: string): Promise<void> {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const imageSize = Math.min(canvasWidth * 0.6, canvasHeight * 0.6);
    await this.addImageAtPosition(imageUrl, centerX - imageSize/2, centerY - imageSize/2, imageSize);
  }

  /**
   * Add mixed layout (1 large + 2 small)
   */
  private async addMixedLayout(images: string[]): Promise<void> {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    if (images.length >= 1) {
      // Large image on the left
      const largeSize = Math.min(canvasWidth * 0.4, canvasHeight * 0.6);
      await this.addImageAtPosition(images[0], 50, centerY - largeSize/2, largeSize);
    }

    if (images.length >= 2) {
      // Small images on the right
      const smallSize = Math.min(canvasWidth * 0.25, canvasHeight * 0.25);
      const rightX = canvasWidth - smallSize - 50;
      
      await this.addImageAtPosition(images[1], rightX, centerY - smallSize - 10, smallSize);
      
      if (images.length >= 3) {
        await this.addImageAtPosition(images[2], rightX, centerY + 10, smallSize);
      }
    }
  }

  /**
   * Add image at specific position
   */
  private async addImageAtPosition(imageUrl: string, x: number, y: number, size: number): Promise<void> {
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      }).then((img: fabric.Image) => {
        if (!img) {
          reject(new Error('Failed to load image'));
          return;
        }

        // Calculate scale to fit the desired size
        const scale = Math.min(size / (img.width || 1), size / (img.height || 1));
        
        img.set({
          left: x,
          top: y,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          cornerStyle: 'circle',
          cornerColor: '#007bff',
          cornerSize: 10,
          transparentCorners: false
        });

        this.canvas.add(img);
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });
  }

  /**
   * Add placeholder grid when no images are available
   */
  private async addPlaceholderGrid(): Promise<void> {
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const placeholderSize = Math.min(canvasWidth * 0.3, canvasHeight * 0.3);
    const spacing = 20;

    const positions = [
      { x: centerX - placeholderSize/2 - spacing, y: centerY - placeholderSize/2 - spacing },
      { x: centerX + placeholderSize/2 + spacing, y: centerY - placeholderSize/2 - spacing },
      { x: centerX - placeholderSize/2 - spacing, y: centerY + placeholderSize/2 + spacing },
      { x: centerX + placeholderSize/2 + spacing, y: centerY + placeholderSize/2 + spacing }
    ];

    positions.forEach((pos, index) => {
      const placeholder = new fabric.Rect({
        left: pos.x,
        top: pos.y,
        width: placeholderSize,
        height: placeholderSize,
        fill: '#e5e7eb',
        stroke: '#d1d5db',
        strokeWidth: 2,
        rx: 15,
        ry: 15,
        selectable: true
      });

      const placeholderText = new fabric.Textbox(`Görsel ${index + 1}`, {
        left: pos.x,
        top: pos.y,
        width: placeholderSize,
        height: placeholderSize,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: '#9ca3af',
        textAlign: 'center',
        selectable: false,
        evented: false
      });

      this.canvas.add(placeholder);
      this.canvas.add(placeholderText);
    });
  }

  /**
   * Add logo box in bottom left
   */
  private async addLogoBox(brandName: string): Promise<void> {
    const logoBox = new fabric.Rect({
      left: 20,
      top: this.canvas.getHeight() - 200,
      width: 180,
      height: 120,
      fill: '#ffffff',
      stroke: '#c8c8c8',
      strokeWidth: 3,
      rx: 20,
      ry: 20,
      selectable: true
    });

    // Determine logo text based on brand
    const logoText = this.getLogoText(brandName);

    const logoTextObj = new fabric.Textbox(logoText, {
      left: 20,
      top: this.canvas.getHeight() - 200,
      width: 180,
      height: 120,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#323232',
      textAlign: 'center',
      selectable: false,
      evented: false
    });

    this.canvas.add(logoBox);
    this.canvas.add(logoTextObj);
  }

  /**
   * Add product information in bottom right
   */
  private async addProductInfo(info: {
    code: string;
    color: string;
    type?: string;
    size?: string;
    price?: number;
    showPrice?: boolean;
  }): Promise<void> {
    const startX = this.canvas.getWidth() - 300;
    const startY = this.canvas.getHeight() - 200;

    // Product code
    const codeText = new fabric.Textbox(info.code, {
      left: startX,
      top: startY,
      width: 280,
      fontSize: 24,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#323232',
      selectable: true,
      editable: true
    });

    this.canvas.add(codeText);

    // Color
    const colorText = new fabric.Textbox(info.color, {
      left: startX,
      top: startY + 40,
      width: 280,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#323232',
      selectable: true,
      editable: true
    });

    this.canvas.add(colorText);

    // Product type
    if (info.type) {
      const typeText = new fabric.Textbox(info.type, {
        left: startX,
        top: startY + 80,
        width: 280,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#323232',
        selectable: true,
        editable: true
      });

      this.canvas.add(typeText);
    }

    // Size
    if (info.size) {
      const sizeText = new fabric.Textbox(info.size, {
        left: startX,
        top: startY + 120,
        width: 280,
        fontSize: 18,
        fontFamily: 'Arial',
        fill: '#323232',
        selectable: true,
        editable: true
      });

      this.canvas.add(sizeText);
    }

    // Price badge
    if (info.showPrice && info.price) {
      const priceBadge = new fabric.Rect({
        left: startX,
        top: startY + 160,
        width: 100,
        height: 30,
        fill: '#96785a',
        rx: 15,
        ry: 15,
        selectable: true
      });

      const priceText = new fabric.Textbox(`$${info.price}`, {
        left: startX,
        top: startY + 160,
        width: 100,
        height: 30,
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'center',
        selectable: false,
        evented: false
      });

      this.canvas.add(priceBadge);
      this.canvas.add(priceText);
    }
  }

  /**
   * Get logo text based on brand name
   */
  private getLogoText(brandName: string): string {
    const brandLower = brandName.toLowerCase();
    
    if (brandLower.includes('kokart')) return 'kokART';
    if (brandLower.includes('lilium')) return 'LİLİUM';
    if (brandLower.includes('my8')) return 'my8-design';
    if (brandLower.includes('dizayn')) return 'kokART';
    
    return brandName.substring(0, 8).toUpperCase();
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = ((num >> 8) & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Export canvas as image
   */
  exportAsImage(): string {
    return this.canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });
  }

  /**
   * Get canvas JSON data
   */
  getCanvasData(): any {
    return this.canvas.toJSON();
  }

  /**
   * Load canvas from JSON data
   */
  loadFromData(data: any): void {
    this.canvas.loadFromJSON(data, () => {
      this.canvas.renderAll();
    });
  }
}
