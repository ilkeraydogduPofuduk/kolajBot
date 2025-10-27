import { Canvas as FabricCanvas } from 'fabric';
import { FabricService } from './fabricService';

/**
 * Collage Service
 * Otomatik kolaj oluşturma servisi
 */

export interface CollageProduct {
  id: number;
  code: string;
  color: string;
  size?: string;
  price?: number;
  image_url: string;
  brand_name?: string;
}

export interface CollageConfig {
  layout: 'grid' | 'masonry' | 'featured' | 'catalog';
  columns: number;
  rows: number;
  spacing: number;
  showProductInfo: boolean;
  showPrices: boolean;
  showQRCode: boolean;
  showLogo: boolean;
  backgroundColor: string;
  brandColor?: string;
}

export class CollageService {
  /**
   * Otomatik kolaj oluştur
   */
  static async createAutoCollage(
    canvas: FabricCanvas,
    products: CollageProduct[],
    config: CollageConfig
  ): Promise<void> {
    // Canvas'ı temizle
    canvas.clear();

    // Background
    const bg = FabricService.createRectangle({
      left: 0,
      top: 0,
      width: canvas.width!,
      height: canvas.height!,
      fill: config.backgroundColor,
      selectable: false
    });
    canvas.add(bg);
    bg.setCoords();

    // Layout'a göre yerleştir
    switch (config.layout) {
      case 'grid':
        await this.createGridLayout(canvas, products, config);
        break;
      case 'masonry':
        await this.createMasonryLayout(canvas, products, config);
        break;
      case 'featured':
        await this.createFeaturedLayout(canvas, products, config);
        break;
      case 'catalog':
        await this.createCatalogLayout(canvas, products, config);
        break;
    }

    // Logo ekle
    if (config.showLogo && products[0]?.brand_name) {
      this.addBrandLogo(canvas, products[0].brand_name, config);
    }

    canvas.requestRenderAll();
  }

  /**
   * Grid Layout - Eşit boyutlu grid
   */
  private static async createGridLayout(
    canvas: FabricCanvas,
    products: CollageProduct[],
    config: CollageConfig
  ): Promise<void> {
    const { columns, rows, spacing } = config;
    const maxProducts = columns * rows;
    const productsToShow = products.slice(0, maxProducts);

    // Header için alan bırak
    const headerHeight = 100;
    const availableWidth = canvas.width! - (spacing * (columns + 1));
    const availableHeight = canvas.height! - headerHeight - (spacing * (rows + 1));
    
    const cellWidth = availableWidth / columns;
    const cellHeight = availableHeight / rows;

    // Header ekle
    this.addHeader(canvas, 'ÜRÜN KOLAJI', config);

    // Ürünleri yerleştir
    for (let i = 0; i < productsToShow.length; i++) {
      const product = productsToShow[i];
      const col = i % columns;
      const row = Math.floor(i / columns);

      const x = spacing + (col * (cellWidth + spacing));
      const y = headerHeight + spacing + (row * (cellHeight + spacing));

      await this.addProductCell(canvas, product, x, y, cellWidth, cellHeight, config);
    }

    canvas.requestRenderAll();
  }

  /**
   * Masonry Layout - Pinterest tarzı
   */
  private static async createMasonryLayout(
    canvas: FabricCanvas,
    products: CollageProduct[],
    config: CollageConfig
  ): Promise<void> {
    const { columns, spacing } = config;
    const columnWidth = (canvas.width! - (spacing * (columns + 1))) / columns;
    const columnHeights = new Array(columns).fill(100); // Header için 100px

    // Header
    this.addHeader(canvas, 'ÜRÜN KOLEKSİYONU', config);

    for (const product of products) {
      // En kısa kolonu bul
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
      const x = spacing + (shortestCol * (columnWidth + spacing));
      const y = columnHeights[shortestCol] + spacing;

      // Random height (200-400px)
      const height = 200 + Math.random() * 200;

      await this.addProductCell(canvas, product, x, y, columnWidth, height, config);

      // Kolon yüksekliğini güncelle
      columnHeights[shortestCol] += height + spacing;
    }

    canvas.requestRenderAll();
  }

  /**
   * Featured Layout - Öne çıkan ürün + grid
   */
  private static async createFeaturedLayout(
    canvas: FabricCanvas,
    products: CollageProduct[],
    config: CollageConfig
  ): Promise<void> {
    if (products.length === 0) return;

    const spacing = config.spacing;
    const headerHeight = 100;

    // Header
    this.addHeader(canvas, 'ÖNE ÇIKAN ÜRÜNLER', config);

    // Sol taraf - Featured (büyük)
    const featuredWidth = canvas.width! * 0.6;
    const featuredHeight = canvas.height! - headerHeight - (spacing * 2);
    
    await this.addProductCell(
      canvas,
      products[0],
      spacing,
      headerHeight + spacing,
      featuredWidth - spacing,
      featuredHeight,
      { ...config, showProductInfo: true }
    );

    // Sağ taraf - Grid (küçük)
    const gridX = featuredWidth + spacing;
    const gridWidth = canvas.width! - featuredWidth - (spacing * 2);
    const cellHeight = (featuredHeight - spacing) / 3;

    for (let i = 1; i < Math.min(4, products.length); i++) {
      const y = headerHeight + spacing + ((i - 1) * (cellHeight + spacing));
      await this.addProductCell(
        canvas,
        products[i],
        gridX,
        y,
        gridWidth,
        cellHeight - spacing,
        config
      );
    }

    canvas.requestRenderAll();
  }

  /**
   * Catalog Layout - Katalog görünümü
   */
  private static async createCatalogLayout(
    canvas: FabricCanvas,
    products: CollageProduct[],
    config: CollageConfig
  ): Promise<void> {
    const spacing = config.spacing;
    const headerHeight = 120;
    const itemHeight = 150;
    const imageWidth = 120;

    // Header
    this.addHeader(canvas, 'ÜRÜN KATALOĞU', config);

    let currentY = headerHeight + spacing;

    for (const product of products) {
      // Ürün görseli
      try {
        const img = await FabricService.createImage(product.image_url, {
          left: spacing,
          top: currentY,
          scaleToWidth: imageWidth
        });
        canvas.add(img);
        img.setCoords();
      } catch (error) {
        console.error('Image load error:', error);
      }

      // Ürün bilgileri
      const textX = spacing + imageWidth + 20;

      // Ürün kodu
      const codeText = FabricService.createText(product.code, {
        left: textX,
        top: currentY,
        fontSize: 24,
        fontWeight: 'bold',
        fill: '#000000'
      });
      canvas.add(codeText);
      codeText.setCoords();

      // Renk
      const colorText = FabricService.createText(`Renk: ${product.color}`, {
        left: textX,
        top: currentY + 35,
        fontSize: 18,
        fill: '#666666'
      });
      canvas.add(colorText);
      colorText.setCoords();

      // Fiyat
      if (config.showPrices && product.price) {
        const priceText = FabricService.createText(`${product.price} TL`, {
          left: textX,
          top: currentY + 65,
          fontSize: 28,
          fontWeight: 'bold',
          fill: config.brandColor || '#FF6B00'
        });
        canvas.add(priceText);
        priceText.setCoords();
      }

      // Ayırıcı çizgi
      const line = FabricService.createLine({
        x1: spacing,
        y1: currentY + itemHeight - 10,
        x2: canvas.width! - spacing,
        y2: currentY + itemHeight - 10,
        stroke: '#E0E0E0',
        strokeWidth: 1
      });
      canvas.add(line);
      line.setCoords();

      currentY += itemHeight;

      // Sayfa doldu mu kontrol et
      if (currentY > canvas.height! - spacing) break;
    }
  }

  /**
   * Ürün hücresi ekle
   */
  private static async addProductCell(
    canvas: FabricCanvas,
    product: CollageProduct,
    x: number,
    y: number,
    width: number,
    height: number,
    config: CollageConfig
  ): Promise<void> {
    // Arka plan
    const cellBg = FabricService.createRectangle({
      left: x,
      top: y,
      width: width,
      height: height,
      fill: '#FFFFFF',
      stroke: '#E0E0E0',
      strokeWidth: 1,
      rx: 8,
      ry: 8
    });
    canvas.add(cellBg);
    cellBg.setCoords();

    // Ürün görseli
    const imageHeight = config.showProductInfo ? height * 0.7 : height - 20;
    
    try {
      const img = await FabricService.createImage(product.image_url, {
        left: x + 10,
        top: y + 10,
        scaleToWidth: width - 20
      });

      // Görseli hücreye sığdır
      if (img.height! * img.scaleY! > imageHeight) {
        const scale = imageHeight / img.height!;
        img.scale(scale);
      }

      // Ortala
      img.set({
        left: x + (width - img.width! * img.scaleX!) / 2,
        top: y + 10
      });

      canvas.add(img);
      img.setCoords();
    } catch (error) {
      console.error('Image load error:', error);
      
      // Placeholder
      const placeholder = FabricService.createRectangle({
        left: x + 10,
        top: y + 10,
        width: width - 20,
        height: imageHeight,
        fill: '#F0F0F0'
      });
      canvas.add(placeholder);
      placeholder.setCoords();
    }

    // Ürün bilgileri
    if (config.showProductInfo) {
      const infoY = y + imageHeight + 20;

      // Ürün kodu
      const codeText = FabricService.createText(product.code, {
        left: x + 10,
        top: infoY,
        width: width - 20,
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#000000',
        textAlign: 'center'
      });
      canvas.add(codeText);

      // Renk
      const colorText = FabricService.createText(product.color, {
        left: x + 10,
        top: infoY + 20,
        width: width - 20,
        fontSize: 12,
        fill: '#666666',
        textAlign: 'center'
      });
      canvas.add(colorText);

      // Fiyat
      if (config.showPrices && product.price) {
        const priceText = FabricService.createText(`${product.price} TL`, {
          left: x + 10,
          top: infoY + 38,
          width: width - 20,
          fontSize: 16,
          fontWeight: 'bold',
          fill: config.brandColor || '#FF6B00',
          textAlign: 'center'
        });
        canvas.add(priceText);
        priceText.setCoords();
      }
    }
  }

  /**
   * Header ekle
   */
  private static addHeader(
    canvas: FabricCanvas,
    title: string,
    config: CollageConfig
  ): void {
    // Header background
    const headerBg = FabricService.createRectangle({
      left: 0,
      top: 0,
      width: canvas.width!,
      height: 100,
      fill: config.brandColor || '#000000',
      selectable: false
    });
    canvas.add(headerBg);
    headerBg.setCoords();

    // Title
    const titleText = FabricService.createText(title, {
      left: canvas.width! / 2,
      top: 50,
      fontSize: 48,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });
    canvas.add(titleText);
    titleText.setCoords();
  }

  /**
   * Marka logosu ekle
   */
  private static addBrandLogo(
    canvas: FabricCanvas,
    brandName: string,
    config: CollageConfig
  ): void {
    // Logo placeholder (gerçek logo URL'i varsa kullan)
    const logoText = FabricService.createText(brandName, {
      left: canvas.width! - 150,
      top: 30,
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#FFFFFF'
    });
    canvas.add(logoText);
    logoText.setCoords();
  }

  /**
   * QR kod ekle
   */
  static addQRCode(
    canvas: FabricCanvas,
    url: string,
    x: number,
    y: number,
    size: number = 100
  ): void {
    // QR kod placeholder
    const qrBg = FabricService.createRectangle({
      left: x,
      top: y,
      width: size,
      height: size,
      fill: '#FFFFFF',
      stroke: '#000000',
      strokeWidth: 2
    });
    canvas.add(qrBg);
    qrBg.setCoords();

    const qrText = FabricService.createText('QR', {
      left: x + size / 2,
      top: y + size / 2,
      fontSize: 24,
      fill: '#000000',
      textAlign: 'center',
      originX: 'center',
      originY: 'center'
    });
    canvas.add(qrText);
    qrText.setCoords();
  }
}
