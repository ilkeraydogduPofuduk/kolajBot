import { Canvas, FabricImage, Textbox, Rect, Shadow } from 'fabric';
import { Product } from '../../api/products';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

const getImageURL = (filePath: string): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/');
  const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
  return `${API_BASE_URL}/${finalPath}`;
};

export const createSimpleTemplate = async (canvas: Canvas, product: Product): Promise<void> => {
  if (!canvas || !product) {
    console.error('Canvas or product is missing');
    return;
  }

  try {
    // Clear canvas
    canvas.clear();
    canvas.backgroundColor = '#ffffff';

    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;
    
    console.log('Creating professional template:', { canvasWidth, canvasHeight });
    console.log('Product data:', product);

    // Professional Header
    const brandTitle = new Textbox('DIZAYN BRANDS', {
      left: canvasWidth / 2,
      top: 60,
      fontSize: 32,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#1f2937',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(brandTitle);

    // Product image with proper frame
    console.log('Product images:', product.images);
    if (product.images && product.images.length > 0) {
      try {
        const mainImageUrl = getImageURL(product.images[0].file_path);
        console.log('Loading image from URL:', mainImageUrl);
        
        const mainImg = await FabricImage.fromURL(mainImageUrl, {
          crossOrigin: 'anonymous'
        });
        
        // Create image frame
        const imageFrame = new Rect({
          left: canvasWidth / 2,
          top: 200,
          width: 400,
          height: 400,
          fill: '#ffffff',
          stroke: '#e5e7eb',
          strokeWidth: 3,
          rx: 15,
          ry: 15,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        canvas.add(imageFrame);
        
        // Scale image to fit frame
        const frameSize = 380; // 400 - 20 padding
        
        const imgRatio = mainImg.width! / mainImg.height!;
        let scale;
        if (imgRatio > 1) {
          scale = frameSize / mainImg.width!;
        } else {
          scale = frameSize / mainImg.height!;
        }
        
        mainImg.set({
          left: canvasWidth / 2,
          top: 200,
          scaleX: scale,
          scaleY: scale,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        
        canvas.add(mainImg);
        console.log('Product image added successfully');
      } catch (error) {
        console.error('Error loading product image:', error);
        // Add placeholder if image fails to load
        const placeholder = new Rect({
          left: canvasWidth / 2,
          top: 200,
          width: 400,
          height: 400,
          fill: '#f9fafb',
          stroke: '#d1d5db',
          strokeWidth: 3,
          rx: 15,
          ry: 15,
          originX: 'center',
          originY: 'center',
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        canvas.add(placeholder);
        
        const placeholderText = new Textbox('Ürün Görseli', {
          left: canvasWidth / 2,
          top: 200,
          fontSize: 24,
          fontFamily: 'Arial, sans-serif',
          fill: '#9ca3af',
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          selectable: true,
          editable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        });
        canvas.add(placeholderText);
      }
    } else {
      console.log('No product images found, adding placeholder');
      // Add placeholder if no images
      const placeholder = new Rect({
        left: canvasWidth / 2,
        top: 200,
        width: 400,
        height: 400,
        fill: '#f9fafb',
        stroke: '#d1d5db',
        strokeWidth: 3,
        rx: 15,
        ry: 15,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(placeholder);
      
      const placeholderText = new Textbox('Ürün Görseli', {
        left: canvasWidth / 2,
        top: 200,
        fontSize: 24,
        fontFamily: 'Arial, sans-serif',
        fill: '#9ca3af',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(placeholderText);
    }

    // Product code - prominent
    const productCode = new Textbox(product.code, {
      left: canvasWidth / 2,
      top: 650,
      fontSize: 36,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#1f2937',
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

    // Product details
    const productDetails = `${product.product_type || 'PRODUCT'} • ${product.color || 'Renk'} • Beden: ${product.size_range || 'N/A'}`;
    const detailsText = new Textbox(productDetails, {
      left: canvasWidth / 2,
      top: 700,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fill: '#6b7280',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
    canvas.add(detailsText);

    // Price with badge
    if (product.price) {
      const priceBg = new Rect({
        left: canvasWidth / 2,
        top: 750,
        width: 120,
        height: 50,
        fill: '#10b981',
        rx: 25,
        ry: 25,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasWidth / 2,
        top: 750,
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
      canvas.add(priceText);
    }

    // Footer
    const footerText = new Textbox('Premium Fashion Collection', {
      left: canvasWidth / 2,
      top: 820,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fill: '#9ca3af',
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

    // Make all objects editable
    canvas.getObjects().forEach(obj => {
      obj.set({
        selectable: true,
        editable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });
    });

    // Render canvas
    canvas.renderAll();
    console.log('Professional template created successfully');

  } catch (error) {
    console.error('Error creating professional template:', error);
    throw error;
  }
};