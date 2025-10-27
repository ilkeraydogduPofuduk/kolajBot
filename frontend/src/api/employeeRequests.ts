 import api from '../utils/api';

export interface EmployeeRequest {
  id: number;
  requested_by_user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role_id: number;
  brand_ids: number[];
  status: 'pending' | 'approved' | 'rejected';
  request_message?: string;
  admin_notes?: string;
  approved_by_user_id?: number;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  requested_by_name?: string;
  approved_by_name?: string;
  role_name?: string;
  brand_names: string[];
  requested_by_brand_ids: number[];
}

export interface EmployeeRequestCreate {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role_id: number;
  brand_ids: number[];
  request_message?: string;
}

export interface EmployeeRequestListResponse {
  requests: EmployeeRequest[];
  total: number;
  page: number;
  per_page: number;
}

export interface BrandManagerStats {
  total_employees: number;
  active_employees: number;
  pending_requests: number;
  managed_brands_count: number;
}

export const employeeRequestsAPI = {
  // Çalışan ekleme talebi oluştur
  createEmployeeRequest: async (data: EmployeeRequestCreate): Promise<EmployeeRequest> => {
    console.log('🔍 SENDING EMPLOYEE REQUEST:', data);
    const response = await api.post('/api/employee-requests/', data);
    return response.data;
  },

  // Çalışan taleplerini listele
  getEmployeeRequests: async (
    page: number = 1,
    per_page: number = 10,
    status?: string
  ): Promise<EmployeeRequestListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (status) {
      params.append('status', status);
    }

    const response = await api.get(`/api/employee-requests/?${params}`);
    return response.data;
  },

  // Tek bir talebi getir
  getEmployeeRequest: async (id: number): Promise<EmployeeRequest> => {
    const response = await api.get(`/api/employee-requests/${id}`);
    return response.data;
  },

  // Talebi onayla (Super Admin)
  approveEmployeeRequest: async (id: number, admin_notes?: string): Promise<{ message: string }> => {
    const response = await api.put(`/api/employee-requests/${id}/approve`, { admin_notes });
    return response.data;
  },

  // Talebi reddet (Super Admin)
  rejectEmployeeRequest: async (id: number, admin_notes: string): Promise<{ message: string }> => {
    const response = await api.put(`/api/employee-requests/${id}/reject`, { 
      status: 'rejected',
      admin_notes 
    });
    return response.data;
  },

  // Talep bilgilerini güncelle (Super Admin)
  updateEmployeeRequest: async (id: number, requestData: EmployeeRequestCreate): Promise<EmployeeRequest> => {
    const response = await api.put(`/api/employee-requests/${id}`, requestData);
    return response.data;
  },

  // Marka yöneticisi istatistikleri
  getBrandManagerStats: async (): Promise<BrandManagerStats> => {
    const response = await api.get('/api/employee-requests/stats/brand-manager');
    return response.data;
  },

};
