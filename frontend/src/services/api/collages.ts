import api from '../../utils/api';

interface PendingCollagesResponse {
  products: any[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface CompleteProductResponse {
  message: string;
  updated_fields: string[];
  collage_created: boolean;
}

interface CreateCollageResponse {
  message: string;
  collage_path: string | null;
  sent_to_telegram: boolean;
}

interface StatisticsResponse {
  total_products: number;
  products_with_collage: number;
  products_missing_info: number;
  products_ready_for_collage: number;
  completion_rate: number;
}

export const collagesAPI = {
  // Get pending collages (products without collage or missing info)
  getPendingCollages: async (
    page: number = 1, 
    perPage: number = 20, 
    brandId?: number,
    search?: string,
    filterType?: string
  ): Promise<PendingCollagesResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });
    
    if (brandId) {
      params.append('brand_id', brandId.toString());
    }
    
    if (search) {
      params.append('search', search);
    }
    
    if (filterType) {
      params.append('filter_type', filterType);
    }
    
    const response = await api.get(`/api/collages/pending?${params}`);
    return response.data;
  },

  // Update product info and create collage
  completeProductInfo: async (productId: number, data: any): Promise<CompleteProductResponse> => {
    const response = await api.put(`/api/collages/products/${productId}/complete`, data);
    return response.data;
  },

  // Manually create collage for a product
  createCollageManually: async (productId: number, sendToTelegram: boolean = true): Promise<CreateCollageResponse> => {
    const response = await api.post(`/api/collages/products/${productId}/create-collage`, {
      send_to_telegram: sendToTelegram
    });
    return response.data;
  },

  // Get collage statistics
  getStatistics: async (): Promise<StatisticsResponse> => {
    const response = await api.get('/api/collages/statistics');
    return response.data;
  }
};
