import {
  Canvas,
  FabricObject,
  Textbox,
  Rect,
  Circle,
  Line,
  FabricImage
} from 'fabric';

/**
 * Fabric.js Service - Kolaj sistemi için minimal wrapper
 */
export class FabricService {
  /**
   * Create text object
   */
  static createText(text: string, options: any = {}): Textbox {
    const textContent = String(text || 'Text');
    
    return new Textbox(textContent, {
      left: options.left || 100,
      top: options.top || 100,
      width: options.width || 200,
      fontSize: options.fontSize || 24,
      fontFamily: options.fontFamily || 'Arial',
      fontWeight: options.fontWeight || 'normal',
      fill: options.fill || '#000000',
      textAlign: options.textAlign || 'left',
      selectable: true,
      editable: true,
      ...options
    });
  }

  /**
   * Create rectangle object
   */
  static createRectangle(options: any = {}): Rect {
    return new Rect({
      left: options.left || 100,
      top: options.top || 100,
      width: options.width || 200,
      height: options.height || 100,
      fill: options.fill || '#3B82F6',
      stroke: options.stroke || '#1E40AF',
      strokeWidth: options.strokeWidth || 2,
      rx: options.borderRadius || 0,
      ry: options.borderRadius || 0,
      selectable: options.selectable !== undefined ? options.selectable : true,
      ...options
    });
  }

  /**
   * Create circle object
   */
  static createCircle(options: any = {}): Circle {
    return new Circle({
      left: options.left || 100,
      top: options.top || 100,
      radius: options.radius || 50,
      fill: options.fill || '#10B981',
      stroke: options.stroke || '#047857',
      strokeWidth: options.strokeWidth || 2,
      selectable: true,
      ...options
    });
  }

  /**
   * Create line object
   */
  static createLine(options: any = {}): Line {
    return new Line(
      [
        options.x1 || 50,
        options.y1 || 50,
        options.x2 || 200,
        options.y2 || 50
      ],
      {
        stroke: options.stroke || '#000000',
        strokeWidth: options.strokeWidth || 2,
        selectable: options.selectable !== undefined ? options.selectable : true,
        ...options
      }
    );
  }

  /**
   * Create image object from URL
   */
  static async createImage(url: string, options: any = {}): Promise<FabricImage> {
    const img = await FabricImage.fromURL(url, {
      crossOrigin: 'anonymous'
    });

    img.set({
      left: options.left || 100,
      top: options.top || 100,
      selectable: options.selectable !== undefined ? options.selectable : true,
      ...options
    });

    // Scale image if needed
    if (options.scaleToWidth && img.width) {
      const scale = options.scaleToWidth / img.width;
      img.scale(scale);
    } else if (options.scaleToHeight && img.height) {
      const scale = options.scaleToHeight / img.height;
      img.scale(scale);
    }

    return img;
  }

  /**
   * Add object to canvas
   */
  static addObject(canvas: Canvas, object: FabricObject): void {
    canvas.add(object);
    object.setCoords();
    canvas.requestRenderAll();
  }

  /**
   * Export canvas to data URL
   */
  static exportToDataURL(
    canvas: Canvas,
    options: {
      format?: 'png' | 'jpeg' | 'jpg' | 'webp';
      quality?: number;
      multiplier?: number;
    } = {}
  ): string {
    return canvas.toDataURL({
      format: (options.format || 'png') as any,
      quality: options.quality || 1,
      multiplier: options.multiplier || 1
    });
  }

  /**
   * Export canvas to JSON
   */
  static exportToJSON(canvas: Canvas): any {
    return canvas.toJSON();
  }
}

