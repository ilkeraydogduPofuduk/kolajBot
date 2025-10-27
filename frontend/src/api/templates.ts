import api from '../utils/api';

export interface Template {
  id: number;
  name: string;
  description?: string;
  product_id?: number;
  brand_id?: number;
  template_type: string;
  template_data: any;
  preview_image?: string;
  thumbnail_path?: string;
  is_active: boolean;
  is_default?: boolean;
  is_auto_generated?: boolean;
  visibility?: 'private' | 'brand' | 'public';
  version?: number;
  parent_template_id?: number;
  tags?: string[];
  shared_with?: number[];
  usage_count?: number;
  last_used_at?: string;
  created_at: string;
  updated_at?: string;
  created_by?: number;
  category?: string;
  product?: {
    id: number;
    code: string;
    name: string;
    color: string;
    product_type: string;
    size_range: string;
    price: number;
    currency: string;
    brand: {
      id: number;
      name: string;
    };
  };
  brand?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface TemplateCreate {
  name: string;
  description?: string;
  product_id: number;
  brand_id: number;
  template_type?: string;
  template_data: any;
  visibility?: 'private' | 'brand' | 'public';
  tags?: string[];
  is_active?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  description?: string;
  template_type?: string;
  template_data?: any;
  visibility?: 'private' | 'brand' | 'public';
  tags?: string[];
  is_active?: boolean;
}

export const templatesAPI = {
  // Şablonları listele
  getTemplates: async (params?: {
    skip?: number;
    limit?: number;
    product_id?: number;
  }): Promise<{ data: Template[] }> => {
    const response = await api.get('/api/templates/master', { params });
    return response.data;
  },

  // Belirli bir şablonu getir
  getTemplate: async (templateId: number): Promise<Template> => {
    const response = await api.get(`/api/templates/${templateId}`);
    return response.data;
  },

  // Yeni şablon oluştur
  createTemplate: async (templateData: TemplateCreate): Promise<Template> => {
    const response = await api.post('/api/templates/create', templateData);
    return response.data;
  },

  // Şablonu güncelle
  updateTemplate: async (templateId: number, templateData: TemplateUpdate): Promise<Template> => {
    const response = await api.put(`/api/templates/${templateId}`, templateData);
    return response.data;
  },

  // Şablonu sil
  deleteTemplate: async (templateId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/templates/${templateId}`);
    return response.data;
  },



  // Template verisini görsel olarak render et
  renderTemplate: async (templateData: any, width: number = 800, height: number = 1000, format: string = 'PNG') => {
    const response = await api.post('/api/templates/render', templateData, {
      params: { width, height, format },
      responseType: 'blob'
    });
    
    return response.data;
  },

  // Template'i PNG olarak dışa aktar
  exportTemplatePNG: async (templateId: number, width: number = 800, height: number = 1000) => {
    const response = await api.post(`/api/templates/${templateId}/export/png`, {}, {
      params: { width, height },
      responseType: 'blob'
    });
    
    return response.data;
  },

  // JSON dosyasından template içe aktar
  importTemplate: async (file: File, product_id?: number, name?: string, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (product_id) formData.append('product_id', product_id.toString());
    if (name) formData.append('name', name || file.name.replace('.json', ''));
    if (description) formData.append('description', description);
    
    const response = await api.post('/api/templates/import/json', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },

  // Get templates by product
  getTemplatesByProduct: async (productId: number): Promise<{ templates: Template[] }> => {
    const response = await api.get(`/api/templates/by-product/${productId}`);
    return response.data;
  },

  // Get templates by brand
  getTemplatesByBrand: async (brandId: number): Promise<{ templates: Template[] }> => {
    const response = await api.get(`/api/templates/by-brand/${brandId}`);
    return response.data;
  },

  // Get auto-generated templates
  getAutoTemplates: async (): Promise<{ templates: Template[] }> => {
    const response = await api.get('/api/templates/auto-generated');
    return response.data;
  },

  // Create collage from template
  createCollage: async (templateId: number, productId: number): Promise<{ success: boolean; collage_path?: string }> => {
    const response = await api.post(`/api/templates/${templateId}/create-collage`, {
      product_id: productId
    });
    return response.data;
  },

  // Download collage
  downloadCollage: async (templateId: number): Promise<Blob> => {
    const response = await api.get(`/api/templates/${templateId}/download-collage`, {
      responseType: 'blob'
    });
    return response.data;
  },

};