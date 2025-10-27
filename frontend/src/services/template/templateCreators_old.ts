import { Canvas, FabricImage, Textbox, Rect, Shadow } from 'fabric';
import { toast } from 'react-hot-toast';
import { Product } from '../../api/products';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8005';

// Get image URL helper
const getImageURL = (filePath: string): string => {
  if (!filePath) return '';
  const cleanPath = filePath.replace(/\\/g, '/');
  const finalPath = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;
  return `${API_BASE_URL}/${finalPath}`;
};

// Standard Template - Based on real ŞABLONLAR analysis
export const createStandardTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating standard template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

    canvas.backgroundColor = '#f8fafc';

    // Get current canvas dimensions
    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;
    
    console.log('Template creator - Canvas dimensions:', { canvasWidth, canvasHeight });

    // Header - DIZAYN BRANDS
  const brandTitle = new Textbox('DIZAYN BRANDS', {
    left: canvasWidth / 2,
    top: 80,
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
    splitByGrapheme: true,
    lockMovementX: false,
    lockMovementY: false,
    lockRotation: false,
    lockScalingX: false,
    lockScalingY: false,
  });
    canvas.add(brandTitle);

    // Corner Badge (PLUS SIZE!)
    const badge = new Rect({
      left: canvasWidth - 100,
      top: 10,
      width: 90,
      height: 60,
      fill: '#e91e63',
      rx: 15,
      ry: 15,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas.add(badge);

  const badgeText = new Textbox('PLUS SIZE!', {
    left: canvasWidth - 55,
    top: 40,
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
    splitByGrapheme: true,
    lockMovementX: false,
    lockMovementY: false,
    lockRotation: false,
    lockScalingX: false,
    lockScalingY: false,
  });
    canvas.add(badgeText);

    // Main content area - minimal and clean layout
    const contentTop = 80;
    const contentHeight = Math.min(canvasHeight - 200, 600); // More space
    const leftWidth = Math.min(canvasWidth * 0.7, 700); // 70% of canvas width
    const rightWidth = Math.min(canvasWidth * 0.3, 300); // 30% of canvas width
    const rightLeft = leftWidth;
    
    console.log('Content dimensions:', { contentTop, contentHeight, leftWidth, rightWidth, rightLeft });

    // Main Image (Left side)
    const mainImageUrl = getImageURL(productImages[0].file_path);
    
    try {
      const mainImg = await FabricImage.fromURL(mainImageUrl, {
        crossOrigin: 'anonymous'
      });
      
      const frameWidth = leftWidth - 20;
      const frameHeight = contentHeight - 20;
      
      const imgRatio = mainImg.width! / mainImg.height!;
      const frameRatio = frameWidth / frameHeight;
      
      let scale;
      if (imgRatio > frameRatio) {
        scale = frameHeight / mainImg.height!;
      } else {
        scale = frameWidth / mainImg.width!;
      }
      
      const mainFrame = new Rect({
        left: 10,
        top: contentTop + 10,
        width: frameWidth,
        height: frameHeight,
        fill: '#ffffff',
        rx: 15,
        ry: 15,
        stroke: '#e5e7eb',
        strokeWidth: 2,
        selectable: true,
        evented: true,
      });
      canvas.add(mainFrame);
      
      mainImg.set({
        left: 10 + (frameWidth - mainImg.width! * scale) / 2,
        top: contentTop + 10 + (frameHeight - mainImg.height! * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      
      mainImg.clipPath = new Rect({
        left: 5,
        top: contentTop + 5,
        width: frameWidth,
        height: frameHeight,
        rx: 15,
        ry: 15,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      
      canvas.add(mainImg);
    } catch (imgError) {
      console.error('Main image loading failed:', imgError);
    }

    // Add additional images if available
    if (productImages.length >= 2) {
      await addSecondaryImages(canvas, productImages.slice(1, 3), rightLeft, contentTop, rightWidth, contentHeight);
    }

    // Bottom section
    await addBottomSection(canvas, product, canvasWidth, canvasHeight, contentTop + contentHeight + 10);

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
    
    canvas.renderAll();
    toast.success('Standart şablon oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};

// Helper function for secondary images
const addSecondaryImages = async (
  canvas: Canvas, 
  images: any[], 
  rightLeft: number, 
  contentTop: number, 
  rightWidth: number, 
  contentHeight: number
) => {
  const rightTopHeight = contentHeight / 2 - 5;
  const rightBottomHeight = contentHeight / 2 - 5;
  const rightBottomTop = contentTop + rightTopHeight + 10;

  // Second image (right top)
  if (images[0]) {
    const secondImageUrl = getImageURL(images[0].file_path);
    try {
      const secondImg = await FabricImage.fromURL(secondImageUrl, {
        crossOrigin: 'anonymous'
      });
      
      const frameSecondWidth = rightWidth - 10;
      const frameSecondHeight = rightTopHeight - 5;
      
      const secondRatio = secondImg.width! / secondImg.height!;
      const frameSecondRatio = frameSecondWidth / frameSecondHeight;
      
      let secondScale;
      if (secondRatio > frameSecondRatio) {
        secondScale = frameSecondHeight / secondImg.height!;
      } else {
        secondScale = frameSecondWidth / secondImg.width!;
      }
      
      const secondFrame = new Rect({
        left: rightLeft + 5,
        top: contentTop + 5,
        width: frameSecondWidth,
        height: frameSecondHeight,
        fill: '#ffffff',
        rx: 15,
        ry: 15,
        stroke: '#e5e7eb',
        strokeWidth: 2,
        selectable: true,
        evented: true,
      });
      canvas.add(secondFrame);
      
      secondImg.set({
        left: rightLeft + 5 + (frameSecondWidth - secondImg.width! * secondScale) / 2,
        top: contentTop + 5 + (frameSecondHeight - secondImg.height! * secondScale) / 2,
        scaleX: secondScale,
        scaleY: secondScale,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      
      secondImg.clipPath = new Rect({
        left: rightLeft + 5,
        top: contentTop + 5,
        width: frameSecondWidth,
        height: frameSecondHeight,
        rx: 15,
        ry: 15,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      
      canvas.add(secondImg);
    } catch (error) {
      console.error('Second image loading failed:', error);
    }
  }

  // Third image (right bottom)
  if (images[1]) {
    const thirdImageUrl = getImageURL(images[1].file_path);
    try {
      const thirdImg = await FabricImage.fromURL(thirdImageUrl, {
        crossOrigin: 'anonymous'
      });
      
      const frameThirdWidth = rightWidth - 10;
      const frameThirdHeight = rightBottomHeight - 5;
      
      const thirdRatio = thirdImg.width! / thirdImg.height!;
      const frameThirdRatio = frameThirdWidth / frameThirdHeight;
      
      let thirdScale;
      if (thirdRatio > frameThirdRatio) {
        thirdScale = frameThirdHeight / thirdImg.height!;
      } else {
        thirdScale = frameThirdWidth / thirdImg.width!;
      }
      
      const thirdFrame = new Rect({
        left: rightLeft + 5,
        top: rightBottomTop,
        width: frameThirdWidth,
        height: frameThirdHeight,
        fill: '#ffffff',
        rx: 15,
        ry: 15,
        stroke: '#e5e7eb',
        strokeWidth: 2,
        selectable: true,
        evented: true,
      });
      canvas.add(thirdFrame);
      
      thirdImg.set({
        left: rightLeft + 5 + (frameThirdWidth - thirdImg.width! * thirdScale) / 2,
        top: rightBottomTop + (frameThirdHeight - thirdImg.height! * thirdScale) / 2,
        scaleX: thirdScale,
        scaleY: thirdScale,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      
      thirdImg.clipPath = new Rect({
        left: rightLeft + 5,
        top: rightBottomTop,
        width: frameThirdWidth,
        height: frameThirdHeight,
        rx: 15,
        ry: 15,
        originX: 'left',
        originY: 'top',
        absolutePositioned: true,
      });
      
      canvas.add(thirdImg);
    } catch (error) {
      console.error('Third image loading failed:', error);
    }
  }
};

// Helper function for bottom section
const addBottomSection = async (
  canvas: Canvas, 
  product: Product, 
  canvasWidth: number, 
  canvasHeight: number, 
  bottomTop: number
) => {
  const bottomHeight = Math.max(canvasHeight - bottomTop, 200); // Minimum 200px height

  // Bottom background
  const bottomBg = new Rect({
    left: 0,
    top: bottomTop,
    width: canvasWidth,
    height: bottomHeight,
    fill: '#8B7355',
    selectable: true,
    evented: true,
  });
  canvas.add(bottomBg);

  // Logo area
  const logoArea = new Rect({
    left: 10,
    top: bottomTop + 10,
    width: 100,
    height: bottomHeight - 20,
    fill: '#ffffff',
    rx: 20,
    ry: 20,
    selectable: true,
    evented: true,
  });
  canvas.add(logoArea);

  const logoText = new Textbox('kokART', {
    left: 60,
    top: bottomTop + bottomHeight / 2,
    fontSize: 16,
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
    splitByGrapheme: true,
  });
  canvas.add(logoText);

  // Product info - minimal horizontal layout
  const productAreaLeft = 180;
  const productY = bottomTop + 40;
  
  // Tek satırda tüm bilgiler
  const productInfo = `${product.product_type || 'BLOUSE'}: ${product.code} | PANT: ${product.code.replace(/\d+$/, (match) => String(parseInt(match) + 1))} | BEDEN: ${product.size_range || '42-48'}`;
  const productText = new Textbox(productInfo, {
    left: productAreaLeft,
    top: productY,
    width: 600,
    fontSize: 18,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'bold',
    fill: '#ffffff',
    textAlign: 'left',
    selectable: true,
    editable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    splitByGrapheme: true,
    lockMovementX: false,
    lockMovementY: false,
    lockRotation: false,
    lockScalingX: false,
    lockScalingY: false,
  });
  canvas.add(productText);

  // Single price display - professional look
  if (product.price) {
    const priceY = bottomTop + bottomHeight / 2;
    
    // Price background - larger for better visibility
    const priceBg = new Rect({
      left: canvasWidth - 140,
      top: priceY - 25,
      width: 120,
      height: 50,
      fill: '#8B7355',
      rx: 25,
      ry: 25,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas.add(priceBg);

    const priceText = new Textbox(`${product.price}$`, {
      left: canvasWidth - 140,
      top: priceY,
      fontSize: 18,
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
      splitByGrapheme: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas.add(priceText);
  }
};

// Minimal Template - Clean and simple
export const createMinimalTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating minimal template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

    canvas.backgroundColor = '#ffffff';

    // Get current canvas dimensions
    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;
    
    console.log('Template creator - Canvas dimensions:', { canvasWidth, canvasHeight });

    // Header - DIZAYN BRANDS
  const brandTitle = new Textbox('DIZAYN BRANDS', {
    left: canvasWidth / 2,
    top: 80,
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
    splitByGrapheme: true,
    lockMovementX: false,
    lockMovementY: false,
    lockRotation: false,
    lockScalingX: false,
    lockScalingY: false,
  });
    canvas.add(brandTitle);

    // Main Image (Center)
    const mainImageUrl = getImageURL(productImages[0].file_path);
    
    try {
      const mainImg = await FabricImage.fromURL(mainImageUrl, {
        crossOrigin: 'anonymous'
      });
      
      const maxWidth = canvasWidth - 60;
      const maxHeight = canvasHeight - 250;
      
      const imgRatio = mainImg.width! / mainImg.height!;
      const maxRatio = maxWidth / maxHeight;
      
      let scale;
      if (imgRatio > maxRatio) {
        scale = maxWidth / mainImg.width!;
      } else {
        scale = maxHeight / mainImg.height!;
      }
      
      mainImg.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2 - 50,
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      
      canvas.add(mainImg);
    } catch (imgError) {
      console.error('Main image loading failed:', imgError);
    }

    // Product code - prominent
    const productCode = new Textbox(product.code, {
      left: canvasWidth / 2,
      top: canvasHeight - 100,
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
      splitByGrapheme: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas.add(productCode);

    // Product details
    const productDetails = `${product.product_type || 'PRODUCT'} • ${product.color || 'Renk'} • Beden: ${product.size_range || 'N/A'}`;
    const detailsText = new Textbox(productDetails, {
      left: canvasWidth / 2,
      top: canvasHeight - 50,
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
      splitByGrapheme: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
    });
    canvas.add(detailsText);

    // Price with badge
    if (product.price) {
      const priceBg = new Rect({
        left: canvasWidth / 2,
        top: canvasHeight - 150,
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
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasWidth / 2,
        top: canvasHeight - 150,
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
        splitByGrapheme: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
      });
      canvas.add(priceText);
    }

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
    
    canvas.renderAll();
    toast.success('Minimal şablon oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};

// Catalog Template - Professional catalog style
export const createCatalogTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating catalog template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

    canvas.backgroundColor = '#f8f9fa';

    // Get current canvas dimensions
    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;
    
    console.log('Template creator - Canvas dimensions:', { canvasWidth, canvasHeight });

    // Header with brand
    const headerBg = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth,
      height: 80,
      fill: '#2c3e50',
      selectable: true,
      evented: true,
    });
    canvas.add(headerBg);

    const brandTitle = new Textbox(product.brand?.name || 'CATALOG', {
      left: canvasWidth / 2,
      top: 40,
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
      splitByGrapheme: true,
    });
    canvas.add(brandTitle);

    // Product grid layout
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
        
        img.scaleToWidth(imageSize);
        img.set({
          left: x,
          top: y,
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
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasWidth - 120,
        top: 660,
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
    
    canvas.renderAll();
    toast.success('Katalog şablonu oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};

// Social Media Template - Square format for social platforms
export const createSocialTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating social media template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    const canvasSize = Math.min(canvas.getWidth() || 700, canvas.getHeight() || 900);
    canvas.setDimensions({ width: canvasSize, height: canvasSize });
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

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

    const productCode = new Textbox(product.code, {
      left: canvasSize / 2,
      top: 50,
      fontSize: 20,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#333333',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
    });
    canvas.add(productCode);

    // Price badge
    if (product.price) {
      const priceBadge = new Rect({
        left: canvasSize - 80,
        top: canvasSize - 80,
        width: 80,
        height: 80,
        fill: '#ff6b6b',
        stroke: '#ffffff',
        strokeWidth: 4,
        rx: 40,
        ry: 40,
        originX: 'center',
        originY: 'center',
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

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasSize - 80,
        top: canvasSize - 80,
        fontSize: 16,
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
    
    canvas.renderAll();
    toast.success('Sosyal medya şablonu oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};

// Instagram Template - Optimized for Instagram posts
export const createInstagramTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating Instagram template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    const canvasSize = Math.min(canvas.getWidth() || 700, canvas.getHeight() || 900);
    canvas.setDimensions({ width: canvasSize, height: canvasSize });
    
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

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
    const circle1 = new Rect({
      left: canvasSize * 0.15,
      top: canvasSize * 0.15,
      width: canvasSize * 0.2,
      height: canvasSize * 0.2,
      fill: 'rgba(255,255,255,0.1)',
      rx: canvasSize * 0.1,
      ry: canvasSize * 0.1,
      selectable: false,
      evented: false,
    });
    canvas.add(circle1);

    const circle2 = new Rect({
      left: canvasSize * 0.7,
      top: canvasSize * 0.65,
      width: canvasSize * 0.14,
      height: canvasSize * 0.14,
      fill: 'rgba(255,255,255,0.1)',
      rx: canvasSize * 0.07,
      ry: canvasSize * 0.07,
      selectable: false,
      evented: false,
    });
    canvas.add(circle2);

    // Main product image with frame
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

    // Stylish product code
    const codeText = new Textbox(product.code, {
      left: canvasSize / 2,
      top: canvasSize * 0.2,
      fontSize: canvasSize * 0.05,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
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
      fontSize: canvasSize * 0.025,
      fontFamily: 'Arial, sans-serif',
      fill: '#ffffff',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
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

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasSize / 2,
        top: canvasSize * 0.87,
        fontSize: canvasSize * 0.03,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#333333',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
      });
      canvas.add(priceText);
    }

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
    
    canvas.renderAll();
    toast.success('Instagram şablonu oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};

// Modern Template - Contemporary design
export const createModernTemplate = async (canvas: Canvas, product: Product) => {
  console.log('Creating modern template for product:', product.code);
  console.log('Canvas:', canvas);
  console.log('Product:', product);

  try {
    // Clear canvas first
    canvas.clear();
    console.log('Canvas cleared');
    const productImages = (product.images || []).filter(img => img.image_type === 'product' || img.image_type === 'photo');
    
    if (productImages.length === 0) {
      toast.error('Ürüne ait görsel bulunamadı');
      return;
    }

    canvas.backgroundColor = '#1a1a1a';

    // Get current canvas dimensions
    const canvasWidth = canvas.getWidth() || 700;
    const canvasHeight = canvas.getHeight() || 900;
    
    console.log('Template creator - Canvas dimensions:', { canvasWidth, canvasHeight });

    // Modern geometric background
    const bgShape1 = new Rect({
      left: 0,
      top: 0,
      width: canvasWidth / 2,
      height: canvasHeight,
      fill: '#2d2d2d',
      selectable: false,
      evented: false,
    });
    canvas.add(bgShape1);

    const bgShape2 = new Rect({
      left: canvasWidth / 2,
      top: 0,
      width: canvasWidth / 2,
      height: canvasHeight / 3,
      fill: '#ff6b6b',
      selectable: false,
      evented: false,
    });
    canvas.add(bgShape2);

    // Main product image
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

    // Modern typography
    const productCode = new Textbox(product.code, {
      left: canvasWidth - 50,
      top: 100,
      fontSize: 36,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      fill: '#ffffff',
      textAlign: 'right',
      originX: 'right',
      selectable: true,
      editable: true,
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
    if (product.product_type) {
      const typeText = new Textbox(product.product_type.toUpperCase(), {
        left: canvasWidth - 50,
        top: 200,
        fontSize: 14,
        fontFamily: 'Arial, sans-serif',
        fill: '#cccccc',
        textAlign: 'right',
        originX: 'right',
        selectable: true,
        editable: true,
      });
      canvas.add(typeText);
    }

    // Modern price design
    if (product.price) {
      const priceBg = new Rect({
        left: canvasWidth - 120,
        top: 660,
        width: 80,
        height: 40,
        fill: 'rgba(255,255,255,0.9)',
        rx: 20,
        ry: 20,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
      });
      canvas.add(priceBg);

      const priceText = new Textbox(`${product.price}$`, {
        left: canvasWidth - 120,
        top: 660,
        fontSize: 18,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        fill: '#333333',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        selectable: true,
        editable: true,
      });
      canvas.add(priceText);
    }

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
    
    canvas.renderAll();
    toast.success('Modern şablon oluşturuldu!');

  } catch (error) {
    console.error('Template creation error:', error);
    toast.error('Şablon oluşturulurken hata: ' + (error as Error).message);
  }
};