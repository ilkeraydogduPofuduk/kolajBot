import { Canvas as FabricCanvas, FabricObject } from 'fabric';

// Canvas State
export interface CanvasState {
  canvas: FabricCanvas | null;
  selectedObjects: FabricObject[];
  zoom: number;
  isReady: boolean;
  isLoading: boolean;
  isDirty: boolean;
}

// Canvas Configuration
export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
  enableGrid?: boolean;
  enableGuides?: boolean;
  enableSnap?: boolean;
  snapThreshold?: number;
}

// Canvas Events
export interface CanvasEvents {
  onReady?: (canvas: FabricCanvas) => void;
  onSelectionChange?: (objects: FabricObject[]) => void;
  onObjectModified?: (object: FabricObject) => void;
  onObjectAdded?: (object: FabricObject) => void;
  onObjectRemoved?: (object: FabricObject) => void;
  onCanvasModified?: () => void;
}

// Canvas Actions
export interface CanvasActions {
  clear: () => void;
  render: () => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
  fitToScreen: () => void;
  centerObject: (object: FabricObject) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  deselectAll: () => void;
}

// Canvas Export Options
export interface CanvasExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf' | 'json';
  quality?: number;
  multiplier?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

// Canvas History State
export interface CanvasHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  historyIndex: number;
  historyLength: number;
}

// Canvas Grid Options
export interface CanvasGridOptions {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
}

// Canvas Guide Options
export interface CanvasGuideOptions {
  enabled: boolean;
  color: string;
  width: number;
}
