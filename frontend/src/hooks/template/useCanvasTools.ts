import { useCallback } from 'react';
import { Canvas, FabricImage, Textbox, Rect, Circle as FabricCircle, Shadow } from 'fabric';
import { toast } from 'react-hot-toast';

export const useCanvasTools = () => {
  // Add text element
  const addTextElement = useCallback((canvas: Canvas, text: string, options: any = {}) => {
    if (!canvas) return;
    
    const textElement = new Textbox(text, {
      left: 100,
      top: 100,
      fontSize: options.fontSize || 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: options.fontWeight || 'normal',
      fill: options.fill || '#000000',
      selectable: true,
      editable: true,
      ...options
    });
    
    canvas.add(textElement);
    canvas.setActiveObject(textElement);
    canvas.renderAll();
  }, []);

  // Add shape
  const addShape = useCallback((canvas: Canvas, type: 'rect' | 'circle') => {
    if (!canvas) return;

    let shape;
    if (type === 'rect') {
      shape = new Rect({
        left: 100,
        top: 200,
        width: 200,
        height: 100,
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        rx: 10,
        ry: 10,
        selectable: true,
        evented: true,
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 10,
          offsetX: 5,
          offsetY: 5,
        }),
      });
    } else if (type === 'circle') {
      shape = new FabricCircle({
        left: 100,
        top: 200,
        radius: 50,
        fill: '#10b981',
        stroke: '#047857',
        strokeWidth: 2,
        selectable: true,
        evented: true,
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 10,
          offsetX: 5,
          offsetY: 5,
        }),
      });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, []);

  // Add image from file
  const addImageFromFile = useCallback((canvas: Canvas) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && canvas) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgUrl = event.target?.result as string;
          FabricImage.fromURL(imgUrl).then((img) => {
            img.scaleToWidth(200);
            img.set({
              left: 100,
              top: 200,
              selectable: true,
              evented: true,
            });
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, []);

  // Delete selected object
  const deleteObject = useCallback((canvas: Canvas, selectedObject: any) => {
    if (!canvas || !selectedObject) return;

    canvas.remove(selectedObject);
    canvas.renderAll();
  }, []);

  // Advanced Effects
  const addGradientBackground = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    const gradient = new Rect({
      left: 0,
      top: 0,
      width: canvas.width!,
      height: canvas.height!,
      fill: 'linear-gradient(45deg, #667eea 0%, #764ba2 100%)',
      selectable: false,
      evented: false,
    });
    
    canvas.add(gradient);
    canvas.renderAll();
    toast.success('Gradient arka plan eklendi!');
  }, []);

  const addWatermark = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    const watermark = new Textbox('DIZAYN BRANDS', {
      left: canvas.width! - 150,
      top: canvas.height! - 50,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      fill: 'rgba(0,0,0,0.3)',
      angle: -45,
      selectable: true,
      editable: true,
    });
    
    canvas.add(watermark);
    canvas.renderAll();
    toast.success('Filigran eklendi!');
  }, []);

  const addBorder = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    const border = new Rect({
      left: 10,
      top: 10,
      width: canvas.width! - 20,
      height: canvas.height! - 20,
      fill: 'transparent',
      stroke: '#333333',
      strokeWidth: 4,
      rx: 10,
      ry: 10,
      selectable: true,
      evented: true,
    });
    
    canvas.add(border);
    canvas.renderAll();
    toast.success('Çerçeve eklendi!');
  }, []);

  const addShadowToSelected = useCallback((selectedObject: any, canvas: Canvas) => {
    if (!canvas || !selectedObject) return;
    
    selectedObject.set({
      shadow: new Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 15,
        offsetX: 5,
        offsetY: 5,
      })
    });
    
    canvas.renderAll();
    toast.success('Gölge eklendi!');
  }, []);

  // AI-Powered Functions
  const optimizeLayout = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    toast.loading('Layout optimize ediliyor...', { duration: 1500 });
    
    const objects = canvas.getObjects();
    let yOffset = 50;
    
    objects.forEach((obj) => {
      if (obj.type === 'textbox') {
        obj.set({
          left: canvas.width! / 2,
          top: yOffset,
          originX: 'center',
        });
        yOffset += 60;
      } else if (obj.type === 'image') {
        obj.set({
          left: canvas.width! / 2,
          top: yOffset,
          originX: 'center',
        });
        yOffset += (obj.height! * (obj.scaleY || 1)) + 20;
      }
    });
    
    setTimeout(() => {
      canvas.renderAll();
      toast.success('Layout optimize edildi!');
    }, 1500);
  }, []);

  const generateColorPalette = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    const colors = [
      ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
      ['#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055'],
      ['#00B894', '#00CEC9', '#0984E3', '#6C5CE7', '#A29BFE'],
      ['#E84393', '#FD79A8', '#FDCB6E', '#E17055', '#D63031'],
    ];
    
    const selectedPalette = colors[Math.floor(Math.random() * colors.length)];
    
    const objects = canvas.getObjects();
    objects.forEach((obj, index) => {
      if (obj.type === 'rect' || obj.type === 'circle') {
        obj.set({ fill: selectedPalette[index % selectedPalette.length] });
      } else if (obj.type === 'textbox') {
        obj.set({ fill: selectedPalette[index % selectedPalette.length] });
      }
    });
    
    canvas.renderAll();
    toast.success('Renk paleti uygulandı!');
  }, []);

  return {
    addTextElement,
    addShape,
    addImageFromFile,
    deleteObject,
    addGradientBackground,
    addWatermark,
    addBorder,
    addShadowToSelected,
    optimizeLayout,
    generateColorPalette,
  };
};
