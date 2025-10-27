import api from '../../utils/api';

export interface Template {
  id: string;
  name: string;
  description?: string;
  template_type: 'collage' | 'social_media' | 'banner' | 'poster';
  type?: string; // For backward compatibility
  template_data: any;
  canvas_data?: any;
  thumbnail?: string;
  is_active: boolean;
  is_auto_generated: boolean;
  is_master_template: boolean;
  product_id?: number;
  brand_id?: number;
  created_by: number;
  visibility: 'PUBLIC' | 'PRIVATE' | 'BRAND_ONLY';
  category?: string;
  subcategory?: string;
  placeholders: Placeholder[];
  assigned_brands: number[];
  created_at: string;
  updated_at: string;
}

export interface Placeholder {
  id: string;
  name: string;
  type: 'text' | 'image' | 'number' | 'date' | 'boolean' | 'array';
  value?: any;
  placeholder: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  category: 'product' | 'brand' | 'contact' | 'general';
}

export interface TemplateCreateRequest {
  name: string;
  description?: string;
  template_type: string;
  template_data: any;
  canvas_data?: any;
  category?: string;
  subcategory?: string;
  placeholders: Placeholder[];
  visibility: 'PUBLIC' | 'PRIVATE' | 'BRAND_ONLY';
}

export interface TemplateUpdateRequest {
  name?: string;
  description?: string;
  template_data?: any;
  canvas_data?: any;
  placeholders?: Placeholder[];
  visibility?: 'PUBLIC' | 'PRIVATE' | 'BRAND_ONLY';
  is_active?: boolean;
}

export interface TemplatesResponse {
  templates: Template[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TemplatePreviewData {
  [key: string]: any;
}

export const templatesAPI = {
  // Get all templates with pagination and filtering
  getTemplates: async (
    page: number = 1,
    perPage: number = 20,
    search?: string,
    category?: string,
    templateType?: string,
    visibility?: string,
    isMaster?: boolean
  ): Promise<TemplatesResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (templateType) params.append('template_type', templateType);
    if (visibility) params.append('visibility', visibility);
    if (isMaster !== undefined) params.append('is_master', isMaster.toString());
    
    const response = await api.get(`/api/templates?${params}`);
    return response.data;
  },

  // Get template by ID
  getTemplate: async (id: string): Promise<Template> => {
    const response = await api.get(`/api/templates/${id}`);
    return response.data;
  },

  // Create new template
  createTemplate: async (templateData: TemplateCreateRequest): Promise<Template> => {
    const response = await api.post('/api/templates', templateData);
    return response.data;
  },

  // Update template
  updateTemplate: async (id: string, templateData: TemplateUpdateRequest): Promise<Template> => {
    const response = await api.put(`/api/templates/${id}`, templateData);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/templates/${id}`);
    return response.data;
  },

  // Get user's templates
  getUserTemplates: async (): Promise<Template[]> => {
    const response = await api.get('/api/templates/user');
    return response.data;
  },

  // Get master templates (gallery)
  getMasterTemplates: async (): Promise<Template[]> => {
    const response = await api.get('/api/templates/master');
    return response.data;
  },

  // Copy template
  copyTemplate: async (id: string, newName?: string): Promise<Template> => {
    const response = await api.post(`/api/templates/${id}/copy`, { name: newName });
    return response.data;
  },

  // Generate template from data
  generateTemplate: async (
    templateId: string,
    data: TemplatePreviewData
  ): Promise<{ success: boolean; result: any; error?: string }> => {
    const response = await api.post(`/api/templates/${templateId}/generate`, { data });
    return response.data;
  },

  // Preview template with data
  previewTemplate: async (
    templateId: string,
    data: TemplatePreviewData
  ): Promise<{ success: boolean; preview_url: string; error?: string }> => {
    const response = await api.post(`/api/templates/${templateId}/preview`, { data });
    return response.data;
  },

  // Export template
  exportTemplate: async (
    templateId: string,
    format: 'png' | 'jpg' | 'pdf',
    data?: TemplatePreviewData
  ): Promise<{ success: boolean; download_url: string; error?: string }> => {
    const response = await api.post(`/api/templates/${templateId}/export`, { 
      format, 
      data 
    });
    return response.data;
  },

  // Get template categories
  getTemplateCategories: async (): Promise<string[]> => {
    const response = await api.get('/api/templates/categories');
    return response.data;
  },

  // Get template statistics
  getTemplateStats: async (templateId: string): Promise<{
    usage_count: number;
    assigned_brands: number;
    last_used: string;
    generation_count: number;
  }> => {
    const response = await api.get(`/api/templates/${templateId}/stats`);
    return response.data;
  },

  // Save template as draft
  saveDraft: async (templateData: any): Promise<{ success: boolean; draft_id: string }> => {
    const response = await api.post('/api/templates/draft', templateData);
    return response.data;
  },

  // Load draft
  loadDraft: async (draftId: string): Promise<any> => {
    const response = await api.get(`/api/templates/draft/${draftId}`);
    return response.data;
  },

  // Get user drafts
  getUserDrafts: async (): Promise<any[]> => {
    const response = await api.get('/api/templates/drafts');
    return response.data;
  }
};
