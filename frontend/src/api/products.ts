import api from '../utils/api';

export interface Product {
  id: number;
  name: string;
  code: string;
  color: string;
  product_type?: string;
  size_range?: string;
  price?: number;
  currency: string;
  // İkinci ürün bilgileri (eğer görselde 2 etiket varsa)
  has_second_product?: boolean;
  code_2?: string;
  color_2?: string;
  product_type_2?: string;
  size_range_2?: string;
  price_2?: number;
  currency_2?: string;
  brand_id: number;
  brand_name?: string;
  brand?: {
    id: number;
    name: string;
  };
  ai_extracted_data?: any;
  is_active: boolean;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  templates?: ProductTemplate[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  image_type: string;
  angle?: string;
  angle_number?: number;
  is_cover_image: boolean;
  ai_analysis?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTemplate {
  id: number;
  product_id: number;
  name: string;
  template_type: string;
  template_data: any;
  generated_image_path?: string;
  is_active: boolean;
  is_default: boolean;
  brand_id: number;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface IncompleteProduct {
  product_id: number;
  code: string;
  color: string;
  missing_fields: string[];
}

export interface ProductUploadResponse {
  success: boolean;
  message: string;
  uploaded_files: number;
  products_created: number;
  incomplete_products: IncompleteProduct[];
  products: Product[];
  job_id?: number; // Optional job ID for background processing
}

export interface ProductFilters {
  product_type?: string;
  color?: string;
  size_range?: string;
  price_min?: string;
  price_max?: string;
  incomplete?: boolean;
  has_second_product?: boolean;
}

export const productsAPI = {
  // Get products list
  getProducts: async (
    page: number = 1,
    per_page: number = 20,
    brand_id?: number,
    search?: string,
    filters?: ProductFilters
  ): Promise<ProductListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });

    if (brand_id) params.append('brand_id', brand_id.toString());
    if (search) params.append('search', search);
    
    // Add filters
    if (filters) {
      if (filters.product_type) params.append('product_type', filters.product_type);
      if (filters.color) params.append('color', filters.color);
      if (filters.size_range) params.append('size_range', filters.size_range);
      if (filters.price_min) params.append('price_min', filters.price_min);
      if (filters.price_max) params.append('price_max', filters.price_max);
      if (filters.incomplete !== undefined) params.append('incomplete', filters.incomplete.toString());
      if (filters.has_second_product !== undefined) params.append('has_second_product', filters.has_second_product.toString());
    }

    const url = `/api/products?${params.toString()}`;
    const response = await api.get(url);
    return response.data;
  },

  // Get single product
  getProduct: async (productId: number): Promise<Product> => {
    const response = await api.get(`/api/products/${productId}`);
    return response.data;
  },

  // Upload product images (V2 - Enterprise) - Otomatik marka tespiti
  uploadProductImages: async (
    files: File[]
  ): Promise<ProductUploadResponse> => {
    const formData = new FormData();
    
    files.forEach(file => {
      formData.append('files', file);
    });

    // FINAL: En temiz ve hızlı upload endpoint - marka tespiti otomatik
    const response = await api.post('/api/products/upload-v2', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // Get upload job status
  getUploadJobStatus: async (jobId: number): Promise<any> => {
    const response = await api.get(`/api/products/upload-status/${jobId}`);
    return response.data;
  },

  // Get product images
  getProductImages: async (productId: number): Promise<ProductImage[]> => {
    const response = await api.get(`/api/products/${productId}/images`);
    return response.data;
  },

  // Process product with AI
  processProductAI: async (productId: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/products/${productId}/process`);
    return response.data;
  },

  // Get product templates
  getProductTemplates: async (productId: number): Promise<ProductTemplate[]> => {
    const response = await api.get(`/api/products/${productId}/templates`);
    return response.data;
  },

  // Get or create smart collage (OPTIMIZED)
  getSmartCollage: async (productId: number, forceRecreate: boolean = false): Promise<{
    success: boolean;
    collage_url?: string;
    method?: string;
    cached?: boolean;
    message?: string;
  }> => {
    const params = forceRecreate ? '?force_recreate=true' : '';
    const response = await api.get(`/api/products/${productId}/collage-smart${params}`);
    return response.data;
  },

  // Get collage queue status
  getCollageQueueStatus: async (): Promise<{
    success: boolean;
    queue_status?: {
      queue_size: number;
      processing_count: number;
      cache_size: number;
      queue_items: Array<{
        product_id: number;
        priority: string;
        scheduled_at: string;
        attempts: number;
      }>;
    };
  }> => {
    const response = await api.get('/api/products/collage-queue/status');
    return response.data;
  },

  // Generate product template
  generateTemplate: async (
    productId: number,
    templateName: string
  ): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('template_name', templateName);

    const response = await api.post(`/api/products/${productId}/generate-template`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Complete product info (for missing fields)
  completeProductInfo: async (
    productId: number,
    completionData: {
      color?: string;
      product_type?: string;
      size_range?: string;
      price?: number;
    }
  ): Promise<{ success: boolean; message: string; product: Product }> => {
    const response = await api.put(`/api/products/${productId}`, completionData);
    return response.data;
  },

  // Complete multiple products info (bulk)
  completeProductsBulk: async (
    completionData: Array<{
      product_id: number;
      product_type?: string;
      size_range?: string;
      price?: number;
    }>
  ): Promise<{ success: boolean; message: string; updated_count: number }> => {
    const response = await api.put('/api/products/complete-bulk', completionData);
    return response.data;
  },

  // Update product
  updateProduct: async (
    productId: number,
    updateData: {
      color?: string;
      product_type?: string;
      size_range?: string;
      price?: number;
      brand_id?: number;
    }
  ): Promise<{ success: boolean; message: string; product: Product }> => {
    const response = await api.put(`/api/products/${productId}`, updateData);
    return response.data;
  },

  // Get filter options
  getFilterOptions: async (): Promise<{
    product_types: string[];
    colors: string[];
    size_ranges: string[];
    brands: string[];
  }> => {
    const response = await api.get('/api/products/filter-options');
    return response.data;
  },
};
