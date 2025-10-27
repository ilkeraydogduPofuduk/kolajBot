import api from '../utils/api';

export interface LoginRequest {
  email: string;
  password: string;
  two_fa_code?: string;
}


export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  brand_ids: number[];
  is_active: boolean;
  is_2fa_enabled: boolean;
  must_change_password: boolean;
  last_login: string | null;
  created_at: string;
  permissions: string[];
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },


  refreshToken: async (refreshToken: string): Promise<{ access_token: string; token_type: string; expires_in: number }> => {
    const response = await api.post('/api/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },


  setup2FA: async (): Promise<{ qr_code_url: string; secret: string }> => {
    const response = await api.post('/api/auth/setup-2fa');
    return response.data;
  },

  verify2FASetup: async (code: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/verify-2fa', { code });
    return response.data;
  },

  disable2FA: async (code: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/disable-2fa', { code });
    return response.data;
  },

  changePassword: async (oldPassword: string | null, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    return response.data;
  },

  forceChangePassword: async (newPassword: string): Promise<{ message: string }> => {
    const response = await api.post('/api/auth/force-change-password', {
      new_password: newPassword
    });
    return response.data;
  },
};
