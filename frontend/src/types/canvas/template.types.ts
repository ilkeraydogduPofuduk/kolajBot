// Template Data Structure
export interface TemplateData {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  thumbnail?: string;
  canvasData: any; // Fabric.js JSON
  width: number;
  height: number;
  backgroundColor: string;
  createdAt?: string;
  updatedAt?: string;
  version: string;
}

// Template Category
export interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  subcategories?: TemplateSubcategory[];
}

// Template Subcategory
export interface TemplateSubcategory {
  id: string;
  name: string;
  description?: string;
}

// Template Metadata
export interface TemplateMetadata {
  author?: string;
  license?: string;
  keywords?: string[];
  dimensions: {
    width: number;
    height: number;
  };
  objectCount: number;
  layerCount: number;
}

// Template Save Options
export interface TemplateSaveOptions {
  name: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  thumbnail?: boolean;
}

// Template Load Options
export interface TemplateLoadOptions {
  clearCanvas?: boolean;
  centerContent?: boolean;
  fitToCanvas?: boolean;
}

// Template Export Options
export interface TemplateExportOptions {
  format: 'json' | 'file';
  includeMetadata?: boolean;
  includeThumbnail?: boolean;
  compress?: boolean;
}

// Template Actions
export interface TemplateActions {
  saveTemplate: (options: TemplateSaveOptions) => Promise<TemplateData>;
  loadTemplate: (template: TemplateData, options?: TemplateLoadOptions) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  exportTemplate: (template: TemplateData, options?: TemplateExportOptions) => void;
  importTemplate: (file: File) => Promise<TemplateData>;
  duplicateTemplate: (templateId: string) => Promise<TemplateData>;
}
