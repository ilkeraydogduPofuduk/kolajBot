import api from '../../utils/api';

export interface Brand {
  id: number;
  name: string;
  logo?: string;
  description?: string;
  category: string;
  isActive: boolean;
  userCount: number;
  templateCount: number;
  created_at: string;
  updated_at: string;
}

export interface BrandCreateRequest {
  name: string;
  description?: string;
  category: string;
  logo?: string;
}

export interface BrandUpdateRequest {
  name?: string;
  description?: string;
  category?: string;
  logo?: string;
  isActive?: boolean;
}

export interface BrandsResponse {
  brands: Brand[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export const brandsAPI = {
  // Get all brands with pagination and filtering
  getBrands: async (
    page: number = 1,
    perPage: number = 20,
    search?: string,
    category?: string,
    isActive?: boolean
  ): Promise<BrandsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (isActive !== undefined) params.append('is_active', isActive.toString());
    
    const response = await api.get(`/api/brands?${params}`);
    return response.data;
  },

  // Get brand by ID
  getBrand: async (id: number): Promise<Brand> => {
    const response = await api.get(`/api/brands/${id}`);
    return response.data;
  },

  // Create new brand
  createBrand: async (brandData: BrandCreateRequest): Promise<Brand> => {
    const response = await api.post('/api/brands', brandData);
    return response.data;
  },

  // Update brand
  updateBrand: async (id: number, brandData: BrandUpdateRequest): Promise<Brand> => {
    const response = await api.put(`/api/brands/${id}`, brandData);
    return response.data;
  },

  // Delete brand
  deleteBrand: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/api/brands/${id}`);
    return response.data;
  },

  // Get brand categories
  getBrandCategories: async (): Promise<string[]> => {
    const response = await api.get('/api/brands/categories');
    return response.data;
  },

  // Get brands by user access
  getUserBrands: async (): Promise<Brand[]> => {
    const response = await api.get('/api/brands/user');
    return response.data;
  },

  // Assign template to brands
  assignTemplateToBrands: async (
    templateId: string,
    brandIds: number[]
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/api/brands/assign-template', {
      template_id: templateId,
      brand_ids: brandIds
    });
    return response.data;
  },

  // Get brand templates
  getBrandTemplates: async (brandId: number): Promise<any[]> => {
    const response = await api.get(`/api/brands/${brandId}/templates`);
    return response.data;
  },

  // Get brand statistics
  getBrandStats: async (brandId: number): Promise<{
    totalUsers: number;
    totalTemplates: number;
    totalProducts: number;
    activeTemplates: number;
  }> => {
    const response = await api.get(`/api/brands/${brandId}/stats`);
    return response.data;
  }
};
