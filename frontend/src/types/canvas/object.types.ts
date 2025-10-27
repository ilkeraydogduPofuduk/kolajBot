import { FabricObject } from 'fabric';

// Object Type
export type ObjectType =
  | 'text'
  | 'textbox'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'polygon'
  | 'line'
  | 'image'
  | 'group'
  | 'path';

// Object Properties
export interface ObjectProperties {
  id?: string;
  name?: string;
  type: ObjectType;
  left: number;
  top: number;
  width?: number;
  height?: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  opacity: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible: boolean;
  selectable: boolean;
  locked: boolean;
}

// Layer Info
export interface LayerInfo {
  id: string;
  name: string;
  type: ObjectType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  thumbnail?: string;
}

// Object Transform
export interface ObjectTransform {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  flipX: boolean;
  flipY: boolean;
}

// Object Style
export interface ObjectStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

// Alignment Options
export type AlignmentType =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

// Distribution Options
export type DistributionType =
  | 'horizontal'
  | 'vertical';

// Object Actions
export interface ObjectActions {
  updateProperties: (object: FabricObject, props: Partial<ObjectProperties>) => void;
  deleteObject: (object: FabricObject) => void;
  duplicateObject: (object: FabricObject) => Promise<FabricObject>;
  alignObjects: (objects: FabricObject[], alignment: AlignmentType) => void;
  distributeObjects: (objects: FabricObject[], distribution: DistributionType) => void;
  groupObjects: (objects: FabricObject[]) => FabricObject;
  ungroupObjects: (group: FabricObject) => FabricObject[];
  bringToFront: (object: FabricObject) => void;
  sendToBack: (object: FabricObject) => void;
  bringForward: (object: FabricObject) => void;
  sendBackward: (object: FabricObject) => void;
}
