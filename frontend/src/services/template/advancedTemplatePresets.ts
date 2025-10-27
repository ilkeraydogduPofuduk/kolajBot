/**
 * Advanced Template Presets
 * Additional template types for specialized use cases
 */

import { Canvas, FabricImage, Textbox, Rect, Circle as FabricCircle, Shadow, Line } from 'fabric';
import { toast } from 'react-hot-toast';
import { Product } from '../../api/products';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

const getImageURL = (filePath: string): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/');
  const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
  return `${API_BASE_URL}/${finalPath}`;
};

// Helper function to add editable properties to all objects
const makeEditable = (obj: any) => {
  if (obj && obj.set) {
    obj.set({
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
  }
  return obj;
};

// Helper function to ensure all canvas objects are editable
const makeAllEditable = (canvas: Canvas) => {
  canvas.getObjects().forEach(obj => {
    makeEditable(obj);
  });
};

// E-commerce Product Card Template
export const createEcommerceTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;

    // Header with brand
    const headerBg = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: 60,
      fill: '#f8f9fa',
      selectable: false,
      evented: false,
    });
    canvas.add(headerBg);

    const brandTitle = new Textbox(product.brand?.name || 'BRAND', {
      left: 20,
      top: 30,
      width: 200,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#2c3e50',
      textAlign: 'left',
      originX: 'left',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(brandTitle);

    // Product image with frame
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(300);
        mainImg.set({
          left: canvasWidth / 2,
          top: 150,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.1)',
            blur: 20,
            offsetX: 0,
            offsetY: 10,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('E-commerce image loading failed:', error);
      }
    }

    // Product code
    const productCode = new Textbox(product.code || 'ÜRÜN KODU', {
      left: 20,
      top: 250,
      width: 200,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fill: '#666666',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productCode);

    // Product type
    const typeText = new Textbox((product.product_type || 'ÜRÜN TİPİ').toUpperCase(), {
      left: 20,
      top: 280,
      width: 200,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: '#999999',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(typeText);

    // Price with discount badge
    if (product.price) {
      const priceContainer = new Rect({
        left: 20,
        top: 320,
        width: 150,
        height: 50,
        fill: '#e74c3c',
        rx: 8,
        ry: 8,
        selectable: true,
        evented: true,
      });
      canvas.add(priceContainer);

      const priceText = new Textbox(`${product.price || '0'}$`, {
        left: 95,
        top: 345,
        width: 100,
        fontSize: 20,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(priceText);

      // Discount badge
      const discountBadge = new Rect({
        left: 180,
        top: 320,
        width: 60,
        height: 25,
        fill: '#f39c12',
        rx: 4,
        ry: 4,
        selectable: true,
        evented: true,
      });
      canvas.add(discountBadge);

      const discountText = new Textbox('%20', {
        left: 210,
        top: 332,
        width: 40,
        fontSize: 12,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(discountText);
    }

    // Size range
    if (product.size_range) {
      const sizeText = new Textbox(`Boyut: ${product.size_range}`, {
        left: 20,
        top: 400,
        width: 200,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        fill: '#2c3e50',
        textAlign: 'left',
        originX: 'left',
        originY: 'top',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(sizeText);
    }

    // Color
    if (product.color) {
      const colorText = new Textbox(`Renk: ${product.color}`, {
        left: 20,
        top: 430,
        width: 200,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        fill: '#2c3e50',
        textAlign: 'left',
        originX: 'left',
        originY: 'top',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(colorText);
    }

    // Call to action button
    const ctaButton = new Rect({
      left: canvasWidth / 2,
      top: 500,
      width: 200,
      height: 40,
      fill: '#27ae60',
      rx: 20,
      ry: 20,
      selectable: true,
      evented: true,
    });
    canvas.add(ctaButton);

    const ctaText = new Textbox('SATIN AL', {
      left: canvasWidth / 2,
      top: 520,
      width: 150,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(ctaText);

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('E-ticaret şablonu oluşturuldu!');
  } catch (error) {
    console.error('E-commerce template error:', error);
    toast.error('E-ticaret şablonu oluşturulurken hata oluştu');
  }
};

// Business Card Template
export const createBusinessCardTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    // Business card dimensions (3.5" x 2")
    const cardWidth = 350;
    const cardHeight = 200;
    canvas.setDimensions({ width: cardWidth, height: cardHeight });

    // Background gradient
    const bgGradient = new Rect({
      left: 0,
      top: 0,
      width: cardWidth,
      height: cardHeight,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      selectable: false,
      evented: false,
    });
    canvas.add(bgGradient);

    // Company logo area
    const logoArea = new Rect({
      left: 20,
      top: 20,
      width: 60,
      height: 60,
      fill: 'rgba(255,255,255,0.2)',
      rx: 8,
      ry: 8,
      selectable: true,
      evented: true,
    });
    canvas.add(logoArea);

    // Company name
    const companyName = new Textbox(product.brand?.name || 'COMPANY NAME', {
      left: 100,
      top: 30,
      width: 200,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(companyName);

    // Product line
    const productLine = new Textbox(product.product_type || 'PRODUCT LINE', {
      left: 100,
      top: 55,
      width: 200,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: 'rgba(255,255,255,0.8)',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productLine);

    // Contact info
    const contactInfo = new Textbox('info@company.com | +90 555 123 4567', {
      left: 20,
      top: 120,
      width: 300,
      fontSize: 10,
      fontFamily: 'Arial, sans-serif',
      fill: 'rgba(255,255,255,0.9)',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(contactInfo);

    // Website
    const website = new Textbox('www.company.com', {
      left: 20,
      top: 140,
      width: 200,
      fontSize: 10,
      fontFamily: 'Arial, sans-serif',
      fill: 'rgba(255,255,255,0.9)',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(website);

    // Decorative line
    const decorativeLine = new Line([20, 160, 330, 160], {
      stroke: 'rgba(255,255,255,0.5)',
      strokeWidth: 1,
      selectable: true,
      evented: true,
    });
    canvas.add(decorativeLine);

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Kartvizit şablonu oluşturuldu!');
  } catch (error) {
    console.error('Business card template error:', error);
    toast.error('Kartvizit şablonu oluşturulurken hata oluştu');
  }
};

// Newsletter Template
export const createNewsletterTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;

    // Header
    const headerBg = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: 100,
      fill: '#2c3e50',
      selectable: false,
      evented: false,
    });
    canvas.add(headerBg);

    const headerTitle = new Textbox('NEWSLETTER', {
      left: canvasWidth / 2,
      top: 50,
      width: 200,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(headerTitle);

    // Main content area
    const contentBg = new Rect({
      left: 20,
      top: 120,
      width: canvasWidth - 40,
      height: 400,
      fill: '#f8f9fa',
      rx: 8,
      ry: 8,
      selectable: true,
      evented: true,
    });
    canvas.add(contentBg);

    // Product image
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(200);
        mainImg.set({
          left: 50,
          top: 150,
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.1)',
            blur: 15,
            offsetX: 0,
            offsetY: 5,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('Newsletter image loading failed:', error);
      }
    }

    // Product title
    const productTitle = new Textbox(product.code || 'ÜRÜN BAŞLIĞI', {
      left: 300,
      top: 150,
      width: 300,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#2c3e50',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productTitle);

    // Product description
    const productDesc = new Textbox('Ürün açıklaması buraya gelecek. Detaylı bilgi ve özellikler...', {
      left: 300,
      top: 180,
      width: 300,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fill: '#666666',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productDesc);

    // Price
    if (product.price) {
      const priceText = new Textbox(`${product.price}$`, {
        left: 300,
        top: 250,
        width: 100,
        fontSize: 18,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#e74c3c',
        textAlign: 'left',
        originX: 'left',
        originY: 'top',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(priceText);
    }

    // Call to action
    const ctaButton = new Rect({
      left: 300,
      top: 300,
      width: 150,
      height: 35,
      fill: '#3498db',
      rx: 17,
      ry: 17,
      selectable: true,
      evented: true,
    });
    canvas.add(ctaButton);

    const ctaText = new Textbox('DETAYLARI GÖR', {
      left: 375,
      top: 317,
      width: 120,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(ctaText);

    // Footer
    const footerBg = new Rect({
      left: 0,
      top: 550,
      width: canvasWidth,
      height: 50,
      fill: '#34495e',
      selectable: false,
      evented: false,
    });
    canvas.add(footerBg);

    const footerText = new Textbox('© 2025 Company Name. Tüm hakları saklıdır.', {
      left: canvasWidth / 2,
      top: 575,
      width: 400,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: '#bdc3c7',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(footerText);

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Newsletter şablonu oluşturuldu!');
  } catch (error) {
    console.error('Newsletter template error:', error);
    toast.error('Newsletter şablonu oluşturulurken hata oluştu');
  }
};

// Banner Template
export const createBannerTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    // Banner dimensions (1200x300)
    const bannerWidth = 1200;
    const bannerHeight = 300;
    canvas.setDimensions({ width: bannerWidth, height: bannerHeight });

    // Background gradient
    const bgGradient = new Rect({
      left: 0,
      top: 0,
      width: bannerWidth,
      height: bannerHeight,
      fill: 'linear-gradient(45deg, #ff6b6b 0%, #4ecdc4 100%)',
      selectable: false,
      evented: false,
    });
    canvas.add(bgGradient);

    // Product image
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToHeight(200);
        mainImg.set({
          left: 50,
          top: 50,
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 20,
            offsetX: 0,
            offsetY: 10,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('Banner image loading failed:', error);
      }
    }

    // Main headline
    const headline = new Textbox('YENİ KOLEKSİYON', {
      left: 300,
      top: 80,
      width: 400,
      fontSize: 36,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    });
    canvas.add(headline);

    // Subheadline
    const subheadline = new Textbox(product.code || 'ÜRÜN KODU', {
      left: 300,
      top: 130,
      width: 400,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fill: 'rgba(255,255,255,0.9)',
      textAlign: 'left',
      originX: 'left',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(subheadline);

    // Price
    if (product.price) {
      const priceText = new Textbox(`${product.price}$`, {
        left: 300,
        top: 170,
        width: 200,
        fontSize: 28,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#f1c40f',
        textAlign: 'left',
        originX: 'left',
        originY: 'top',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 5,
          offsetX: 1,
          offsetY: 1,
        }),
      });
      canvas.add(priceText);
    }

    // Call to action button
    const ctaButton = new Rect({
      left: 800,
      top: 100,
      width: 200,
      height: 50,
      fill: 'rgba(255,255,255,0.2)',
      stroke: '#ffffff',
      strokeWidth: 2,
      rx: 25,
      ry: 25,
      selectable: true,
      evented: true,
    });
    canvas.add(ctaButton);

    const ctaText = new Textbox('ŞİMDİ SATIN AL', {
      left: 900,
      top: 125,
      width: 150,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(ctaText);

    // Decorative elements
    const circle1 = new FabricCircle({
      left: 1000,
      top: 50,
      radius: 30,
      fill: 'rgba(255,255,255,0.1)',
      selectable: false,
      evented: false,
    });
    canvas.add(circle1);

    const circle2 = new FabricCircle({
      left: 1050,
      top: 200,
      radius: 20,
      fill: 'rgba(255,255,255,0.1)',
      selectable: false,
      evented: false,
    });
    canvas.add(circle2);

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Banner şablonu oluşturuldu!');
  } catch (error) {
    console.error('Banner template error:', error);
    toast.error('Banner şablonu oluşturulurken hata oluştu');
  }
};

// Export all advanced templates
export const advancedTemplates = {
  ecommerce: createEcommerceTemplate,
  businessCard: createBusinessCardTemplate,
  newsletter: createNewsletterTemplate,
  banner: createBannerTemplate,
};
