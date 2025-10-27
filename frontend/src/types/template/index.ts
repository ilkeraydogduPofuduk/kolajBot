import { Canvas, FabricObject } from 'fabric';
import { Product } from '../../api/products';
import { Template } from '../../api/templates';

export interface TemplateCanvasState {
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  loading: boolean;
}

export interface TemplateSettings {
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  zoom: number;
}

export interface TemplateCreatorProps {
  product: Product;
  canvas: Canvas;
}

export interface TemplateExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  multiplier: number;
  enableRetinaScaling?: boolean;
}

export interface TemplateToolbarProps {
  canvas: Canvas | null;
  selectedObject: FabricObject | null;
  onAddText: () => void;
  onAddShape: (type: 'rect' | 'circle') => void;
  onAddImage: () => void;
  onDeleteObject: () => void;
}

export interface TemplatePropertiesProps {
  selectedObject: FabricObject | null;
  canvas: Canvas | null;
  product: Product;
  onObjectUpdate: () => void;
}

export interface SavedTemplatesProps {
  templates: Template[];
  onLoadTemplate: (template: Template) => void;
}

export type TemplateType = 
  | 'standard' 
  | 'minimal' 
  | 'catalog' 
  | 'social' 
  | 'instagram' 
  | 'modern';

export interface TemplatePreset {
  id: TemplateType;
  name: string;
  description: string;
  creator: (canvas: Canvas, product: Product) => Promise<void>;
}
