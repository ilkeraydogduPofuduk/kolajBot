/**
 * Dynamic Templates API
 * OCR sonrası otomatik şablon oluşturma ve düzenleme
 */

import api from '../utils/api';

export interface TemplateCreateRequest {
  product_id: number;
  brand_id: number;
  category?: string;
}

export interface TemplateUpdateRequest {
  template_id: number;
  product_id: number;
  brand_id: number;
  category?: string;
}

export interface TemplateResponse {
  id: number;
  name: string;
  description: string;
  template_data: any;
  product_id: number;
  brand_id: number;
  is_active: boolean;
  template_type: string;
  preview_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface TemplateAnalysisResponse {
  product_code: string;
  brand_name: string;
  suggested_category: string;
  template_config: any;
  confidence_score: number;
}

export interface TelegramExportResponse {
  template_id: number;
  template_name: string;
  brand_name: string;
  product_code: string;
  category: string;
  canvas_data: any;
  preview_url?: string;
  exported_at: string;
}

export interface AutoCreateResponse {
  created_templates: Array<{
    template_id: number;
    product_id: number;
    product_code: string;
    brand_name: string;
  }>;
  failed_products: Array<{
    product_id: number;
    error: string;
  }>;
  total_processed: number;
  success_count: number;
  failure_count: number;
}

export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  category_stats: Record<string, number>;
  brand_stats: Record<string, number>;
}

export const dynamicTemplatesAPI = {
  /**
   * Ürünü şablon oluşturmak için analiz et
   */
  analyzeProduct: async (productId: number): Promise<TemplateAnalysisResponse> => {
    const response = await api.get(`/api/dynamic-templates/analyze-product?product_id=${productId}`);
    return response.data;
  },

  /**
   * Ürün için dinamik şablon oluştur
   */
  createFromProduct: async (request: TemplateCreateRequest): Promise<TemplateResponse> => {
    const response = await api.post('/api/dynamic-templates/create-from-product', request);
    return response.data;
  },

  /**
   * Ürün bilgileri değiştiğinde şablonu güncelle
   */
  updateFromProduct: async (request: TemplateUpdateRequest): Promise<TemplateResponse> => {
    const response = await api.put('/api/dynamic-templates/update-from-product', request);
    return response.data;
  },

  /**
   * Şablon önizleme URL'i döndür
   */
  getPreview: async (templateId: number): Promise<{ preview_url: string }> => {
    const response = await api.get(`/api/dynamic-templates/preview/${templateId}`);
    return response.data;
  },

  /**
   * Telegram için şablon verisi dışa aktar
   */
  exportForTelegram: async (templateId: number): Promise<TelegramExportResponse> => {
    const response = await api.post(`/api/dynamic-templates/export-for-telegram/${templateId}`);
    return response.data;
  },

  /**
   * Mevcut şablon kategorilerini döndür
   */
  getCategories: async (): Promise<{ categories: Record<string, any> }> => {
    const response = await api.get('/api/dynamic-templates/categories');
    return response.data;
  },

  /**
   * Marka-şablon eşleştirmesini döndür
   */
  getBrandMapping: async (): Promise<{ brand_mapping: Record<string, string> }> => {
    const response = await api.get('/api/dynamic-templates/brand-mapping');
    return response.data;
  },

  /**
   * Birden fazla ürün için otomatik şablon oluştur
   */
  autoCreateForProducts: async (productIds: number[]): Promise<AutoCreateResponse> => {
    const response = await api.post('/api/dynamic-templates/auto-create-for-products', productIds);
    return response.data;
  },

  /**
   * Şablon istatistiklerini döndür
   */
  getStats: async (): Promise<TemplateStats> => {
    const response = await api.get('/api/dynamic-templates/stats');
    return response.data;
  }
};
