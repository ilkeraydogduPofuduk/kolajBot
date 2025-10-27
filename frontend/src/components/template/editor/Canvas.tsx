import React, { useRef, useEffect, useState, useCallback } from 'react';
// @ts-ignore - Fabric.js import
import * as fabric from 'fabric';

interface CanvasProps {
  width: number;
  height: number;
  backgroundColor: string;
  zoom: number;
  onObjectSelect: (object: any) => void;
  onObjectDeselect: () => void;
  onObjectModified: () => void;
  onObjectAdded: () => void;
  onObjectRemoved: () => void;
  activeTool: string;
  onCanvasReady: (canvas: fabric.Canvas) => void;
  initialData?: any;
}

const Canvas: React.FC<CanvasProps> = ({
  width,
  height,
  backgroundColor,
  zoom,
  onObjectSelect,
  onObjectDeselect,
  onObjectModified,
  onObjectAdded,
  onObjectRemoved,
  activeTool,
  onCanvasReady,
  initialData
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current || canvas) return; // Prevent double initialization

    try {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: width,
        height: height,
        backgroundColor: backgroundColor,
        selection: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        allowTouchScrolling: true
      });

      setCanvas(fabricCanvas);
      setIsReady(true);
      onCanvasReady(fabricCanvas);

      // Event listeners
      fabricCanvas.on('selection:created', (e: any) => {
        onObjectSelect(e.selected?.[0] || null);
      });

      fabricCanvas.on('selection:updated', (e: any) => {
        onObjectSelect(e.selected?.[0] || null);
      });

      fabricCanvas.on('selection:cleared', () => {
        onObjectDeselect();
      });

      fabricCanvas.on('object:modified', () => {
        onObjectModified();
      });

      fabricCanvas.on('object:added', () => {
        onObjectAdded();
      });

      fabricCanvas.on('object:removed', () => {
        onObjectRemoved();
      });

      // Load initial data if provided
      if (initialData) {
        fabricCanvas.loadFromJSON(initialData, () => {
          fabricCanvas.renderAll();
        });
      }

    } catch (error) {
      console.error('Canvas initialization error:', error);
    }

    return () => {
      // Use closure to access the fabricCanvas instance
      const currentCanvas = canvas;
      if (currentCanvas && typeof (currentCanvas as any).dispose === 'function') {
        (currentCanvas as any).dispose();
        setCanvas(null);
        setIsReady(false);
      }
    };
  }, [width, height, backgroundColor]); // Add dependencies

  // Update canvas properties
  useEffect(() => {
    if (canvas && isReady) {
      canvas.setWidth(width);
      canvas.setHeight(height);
      canvas.backgroundColor = backgroundColor;
      canvas.renderAll();
    }
  }, [canvas, width, height, backgroundColor, isReady]);

  // Update zoom
  useEffect(() => {
    if (canvas && isReady) {
      canvas.setZoom(zoom);
      canvas.renderAll();
    }
  }, [canvas, zoom, isReady]);

  // Handle tool changes
  useEffect(() => {
    if (!canvas || !isReady) return;

    // Set cursor based on active tool
    switch (activeTool) {
      case 'select':
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        break;
      case 'text':
        canvas.defaultCursor = 'text';
        canvas.hoverCursor = 'text';
        break;
      case 'image':
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        break;
      default:
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
    }
  }, [canvas, activeTool, isReady]);

  // Canvas click handler for adding objects
  const handleCanvasClick = useCallback((e: any) => {
    if (!canvas || !isReady) return;

    const pointer = canvas.getPointer(e.e);
    
    switch (activeTool) {
      case 'text':
        addText(pointer.x, pointer.y);
        break;
      case 'rectangle':
        addRectangle(pointer.x, pointer.y);
        break;
      case 'circle':
        addCircle(pointer.x, pointer.y);
        break;
      case 'triangle':
        addTriangle(pointer.x, pointer.y);
        break;
      case 'star':
        addStar(pointer.x, pointer.y);
        break;
      case 'heart':
        addHeart(pointer.x, pointer.y);
        break;
      case 'diamond':
        addDiamond(pointer.x, pointer.y);
        break;
      case 'hexagon':
        addHexagon(pointer.x, pointer.y);
        break;
      case 'line':
        addLine(pointer.x, pointer.y);
        break;
    }
  }, [canvas, activeTool, isReady]);

  // Add text object
  const addText = (x: number, y: number) => {
    if (!canvas) return;
    
    const text = new fabric.Text('Metin', {
      left: x,
      top: y,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000'
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // Add rectangle
  const addRectangle = (x: number, y: number) => {
    if (!canvas) return;
    
    const rect = new fabric.Rect({
      left: x,
      top: y,
      width: 100,
      height: 100,
      fill: '#3B82F6',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  // Add circle
  const addCircle = (x: number, y: number) => {
    if (!canvas) return;
    
    const circle = new fabric.Circle({
      left: x,
      top: y,
      radius: 50,
      fill: '#3B82F6',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(circle);
    canvas.setActiveObject(circle);
    canvas.renderAll();
  };

  // Add triangle
  const addTriangle = (x: number, y: number) => {
    if (!canvas) return;
    
    const triangle = new fabric.Triangle({
      left: x,
      top: y,
      width: 100,
      height: 100,
      fill: '#3B82F6',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(triangle);
    canvas.setActiveObject(triangle);
    canvas.renderAll();
  };

  // Add star
  const addStar = (x: number, y: number) => {
    if (!canvas) return;
    
    const star = new fabric.Polygon([
      { x: 0, y: -50 },
      { x: 14, y: -20 },
      { x: 47, y: -15 },
      { x: 23, y: 7 },
      { x: 29, y: 40 },
      { x: 0, y: 25 },
      { x: -29, y: 40 },
      { x: -23, y: 7 },
      { x: -47, y: -15 },
      { x: -14, y: -20 }
    ], {
      left: x,
      top: y,
      fill: '#3B82F6',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(star);
    canvas.setActiveObject(star);
    canvas.renderAll();
  };

  // Add heart
  const addHeart = (x: number, y: number) => {
    if (!canvas) return;
    
    const heart = new fabric.Path('M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5 C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z', {
      left: x,
      top: y,
      scaleX: 2,
      scaleY: 2,
      fill: '#ef4444',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(heart);
    canvas.setActiveObject(heart);
    canvas.renderAll();
  };

  // Add diamond
  const addDiamond = (x: number, y: number) => {
    if (!canvas) return;
    
    const diamond = new fabric.Polygon([
      { x: 0, y: -50 },
      { x: 50, y: 0 },
      { x: 0, y: 50 },
      { x: -50, y: 0 }
    ], {
      left: x,
      top: y,
      fill: '#8b5cf6',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(diamond);
    canvas.setActiveObject(diamond);
    canvas.renderAll();
  };

  // Add hexagon
  const addHexagon = (x: number, y: number) => {
    if (!canvas) return;
    
    const hexagon = new fabric.Polygon([
      { x: 0, y: -50 },
      { x: 43, y: -25 },
      { x: 43, y: 25 },
      { x: 0, y: 50 },
      { x: -43, y: 25 },
      { x: -43, y: -25 }
    ], {
      left: x,
      top: y,
      fill: '#10b981',
      stroke: '#000000',
      strokeWidth: 2
    });
    
    canvas.add(hexagon);
    canvas.setActiveObject(hexagon);
    canvas.renderAll();
  };

  // Add line
  const addLine = (x: number, y: number) => {
    if (!canvas) return;
    
    const line = new fabric.Line([0, 0, 100, 0], {
      left: x,
      top: y,
      stroke: '#000000',
      strokeWidth: 3
    });
    
    canvas.add(line);
    canvas.setActiveObject(line);
    canvas.renderAll();
  };

  // Add canvas click listener
  useEffect(() => {
    if (canvas && isReady) {
      canvas.on('mouse:down', handleCanvasClick);
      
      return () => {
        canvas.off('mouse:down', handleCanvasClick);
      };
    }
  }, [canvas, handleCanvasClick, isReady]);

  return (
    <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
      <div className="bg-white shadow-lg rounded-lg p-4">
        <canvas
          ref={canvasRef}
          className="border border-gray-300"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            cursor: activeTool === 'select' ? 'default' : 'crosshair'
          }}
        />
      </div>
    </div>
  );
};

export default Canvas;
