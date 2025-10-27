import { useCallback } from 'react';
import { Canvas } from 'fabric';
import { toast } from 'react-hot-toast';
import { Product } from '../../api/products';
import { 
  createMinimalTemplate,
  createCatalogTemplate,
  createSocialTemplate,
  createInstagramTemplate,
  createModernTemplate
} from '../../services/template/templatePresets';
import { createStandardTemplate } from '../../services/template/templateCreators';

export const useAITemplate = () => {
  // AI Template Generator - Simulates AI by randomly selecting templates
  const generateAITemplate = useCallback(async (canvas: Canvas, product: Product) => {
    if (!canvas || !product) return;
    
    toast.loading('AI şablon üretiliyor...', { duration: 2000 });
    
    const templates = [
      () => createStandardTemplate(canvas, product),
      () => createMinimalTemplate(canvas, product),
      () => createCatalogTemplate(canvas, product),
      () => createSocialTemplate(canvas, product),
      () => createInstagramTemplate(canvas, product),
      () => createModernTemplate(canvas, product),
    ];
    
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    setTimeout(() => {
      randomTemplate();
      toast.success('AI şablon üretildi!');
    }, 2000);
  }, []);

  // Smart Layout Optimization
  const optimizeLayoutAI = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    toast.loading('AI layout optimizasyonu yapılıyor...', { duration: 2000 });
    
    const objects = canvas.getObjects();
    
    // Separate objects by type
    const textObjects = objects.filter(obj => obj.type === 'textbox');
    const imageObjects = objects.filter(obj => obj.type === 'image');
    const shapeObjects = objects.filter(obj => obj.type === 'rect' || obj.type === 'circle');
    
    setTimeout(() => {
      let yOffset = 50;
      const canvasWidth = canvas.width!;
      
      // Position headers first
      textObjects.forEach((obj, index) => {
        const fontSize = (obj as any).fontSize || 16;
        if (fontSize > 24) { // Header text
          obj.set({
            left: canvasWidth / 2,
            top: yOffset,
            originX: 'center',
          });
          yOffset += fontSize + 20;
        }
      });
      
      // Position images in the middle
      imageObjects.forEach((obj) => {
        obj.set({
          left: canvasWidth / 2,
          top: yOffset,
          originX: 'center',
        });
        yOffset += (obj.height! * (obj.scaleY || 1)) + 30;
      });
      
      // Position regular text below images
      textObjects.forEach((obj) => {
        const fontSize = (obj as any).fontSize || 16;
        if (fontSize <= 24) { // Regular text
          obj.set({
            left: canvasWidth / 2,
            top: yOffset,
            originX: 'center',
          });
          yOffset += fontSize + 15;
        }
      });
      
      // Position shapes at the bottom
      shapeObjects.forEach((obj) => {
        obj.set({
          left: canvasWidth / 2,
          top: yOffset,
          originX: 'center',
        });
        yOffset += (obj.height! * (obj.scaleY || 1)) + 20;
      });
      
      canvas.renderAll();
      toast.success('AI layout optimizasyonu tamamlandı!');
    }, 2000);
  }, []);

  // Smart Color Harmony Generator
  const generateColorHarmonyAI = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    toast.loading('AI renk harmonisi oluşturuluyor...', { duration: 1500 });
    
    // Color harmony algorithms
    const colorHarmonies = [
      // Monochromatic
      ['#1a365d', '#2d3748', '#4a5568', '#718096', '#a0aec0'],
      // Analogous
      ['#3182ce', '#3182ce', '#38a169', '#38a169', '#d69e2e'],
      // Complementary
      ['#e53e3e', '#38a169', '#e53e3e', '#38a169', '#e53e3e'],
      // Triadic
      ['#e53e3e', '#3182ce', '#38a169', '#d69e2e', '#805ad5'],
      // Split Complementary
      ['#3182ce', '#e53e3e', '#d69e2e', '#3182ce', '#e53e3e'],
    ];
    
    const selectedHarmony = colorHarmonies[Math.floor(Math.random() * colorHarmonies.length)];
    
    setTimeout(() => {
      const objects = canvas.getObjects();
      
      objects.forEach((obj, index) => {
        const colorIndex = index % selectedHarmony.length;
        
        if (obj.type === 'textbox') {
          obj.set({ fill: selectedHarmony[colorIndex] });
        } else if (obj.type === 'rect' || obj.type === 'circle') {
          obj.set({ 
            fill: selectedHarmony[colorIndex],
            stroke: selectedHarmony[(colorIndex + 1) % selectedHarmony.length]
          });
        }
      });
      
      canvas.renderAll();
      toast.success('AI renk harmonisi uygulandı!');
    }, 1500);
  }, []);

  // Smart Typography Suggestions
  const optimizeTypographyAI = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    toast.loading('AI tipografi optimizasyonu yapılıyor...', { duration: 1500 });
    
    const fontCombinations = [
      { header: 'Playfair Display', body: 'Source Sans Pro' },
      { header: 'Montserrat', body: 'Open Sans' },
      { header: 'Roboto Slab', body: 'Roboto' },
      { header: 'Oswald', body: 'Lato' },
      { header: 'Merriweather', body: 'Lato' },
    ];
    
    const selectedCombination = fontCombinations[Math.floor(Math.random() * fontCombinations.length)];
    
    setTimeout(() => {
      const textObjects = canvas.getObjects().filter(obj => obj.type === 'textbox');
      
      textObjects.forEach((obj) => {
        const fontSize = (obj as any).fontSize || 16;
        const fontFamily = fontSize > 24 ? selectedCombination.header : selectedCombination.body;
        
        obj.set({ 
          fontFamily: fontFamily,
          fontWeight: fontSize > 24 ? 'bold' : 'normal'
        });
      });
      
      canvas.renderAll();
      toast.success('AI tipografi optimizasyonu tamamlandı!');
    }, 1500);
  }, []);

  // Smart Spacing and Alignment
  const optimizeSpacingAI = useCallback((canvas: Canvas) => {
    if (!canvas) return;
    
    toast.loading('AI boşluk optimizasyonu yapılıyor...', { duration: 1500 });
    
    setTimeout(() => {
      const objects = canvas.getObjects();
      const canvasWidth = canvas.width!;
      const canvasHeight = canvas.height!;
      
      // Calculate golden ratio spacing
      const goldenRatio = 1.618;
      const baseSpacing = canvasHeight / (objects.length * goldenRatio);
      
      objects.sort((a, b) => (a.top || 0) - (b.top || 0));
      
      let currentY = baseSpacing;
      
      objects.forEach((obj) => {
        obj.set({
          left: canvasWidth / 2,
          top: currentY,
          originX: 'center',
        });
        
        const objectHeight = (obj.height! * (obj.scaleY || 1));
        currentY += objectHeight + baseSpacing;
      });
      
      canvas.renderAll();
      toast.success('AI boşluk optimizasyonu tamamlandı!');
    }, 1500);
  }, []);

  return {
    generateAITemplate,
    optimizeLayoutAI,
    generateColorHarmonyAI,
    optimizeTypographyAI,
    optimizeSpacingAI,
  };
};
