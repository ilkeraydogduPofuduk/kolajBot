import api from '../utils/api';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_id: number;
  brand_ids: number[];
  is_active: boolean;
  is_2fa_enabled: boolean;
  last_login: string | null;
  failed_login_attempts?: number;
  created_at: string;
  updated_at: string;
  last_seen_at?: string;
  is_online?: boolean;
}

export interface UserActivity {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  brand_names: string[];
  is_online: boolean;
  last_seen_at: string;
  status: 'online' | 'away' | 'offline';
  current_action?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role_id: number;
  brand_ids?: number[];
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: number;
  brand_ids?: number[];
  is_active?: boolean;
}

export interface UserPasswordUpdate {
  current_password?: string;
  new_password: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
}

export const usersAPI = {
  getUsers: async (page = 1, per_page = 10, role?: string, brand_id?: number): Promise<UserListResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: per_page.toString(),
    });
    
    if (role) params.append('role', role);
    if (brand_id) params.append('brand_id', brand_id.toString());
    
    const response = await api.get(`/api/users?${params}`);
    return response.data;
  },

  getUser: async (userId: number): Promise<User> => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  createUser: async (data: UserCreate): Promise<User> => {
    const response = await api.post('/api/users', data);
    return response.data;
  },

  updateUser: async (userId: number, data: UserUpdate, sendEmail: boolean = true): Promise<User> => {
    const response = await api.put(`/api/users/${userId}`, { ...data, send_email: sendEmail });
    return response.data;
  },

  updatePassword: async (userId: number, data: UserPasswordUpdate): Promise<{ message: string }> => {
    const response = await api.put(`/api/users/${userId}/password`, data);
    return response.data;
  },

  activateUser: async (userId: number): Promise<{ message: string }> => {
    const response = await api.put(`/api/users/${userId}/activate`);
    return response.data;
  },

  deactivateUser: async (userId: number): Promise<{ message: string }> => {
    const response = await api.put(`/api/users/${userId}/deactivate`);
    return response.data;
  },

  assignBrand: async (userId: number, brandId: number): Promise<{ message: string }> => {
    const response = await api.post(`/api/users/${userId}/assign-brand/${brandId}`);
    return response.data;
  },

  removeBrand: async (userId: number, brandId: number): Promise<{ message: string }> => {
    const response = await api.delete(`/api/users/${userId}/remove-brand/${brandId}`);
    return response.data;
  },


  // Kullanıcı aktivite durumu
  getUserActivities: async (): Promise<UserActivity[]> => {
    const response = await api.get('/api/users/activities');
    return response.data;
  },

  // Çevrimiçi kullanıcıları getir
  getOnlineUsers: async (): Promise<UserActivity[]> => {
    const response = await api.get('/api/users/online');
    return response.data;
  },

  // Kullanıcı durumunu güncelle (heartbeat)
  updateUserStatus: async (status: 'online' | 'away', current_action?: string): Promise<{ message: string }> => {
    const response = await api.post('/api/users/status', { status, current_action });
    return response.data;
  },

  // Sistem istatistikleri
  getSystemStats: async (): Promise<{
    total_users: number;
    online_users: number;
    active_today: number;
    system_status: string;
    last_update: string;
  }> => {
    const response = await api.get('/api/users/system-stats');
    return response.data;
  },
};
