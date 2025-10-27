import api from '../utils/api';

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
}

export interface CategoryUpdate {
  name?: string;
  is_active?: boolean;
}

export interface CategoriesResponse {
  categories: Category[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

export const categoriesAPI = {
  // Kategorileri listele (sayfalama ile)
  getCategories: async (params: {
    page?: number;
    per_page?: number;
    search?: string;
    is_active?: boolean;
  } = {}): Promise<CategoriesResponse> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());

    const response = await api.get(`/api/categories/?${searchParams.toString()}`);
    return response.data;
  },

  // Tüm aktif kategorileri getir (dropdown için)
  getAllActiveCategories: async (): Promise<Category[]> => {
    const response = await api.get('/api/categories-public/active');
    return response.data;
  },

  // Kategori detayını getir
  getCategory: async (id: number): Promise<Category> => {
    const response = await api.get(`/api/categories/${id}`);
    return response.data;
  },

  // Yeni kategori oluştur
  createCategory: async (data: CategoryCreate): Promise<Category> => {
    const response = await api.post('/api/categories/', data);
    return response.data;
  },

  // Kategori güncelle
  updateCategory: async (id: number, data: CategoryUpdate): Promise<Category> => {
    const response = await api.put(`/api/categories/${id}`, data);
    return response.data;
  },

  // Kategori sil
  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/api/categories/${id}`);
  },

  // Kategori aktiflik durumunu değiştir
  toggleCategoryStatus: async (id: number): Promise<Category> => {
    const response = await api.patch(`/api/categories/${id}/toggle-status`);
    return response.data;
  }
};
