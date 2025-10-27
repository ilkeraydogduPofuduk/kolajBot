import api from '../utils/api';

export interface Setting {
  id: number;
  category: string;
  key: string;
  value: string;
  description: string;
  is_active: boolean;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface SettingUpdate {
  key: string;
  value: string;
}

export interface SettingsResponse {
  settings: Setting[];
  total: number;
}

export interface CategorySettingsResponse {
  category: string;
  settings: Setting[];
}

export const settingsAPI = {
  getSettings: async (): Promise<SettingsResponse> => {
    // Use authenticated endpoint to get all settings (sensitive values masked for non-super-admin)
    const response = await api.get('/api/settings/');
    return response.data;
  },

  getSetting: async (keyName: string): Promise<Setting> => {
    const response = await api.get(`/api/settings/${keyName}`);
    return response.data;
  },

  updateSetting: async (keyName: string, value: string, category: string = 'general'): Promise<Setting> => {
    const response = await api.post(`/api/settings/${category}/${keyName}`, null, {
      params: { value }
    });
    return response.data;
  },

  getCategorySettings: async (category: string): Promise<Setting[]> => {
    const response = await api.get(`/api/settings/category/${category}`);
    return response.data.settings || [];
  },

  updateCategorySetting: async (category: string, key: string, value: string): Promise<void> => {
    await api.post(`/api/settings/${category}/${key}`, null, {
      params: { value }
    });
  },

  updateSettings: async (settings: SettingUpdate[]): Promise<void> => {
    await api.put('/api/settings/bulk', { settings });
  },

  resetSetting: async (keyName: string): Promise<Setting> => {
    const response = await api.post(`/api/settings/${keyName}/reset`);
    return response.data;
  },

  getSystemInfo: async (): Promise<{
    database_version: string;
    platform_version: string;
    last_updated: string;
    total_users: number;
    total_brands: number;
    total_branches: number;
  }> => {
    const response = await api.get('/api/settings/system-info');
    return response.data;
  },

  testEmail: async (testData: {
    to_email: string;
    subject: string;
    message: string;
  }): Promise<void> => {
    await api.post('/api/settings/test-email', testData);
  },
};
