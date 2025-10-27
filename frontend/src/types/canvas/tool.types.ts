import { FabricObject } from 'fabric';

// Tool Types
export type ToolType =
  | 'select'
  | 'text'
  | 'heading'
  | 'paragraph'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'star'
  | 'polygon'
  | 'line'
  | 'arrow'
  | 'image'
  | 'draw'
  | 'eraser'
  | 'pan'
  | 'zoom';

// Tool Configuration
export interface ToolConfig {
  type: ToolType;
  name: string;
  icon: string;
  description: string;
  shortcut?: string;
  cursor?: string;
}

// Tool State
export interface ToolState {
  activeTool: ToolType;
  previousTool: ToolType | null;
  isDrawing: boolean;
  drawingObject: FabricObject | null;
}

// Drawing Options
export interface DrawingOptions {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
}

// Text Options
export interface TextOptions {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}

// Shape Options
export interface ShapeOptions {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  shadow?: ShadowOptions;
  borderRadius?: number;
}

// Shadow Options
export interface ShadowOptions {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

// Image Options
export interface ImageOptions {
  filters?: string[];
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
}

// Tool Actions
export interface ToolActions {
  setActiveTool: (tool: ToolType) => void;
  resetTool: () => void;
  applyToolToSelected: (options: any) => void;
}
