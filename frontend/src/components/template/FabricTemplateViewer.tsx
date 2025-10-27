import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from 'fabric';
import { toast } from 'react-hot-toast';

interface FabricTemplateViewerProps {
  templateData: any;
  width?: number;
  height?: number;
  className?: string;
}

const FabricTemplateViewer: React.FC<FabricTemplateViewerProps> = ({
  templateData,
  width = 700,
  height = 900,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !templateData) return;

    try {
      setLoading(true);
      setError(null);

      // Create new canvas
      const newCanvas = new Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: templateData.background || '#ffffff',
        selection: false, // Disable selection for viewer
        interactive: false // Disable interaction for viewer
      });

      // Load template data
      newCanvas.loadFromJSON(templateData, () => {
        newCanvas.renderAll();
        setCanvas(newCanvas);
        setLoading(false);
        console.log('Fabric.js template loaded successfully');
      });

    } catch (err) {
      console.error('Error loading Fabric.js template:', err);
      setError('Şablon yüklenirken hata oluştu');
      setLoading(false);
    }

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [templateData, width, height]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`} style={{ width, height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Şablon yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg ${className}`} style={{ width, height }}>
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default FabricTemplateViewer;
