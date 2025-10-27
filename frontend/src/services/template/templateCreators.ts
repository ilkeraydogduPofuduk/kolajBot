import { Canvas, FabricImage, Textbox, Rect, Shadow } from 'fabric';
import { toast } from 'react-hot-toast';
import { Product } from '../../api/products';
import { config } from '../../core/config';

const API_BASE_URL = config.app.backendUrl;

interface TemplateConfig {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  brandName: string;
  fontSize: {
    brand: number;
    product: number;
    price: number;
    description: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
}

class TemplateCreator {
  private config: TemplateConfig;

  constructor() {
    this.config = {
      canvasWidth: 700,
      canvasHeight: 900,
      backgroundColor: '#f8fafc',
      brandName: 'DIZAYN BRANDS',
      fontSize: {
        brand: 32,
        product: 24,
        price: 20,
        description: 16
      },
      colors: {
        primary: '#1f2937',
        secondary: '#3b82f6',
        text: '#374151',
        background: '#f8fafc'
      }
    };
  }

  private getImageURL(filePath: string): string {
    if (!filePath) return '';
    const cleanPath = filePath.replace(/\\/g, '/');
    const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
    return `${API_BASE_URL}/${finalPath}`;
  }

  private createBrandHeader(canvas: Canvas): Textbox {
    return new Textbox(this.config.brandName, {
      left: this.config.canvasWidth / 2,
      top: 80,
      fontSize: this.config.fontSize.brand,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: this.config.colors.primary,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      width: this.config.canvasWidth - 40,
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.1)',
        blur: 4,
        offsetX: 2,
        offsetY: 2
      })
    });
  }

  private createProductImage(canvas: Canvas, imageUrl: string): Promise<FabricImage> {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img: any) => {
        if (img) {
          img.set({
            left: this.config.canvasWidth / 2,
            top: 200,
            originX: 'center',
            originY: 'center',
            scaleX: 0.8,
            scaleY: 0.8,
            shadow: new Shadow({
              color: 'rgba(0,0,0,0.2)',
              blur: 8,
              offsetX: 4,
              offsetY: 4
            })
          });
          resolve(img);
        } else {
          reject(new Error('Failed to load image'));
        }
      }).catch((error: any) => {
        reject(error);
      });
    });
  }

  private createProductInfo(canvas: Canvas, product: Product): Textbox[] {
    const elements: Textbox[] = [];

    // Product Code
    if (product.code) {
      const codeElement = new Textbox(`Ürün Kodu: ${product.code}`, {
        left: this.config.canvasWidth / 2,
        top: 500,
        fontSize: this.config.fontSize.product,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: this.config.colors.secondary,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40
      });
      elements.push(codeElement);
    }

    // Product Name
    if (product.name) {
      const nameElement = new Textbox(product.name, {
        left: this.config.canvasWidth / 2,
        top: 540,
        fontSize: this.config.fontSize.product,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: this.config.colors.primary,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40
      });
      elements.push(nameElement);
    }

    // Color
    if (product.color) {
      const colorElement = new Textbox(`Renk: ${product.color}`, {
        left: this.config.canvasWidth / 2,
        top: 580,
        fontSize: this.config.fontSize.description,
        fontFamily: 'Arial, sans-serif',
        fill: this.config.colors.text,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40
      });
      elements.push(colorElement);
    }

    return elements;
  }

  private createFooter(canvas: Canvas): Rect {
    return new Rect({
      left: 0,
      top: this.config.canvasHeight - 60,
      width: this.config.canvasWidth,
      height: 60,
      fill: this.config.colors.primary,
      originX: 'left',
      originY: 'top'
    });
  }

  private createFooterText(canvas: Canvas): Textbox {
    return new Textbox('Kaliteli ve Güvenilir Alışveriş', {
      left: this.config.canvasWidth / 2,
      top: this.config.canvasHeight - 30,
      fontSize: this.config.fontSize.description,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      width: this.config.canvasWidth - 40
    });
  }

  async createStandardTemplate(canvas: Canvas, product: Product): Promise<void> {
    try {
      console.log('Creating standard template for product:', product.code);

      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = this.config.backgroundColor;

      // Get product images
      const productImages = (product.images || []).filter(
        img => img.image_type === 'product' || img.image_type === 'photo'
      );

      if (productImages.length === 0) {
        toast.error('Ürüne ait görsel bulunamadı');
        return;
      }

      // Create elements
      const brandHeader = this.createBrandHeader(canvas);
      canvas.add(brandHeader);

      // Add product image
      const imageUrl = this.getImageURL(productImages[0].file_path);
      const productImage = await this.createProductImage(canvas, imageUrl);
      canvas.add(productImage);

      // Add product info
      const productInfoElements = this.createProductInfo(canvas, product);
      productInfoElements.forEach(element => canvas.add(element));

      // Add footer
      const footer = this.createFooter(canvas);
      canvas.add(footer);

      const footerText = this.createFooterText(canvas);
      canvas.add(footerText);

      // Render
      canvas.renderAll();
      toast.success('Şablon oluşturuldu');

    } catch (error) {
      console.error('Template creation error:', error);
      toast.error('Şablon oluşturulurken hata oluştu');
    }
  }

  async createMinimalTemplate(canvas: Canvas, product: Product): Promise<void> {
    try {
      console.log('Creating minimal template for product:', product.code);

      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = '#ffffff';

      // Get product images
      const productImages = (product.images || []).filter(
        img => img.image_type === 'product' || img.image_type === 'photo'
      );

      if (productImages.length === 0) {
        toast.error('Ürüne ait görsel bulunamadı');
        return;
      }

      // Create minimal elements
      const brandHeader = new Textbox(this.config.brandName, {
        left: this.config.canvasWidth / 2,
        top: 50,
        fontSize: 28,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: this.config.colors.primary,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40
      });
      canvas.add(brandHeader);

      // Add product image
      const imageUrl = this.getImageURL(productImages[0].file_path);
      const productImage = await this.createProductImage(canvas, imageUrl);
      canvas.add(productImage);

      // Add product code
      if (product.code) {
        const codeElement = new Textbox(product.code, {
          left: this.config.canvasWidth / 2,
          top: 600,
          fontSize: 20,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fill: this.config.colors.secondary,
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          width: this.config.canvasWidth - 40
        });
        canvas.add(codeElement);
      }

      // Render
      canvas.renderAll();
      toast.success('Minimal şablon oluşturuldu');

    } catch (error) {
      console.error('Minimal template creation error:', error);
      toast.error('Minimal şablon oluşturulurken hata oluştu');
    }
  }

  async createLuxuryTemplate(canvas: Canvas, product: Product): Promise<void> {
    try {
      console.log('Creating luxury template for product:', product.code);

      // Clear canvas
      canvas.clear();
      canvas.backgroundColor = '#1a1a1a';

      // Get product images
      const productImages = (product.images || []).filter(
        img => img.image_type === 'product' || img.image_type === 'photo'
      );

      if (productImages.length === 0) {
        toast.error('Ürüne ait görsel bulunamadı');
        return;
      }

      // Create luxury elements
      const brandHeader = new Textbox(this.config.brandName, {
        left: this.config.canvasWidth / 2,
        top: 80,
        fontSize: 36,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#d4af37',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40,
        shadow: new Shadow({
          color: 'rgba(212, 175, 55, 0.3)',
          blur: 6,
          offsetX: 3,
          offsetY: 3
        })
      });
      canvas.add(brandHeader);

      // Add product image
      const imageUrl = this.getImageURL(productImages[0].file_path);
      const productImage = await this.createProductImage(canvas, imageUrl);
      canvas.add(productImage);

      // Add product info
      const productInfoElements = this.createProductInfo(canvas, product);
      productInfoElements.forEach(element => {
        element.set('fill', '#ffffff');
        canvas.add(element);
      });

      // Add luxury footer
      const footer = new Rect({
        left: 0,
        top: this.config.canvasHeight - 80,
        width: this.config.canvasWidth,
        height: 80,
        fill: '#d4af37',
        originX: 'left',
        originY: 'top'
      });
      canvas.add(footer);

      const footerText = new Textbox('Premium Kalite, Lüks Deneyim', {
        left: this.config.canvasWidth / 2,
        top: this.config.canvasHeight - 40,
        fontSize: 18,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#1a1a1a',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: this.config.canvasWidth - 40
      });
      canvas.add(footerText);

      // Render
      canvas.renderAll();
      toast.success('Lüks şablon oluşturuldu');

    } catch (error) {
      console.error('Luxury template creation error:', error);
      toast.error('Lüks şablon oluşturulurken hata oluştu');
    }
  }
}

// Export functions
const templateCreator = new TemplateCreator();

export const createStandardTemplate = (canvas: Canvas, product: Product) => 
  templateCreator.createStandardTemplate(canvas, product);

export const createMinimalTemplate = (canvas: Canvas, product: Product) => 
  templateCreator.createMinimalTemplate(canvas, product);

export const createLuxuryTemplate = (canvas: Canvas, product: Product) => 
  templateCreator.createLuxuryTemplate(canvas, product);

export default templateCreator;
