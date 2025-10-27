import api from '../utils/api';

export interface Brand {
  id: number;
  name: string;
  description?: string;
  category_id: number | null;
  category?: {
    id: number;
    name: string;
  };
  logo_url: string;
  website?: string;
  email?: string;
  phone?: string;
  product_ids: number[] | null;
  template_ids: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandCreate {
  name: string;
  category_id?: number;
  logo_url: string;
  logoFile?: File;
}

export interface BrandUpdate {
  name?: string;
  category_id?: number;
  logo_url?: string;
  product_ids?: number[];
  template_ids?: number[];
  is_active?: boolean;
}

export interface BrandListResponse {
  brands: Brand[];
  total: number;
  page: number;
  per_page: number;
}

export interface BrandRequest {
  id: number;
  requested_by_user_id: number;
  name: string;
  category_id: number | null;
  category?: {
    id: number;
    name: string;
  };
  logo_url: string | null;
  request_message?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  approved_by_user_id?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  requested_by_name?: string;
  approved_by_name?: string;
}

export interface BrandRequestCreate {
  name: string;
  category_id?: number;
  logo_url: string;
  request_message?: string;
}

export interface BrandRequestListResponse {
  requests: BrandRequest[];
  total: number;
  page: number;
  per_page: number;
}

export const brandsAPI = {
  // Mevcut fonksiyonlar
  getBrands: async (page = 1, per_page = 10): Promise<BrandListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    const response = await api.get(`/api/brands?${params}`);
    return response.data;
  },

  getBrandsWithProducts: async (): Promise<{ brands: Brand[] }> => {
    const response = await api.get('/api/brands/with-products');
    return response.data;
  },

  getBrand: async (brandId: number): Promise<Brand> => {
    const response = await api.get(`/api/brands/${brandId}`);
    return response.data;
  },

  createBrand: async (data: BrandCreate): Promise<Brand> => {
    const response = await api.post('/api/brands', data);
    return response.data;
  },

  // Marka ekleme talebi fonksiyonları
  createBrandRequest: async (data: BrandRequestCreate): Promise<BrandRequest> => {
    const response = await api.post('/api/brands/request', data);
    return response.data;
  },

  getBrandRequests: async (
    page: number = 1,
    per_page: number = 10,
    status?: string
  ): Promise<BrandRequestListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    const response = await api.get(`/api/brands/requests?${params}`);
    return response.data;
  },

  getBrandRequest: async (id: number): Promise<BrandRequest> => {
    const response = await api.get(`/api/brands/requests/${id}`);
    return response.data;
  },

  approveBrandRequest: async (id: number, admin_notes?: string): Promise<{ message: string }> => {
    const response = await api.put(`/api/brands/requests/${id}/approve`, { admin_notes });
    return response.data;
  },

  rejectBrandRequest: async (id: number, admin_notes: string): Promise<{ message: string }> => {
    const response = await api.put(`/api/brands/requests/${id}/reject`, { 
      status: 'rejected',
      admin_notes 
    });
    return response.data;
  },

  updateBrandRequest: async (id: number, data: BrandRequestCreate): Promise<BrandRequest> => {
    const response = await api.put(`/api/brands/requests/${id}`, data);
    return response.data;
  },

  updateBrand: async (brandId: number, data: BrandUpdate): Promise<Brand> => {
    const response = await api.put(`/api/brands/${brandId}`, data);
    return response.data;
  },

  activateBrand: async (brandId: number): Promise<{ message: string }> => {
    const response = await api.put(`/api/brands/${brandId}/activate`);
    return response.data;
  },

  deactivateBrand: async (brandId: number): Promise<{ message: string }> => {
    const response = await api.put(`/api/brands/${brandId}/deactivate`);
    return response.data;
  },

  uploadLogo: async (brandId: number, file: File): Promise<{ message: string; logo_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/api/brands/${brandId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteBrand: async (brandId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/brands/${brandId}`);
    return response.data;
  },
};

// Marka yöneticisi için istatistikler
export interface BrandManagerStats {
  total_brands: number;
  active_brands: number;
  pending_brand_requests: number;
  managed_employees_count: number;
}
