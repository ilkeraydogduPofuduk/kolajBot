import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, ActiveSelection } from 'fabric';
import { toast } from 'react-hot-toast';

interface TemplateCanvasState {
  canvas: Canvas | null;
  selectedObject: any | null;
  loading: boolean;
}

export const useCanvas = () => {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  
  const [canvasState, setCanvasState] = useState<TemplateCanvasState>({
    canvas: null,
    selectedObject: null,
    loading: false,
  });

  // Initialize canvas
  const initializeCanvas = useCallback(() => {
    if (!canvasElementRef.current || canvasState.canvas) return null;

    console.log('Starting canvas initialization...');
    console.log('Canvas element:', canvasElementRef.current);
    setCanvasState(prev => ({ ...prev, loading: true }));

    // Store references before setTimeout
    const canvasEl = canvasElementRef.current;
    
    if (!canvasEl) {
      console.error('Canvas element not found');
      setCanvasState(prev => ({ ...prev, loading: false }));
      return null;
    }

    try {
      
        // Optimal canvas dimensions for better workspace
        const canvasWidth = 700;
        const canvasHeight = 900;
        
        console.log('Canvas dimensions:', { canvasWidth, canvasHeight });
      
      const canvas = new Canvas(canvasEl, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
      });

      // Force canvas dimensions - multiple approaches
      canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
      canvasEl.width = canvasWidth;
      canvasEl.height = canvasHeight;
      
      // Force CSS dimensions
      canvasEl.style.width = `${canvasWidth}px`;
      canvasEl.style.height = `${canvasHeight}px`;
      canvasEl.style.maxWidth = 'none';
      canvasEl.style.maxHeight = 'none';
      
      // Force Fabric.js dimensions again
      setTimeout(() => {
        canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
        canvas.renderAll();
      }, 100);

      console.log('Canvas created:', canvas);
      canvas.setZoom(1);
      
      // Enable selection and interaction
      canvas.selection = true;
      canvas.perPixelTargetFind = true;
      canvas.targetFindTolerance = 5;

        // Enhanced selection events
        canvas.on('selection:created', (e: any) => {
          const selected = e.selected?.[0] || null;
          setCanvasState(prev => ({ ...prev, selectedObject: selected }));
          if (selected) {
            console.log('Object selected:', selected.type, selected);
            // Ensure object is editable
            selected.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            });
            canvas.renderAll();
          }
        });

        canvas.on('selection:updated', (e: any) => {
          const selected = e.selected?.[0] || null;
          setCanvasState(prev => ({ ...prev, selectedObject: selected }));
          if (selected) {
            selected.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            });
          }
        });

        canvas.on('selection:cleared', () => {
          setCanvasState(prev => ({ ...prev, selectedObject: null }));
          console.log('Selection cleared');
        });

        // Object modification events
        canvas.on('object:modified', (e: any) => {
          console.log('Object modified:', e.target?.type);
          canvas.renderAll();
        });

        canvas.on('object:moving', (e: any) => {
          e.target?.setCoords();
        });

        canvas.on('object:scaling', (e: any) => {
          e.target?.setCoords();
        });

        canvas.on('object:rotating', (e: any) => {
          e.target?.setCoords();
        });

        // Text editing events
        canvas.on('text:editing:entered', (e: any) => {
          console.log('Text editing started');
        });

        canvas.on('text:editing:exited', (e: any) => {
          console.log('Text editing ended');
          canvas.renderAll();
        });

        // Double-click to edit text
        canvas.on('mouse:dblclick', (e: any) => {
          const target = e.target;
          if (target && target.type === 'textbox') {
            console.log('Double-click on textbox, entering edit mode');
            (target as any).enterEditing();
            (target as any).selectAll();
            canvas.renderAll();
          }
        });

        // Mouse events for better interaction
        canvas.on('mouse:down', (e: any) => {
          console.log('Mouse down on:', e.target?.type || 'canvas');
        });

        canvas.on('mouse:up', (e: any) => {
          console.log('Mouse up on:', e.target?.type || 'canvas');
        });

      console.log('Canvas created successfully');
      
      // Make canvas visible
      if (canvasEl) {
        canvasEl.style.display = 'block';
        canvasEl.style.borderRadius = '8px';
        canvasEl.style.backgroundColor = '#ffffff';
      }
      
      setCanvasState(prev => ({ ...prev, canvas, loading: false }));
      
      return canvas;
    } catch (error) {
      console.error('Canvas initialization failed:', error);
      setCanvasState(prev => ({ ...prev, loading: false }));
      toast.error('Canvas başlatılamadı');
      return null;
    }
  }, [canvasState.canvas]);

  // Cleanup canvas
  const cleanupCanvas = useCallback(() => {
    if (canvasState.canvas) {
      canvasState.canvas.dispose();
      setCanvasState({
        canvas: null,
        selectedObject: null,
        loading: false,
      });
    }
  }, [canvasState.canvas]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasState.canvas && canvasContainerRef.current) {
        const container = canvasContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        if (containerRect.width > 0 && containerRect.height > 0) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          const availableWidth = Math.min(containerRect.width || viewportWidth - 400, 700);
          const availableHeight = Math.min(containerRect.height || viewportHeight - 80, 900);
          
          const aspectRatio = 7/9; // 700x900 ratio
          let canvasWidth, canvasHeight;
          
          if (availableWidth / availableHeight > aspectRatio) {
            canvasHeight = availableHeight;
            canvasWidth = canvasHeight * aspectRatio;
          } else {
            canvasWidth = availableWidth;
            canvasHeight = canvasWidth / aspectRatio;
          }
          
          canvasWidth = Math.max(canvasWidth, 400);
          canvasHeight = Math.max(canvasHeight, 514);
          
          canvasState.canvas.setDimensions({ width: canvasWidth, height: canvasHeight });
          canvasState.canvas.renderAll();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasState.canvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!canvasState.canvas) return;

      // Ctrl+Z - Undo (simulated)
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        toast('Geri alma özelliği yakında eklenecek!', { icon: 'ℹ️' });
      }

      // Delete - Remove selected object
      if (e.key === 'Delete' && canvasState.selectedObject) {
        e.preventDefault();
        canvasState.canvas.remove(canvasState.selectedObject);
        setCanvasState(prev => ({ ...prev, selectedObject: null }));
        canvasState.canvas.renderAll();
        toast.success('Öğe silindi!');
      }

      // Ctrl+A - Select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        const objects = canvasState.canvas.getObjects();
        if (objects.length > 0) {
          const sel = new ActiveSelection(objects, {
            canvas: canvasState.canvas,
          });
          canvasState.canvas.setActiveObject(sel);
          canvasState.canvas.renderAll();
        }
      }

      // Escape - Deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        canvasState.canvas.discardActiveObject();
        setCanvasState(prev => ({ ...prev, selectedObject: null }));
        canvasState.canvas.renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasState.canvas, canvasState.selectedObject]);

  // Canvas operations
  const clearCanvas = useCallback(() => {
    if (canvasState.canvas) {
      canvasState.canvas.clear();
      canvasState.canvas.renderAll();
    }
  }, [canvasState.canvas]);

  const renderCanvas = useCallback(() => {
    if (canvasState.canvas) {
      canvasState.canvas.renderAll();
    }
  }, [canvasState.canvas]);

  const setZoom = useCallback((zoom: number) => {
    if (canvasState.canvas) {
      canvasState.canvas.setZoom(zoom);
      canvasState.canvas.renderAll();
    }
  }, [canvasState.canvas]);

  const getZoom = useCallback(() => {
    return canvasState.canvas?.getZoom() || 1;
  }, [canvasState.canvas]);

  return {
    canvasElementRef,
    canvasContainerRef,
    canvas: canvasState.canvas,
    selectedObject: canvasState.selectedObject,
    loading: canvasState.loading,
    initializeCanvas,
    cleanupCanvas,
    clearCanvas,
    renderCanvas,
    setZoom,
    getZoom,
  };
};