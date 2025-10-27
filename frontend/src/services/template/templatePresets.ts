import { Canvas, FabricImage, Textbox, Rect, Circle as FabricCircle, Shadow } from 'fabric';
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

// Minimal Template - Clean and simple
export const createMinimalTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    const canvasWidth = canvas.getWidth() || 700;

    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(500);
        makeEditable(mainImg.set({
          left: canvasWidth / 2,
          top: 100,
          originX: 'center',
          originY: 'top',
        }));
        canvas.add(mainImg);
      } catch (error) {
        console.error('Image loading failed:', error);
      }
    }

    const productCode = makeEditable(new Textbox(product.code || 'ÜRÜN KODU', {
      left: canvasWidth / 2,
      top: 650,
      width: 300,
      fontSize: 32,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    }));
    canvas.add(productCode);

    const priceText = makeEditable(new Textbox(`${product.price || '0'}$`, {
      left: canvasWidth / 2,
      top: 700,
      width: 200,
      fontSize: 24,
      fontFamily: 'Arial, sans-serif',
      fill: '#666666',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    }));
    canvas.add(priceText);

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Minimal şablon oluşturuldu!');
  } catch (error) {
    console.error('Minimal template error:', error);
    toast.error('Minimal şablon oluşturulurken hata oluştu');
  }
};

// Catalog Template - Professional catalog style
export const createCatalogTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#f8f9fa';

    const canvasWidth = canvas.getWidth() || 700;

    // Header with brand
    const headerBg = makeEditable(new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: 80,
      fill: '#2c3e50',
    }));
    canvas.add(headerBg);

    const brandTitle = makeEditable(new Textbox(product.brand?.name || 'CATALOG', {
      left: canvasWidth / 2,
      top: 40,
      width: 300,
      fontSize: 28,
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
    }));
    canvas.add(brandTitle);

    // Product grid layout
    const productImages = product.images || [];
    const imageSize = 180;
    const spacing = 20;
    
    for (let i = 0; i < Math.min(4, productImages.length); i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const x = spacing + col * (imageSize + spacing);
      const y = 120 + row * (imageSize + spacing);

      try {
        const imageUrl = getImageURL(productImages[i].file_path);
        const img = await FabricImage.fromURL(imageUrl, {
          crossOrigin: 'anonymous'
        });
        
        // Scale image to fit within the imageSize bounds while maintaining aspect ratio
        const imgRatio = img.width! / img.height!;
        let scale;
        if (imgRatio > 1) {
          // Landscape image - scale by width
          scale = imageSize / img.width!;
        } else {
          // Portrait image - scale by height
          scale = imageSize / img.height!;
        }
        
        img.set({
          left: x,
          top: y,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true,
        });
        canvas.add(img);
      } catch (error) {
        console.error(`Image ${i} loading failed:`, error);
      }
    }

    // Product info section
    const infoBg = new Rect({
      left: 20,
      top: 520,
      width: canvasWidth - 40,
      height: 200,
      fill: '#ffffff',
      stroke: '#dee2e6',
      strokeWidth: 2,
      rx: 10,
      ry: 10,
      selectable: true,
      evented: true,
    });
    canvas.add(infoBg);

    const productTitle = new Textbox(`${product.code} - ${product.color || ''}`, {
      left: 40,
      top: 540,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#2c3e50',
      selectable: true,
      editable: true,
    });
    canvas.add(productTitle);

    if (product.product_type) {
      const description = new Textbox(`Ürün Tipi: ${product.product_type} - Renk: ${product.color || 'Belirtilmemiş'}`, {
        left: 40,
        top: 580,
        width: canvasWidth - 80,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        fill: '#6c757d',
        selectable: true,
        editable: true,
      });
      canvas.add(description);
    }

    if (product.price) {
      const priceBg = new Rect({
        left: canvasWidth - 120,
        top: 660,
        width: 80,
        height: 40,
        fill: '#e74c3c',
        rx: 20,
        ry: 20,
        selectable: true,
        evented: true,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasWidth - 80,
        top: 680,
        fontSize: 18,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#ffffff',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
      });
      canvas.add(priceText);
    }

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Katalog şablonu oluşturuldu!');
  } catch (error) {
    console.error('Catalog template error:', error);
    toast.error('Katalog şablonu oluşturulurken hata oluştu');
  }
};

// Social Media Template - Square format for social platforms
export const createSocialTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    const canvasSize = Math.min(canvas.getWidth() || 700, canvas.getHeight() || 900);
    canvas.setDimensions({ width: canvasSize, height: canvasSize });
    canvas.backgroundColor = '#ffffff';

    // Gradient background
    const gradientBg = new Rect({
      left: 0,
      top: 0,
      width: canvasSize,
      height: canvasSize,
      fill: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
      selectable: false,
      evented: false,
    });
    canvas.add(gradientBg);

    // Main product image
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(400);
        mainImg.set({
          left: canvasSize / 2,
          top: canvasSize / 2 - 50,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.5)',
            blur: 20,
            offsetX: 0,
            offsetY: 10,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('Social image loading failed:', error);
      }
    }

    // Product code with background
    const codeBg = new Rect({
      left: canvasSize / 2,
      top: 50,
      width: 200,
      height: 50,
      fill: 'rgba(255,255,255,0.9)',
      rx: 25,
      ry: 25,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
    });
    canvas.add(codeBg);

    const productCode = new Textbox(product.code || 'ÜRÜN KODU', {
      left: canvasSize / 2,
      top: 50,
      width: 180,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#333333',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productCode);

    // Price badge
    if (product.price) {
      const priceBadge = new FabricCircle({
        left: canvasSize - 80,
        top: canvasSize - 80,
        radius: 40,
        fill: '#ff6b6b',
        stroke: '#ffffff',
        strokeWidth: 4,
        selectable: true,
        evented: true,
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 10,
          offsetX: 0,
          offsetY: 5,
        }),
      });
      canvas.add(priceBadge);

      const priceText = new Textbox(`${product.price || '0'}$`, {
        left: canvasSize - 80,
        top: canvasSize - 80,
        width: 60,
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
      canvas.add(priceText);
    }

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Sosyal medya şablonu oluşturuldu!');
  } catch (error) {
    console.error('Social template error:', error);
    toast.error('Sosyal medya şablonu oluşturulurken hata oluştu');
  }
};

// Instagram Template - Optimized for Instagram posts
export const createInstagramTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    const canvasSize = Math.min(canvas.getWidth() || 700, canvas.getHeight() || 900);
    canvas.setDimensions({ width: canvasSize, height: canvasSize });
    
    // Instagram-style gradient background
    const gradientBg = new Rect({
      left: 0,
      top: 0,
      width: canvasSize,
      height: canvasSize,
      fill: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      selectable: false,
      evented: false,
    });
    canvas.add(gradientBg);

    // Decorative elements
    const circle1 = new FabricCircle({
      left: canvasSize * 0.15,
      top: canvasSize * 0.15,
      radius: canvasSize * 0.1,
      fill: 'rgba(255,255,255,0.1)',
      selectable: false,
      evented: false,
    });
    canvas.add(circle1);

    const circle2 = new FabricCircle({
      left: canvasSize * 0.8,
      top: canvasSize * 0.65,
      radius: canvasSize * 0.07,
      fill: 'rgba(255,255,255,0.1)',
      selectable: false,
      evented: false,
    });
    canvas.add(circle2);

    // Main product image with frame
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const frameSize = canvasSize * 0.45;
        const imageFrame = new Rect({
          left: canvasSize / 2,
          top: canvasSize / 2,
          width: frameSize,
          height: frameSize,
          fill: '#ffffff',
          rx: canvasSize * 0.03,
          ry: canvasSize * 0.03,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(0,0,0,0.3)',
            blur: 20,
            offsetX: 0,
            offsetY: 10,
          }),
        });
        canvas.add(imageFrame);

        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(frameSize * 0.9);
        mainImg.set({
          left: canvasSize / 2,
          top: canvasSize / 2,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          clipPath: new Rect({
            left: canvasSize / 2,
            top: canvasSize / 2,
            width: frameSize * 0.9,
            height: frameSize * 0.9,
            rx: canvasSize * 0.02,
            ry: canvasSize * 0.02,
            originX: 'center',
            originY: 'center',
            absolutePositioned: true,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('Instagram image loading failed:', error);
      }
    }

    // Stylish product code
    const codeText = new Textbox(product.code || 'ÜRÜN KODU', {
      left: canvasSize / 2,
      top: canvasSize * 0.2,
      width: canvasSize * 0.6,
      fontSize: canvasSize * 0.05,
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
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    });
    canvas.add(codeText);

    // Hashtag style text
    const hashtagText = new Textbox('#fashion #style #trendy', {
      left: canvasSize / 2,
      top: canvasSize * 0.8,
      width: canvasSize * 0.8,
      fontSize: canvasSize * 0.025,
      fontFamily: 'Arial, sans-serif',
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
    canvas.add(hashtagText);

    // Price with Instagram-style design
    if (product.price) {
      const priceBg = new Rect({
        left: canvasSize / 2,
        top: canvasSize * 0.87,
        width: canvasSize * 0.15,
        height: canvasSize * 0.07,
        fill: 'rgba(255,255,255,0.9)',
        rx: canvasSize * 0.035,
        ry: canvasSize * 0.035,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price || '0'}$`, {
        left: canvasSize / 2,
        top: canvasSize * 0.87,
        width: canvasSize * 0.1,
        fontSize: canvasSize * 0.03,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#333333',
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
    }

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Instagram şablonu oluşturuldu!');
  } catch (error) {
    console.error('Instagram template error:', error);
    toast.error('Instagram şablonu oluşturulurken hata oluştu');
  }
};

// Modern Template - Contemporary design
export const createModernTemplate = async (canvas: Canvas, product: Product) => {
  try {
    canvas.clear();
    canvas.backgroundColor = '#1a1a1a';

    const canvasWidth = canvas.getWidth() || 700;

    // Modern geometric background
    const bgShape1 = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth / 2,
      height: canvas.getHeight() || 900,
      fill: '#2d2d2d',
      selectable: false,
      evented: false,
    });
    canvas.add(bgShape1);

    const bgShape2 = new Rect({
      left: canvasWidth / 2,
      top: 0,
      width: canvasWidth / 2,
      height: (canvas.getHeight() || 900) / 3,
      fill: '#ff6b6b',
      selectable: false,
      evented: false,
    });
    canvas.add(bgShape2);

    // Main product image
    const productImages = product.images || [];
    if (productImages.length > 0) {
      const mainImageUrl = getImageURL(productImages[0].file_path);
      try {
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        mainImg.scaleToWidth(350);
        mainImg.set({
          left: 50,
          top: 150,
          selectable: true,
          evented: true,
          shadow: new Shadow({
            color: 'rgba(255,107,107,0.5)',
            blur: 30,
            offsetX: 10,
            offsetY: 10,
          }),
        });
        canvas.add(mainImg);
      } catch (error) {
        console.error('Modern image loading failed:', error);
      }
    }

    // Modern typography - Product Code
    const productCode = new Textbox(product.code || 'ÜRÜN KODU', {
      left: canvasWidth - 50,
      top: 100,
      width: 200,
      fontSize: 36,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'right',
      originX: 'right',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(productCode);

    // Accent line
    const accentLine = new Rect({
      left: canvasWidth - 200,
      top: 160,
      width: 150,
      height: 4,
      fill: '#ff6b6b',
      selectable: true,
      evented: true,
    });
    canvas.add(accentLine);

    // Product type
    const typeText = new Textbox((product.product_type || 'ÜRÜN TİPİ').toUpperCase(), {
      left: canvasWidth - 50,
      top: 200,
      width: 200,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif',
      fill: '#cccccc',
      textAlign: 'right',
      originX: 'right',
      originY: 'top',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(typeText);

    // Modern price design
    if (product.price) {
      const priceContainer = new Rect({
        left: canvasWidth - 150,
        top: (canvas.getHeight() || 900) - 100,
        width: 120,
        height: 60,
        fill: 'transparent',
        stroke: '#ff6b6b',
        strokeWidth: 2,
        selectable: true,
        evented: true,
      });
      canvas.add(priceContainer);

      const priceText = new Textbox(`${product.price || '0'}$`, {
        left: canvasWidth - 90,
        top: (canvas.getHeight() || 900) - 70,
        width: 100,
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#ff6b6b',
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
    }

    makeAllEditable(canvas);
    canvas.renderAll();
    toast.success('Modern şablon oluşturuldu!');
  } catch (error) {
    console.error('Modern template error:', error);
    toast.error('Modern şablon oluşturulurken hata oluştu');
  }
};
