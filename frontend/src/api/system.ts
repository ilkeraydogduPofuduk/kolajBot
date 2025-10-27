import api from '../utils/api';

export interface SystemStats {
  cpu: {
    usage_percent: number;
    core_count: number;
  };
  memory: {
    total_gb: number;
    used_gb: number;
    usage_percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    usage_percent: number;
  };
  gpu?: {
    name: string;
    memory_used: number;
    memory_total: number;
    memory_percent: number;
    temperature: number;
    load: number;
  } | null;
  system: {
    platform: string;
    platform_version: string;
    python_version: string;
    uptime: string;
  };
  timestamp: string;
}

export interface SystemHealth {
  status: string;
  timestamp: string;
  uptime: string;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    super_admins: number;
    brand_managers: number;
    employees: number;
  };
  brands: {
    total: number;
    active: number;
  };
  channels: {
    total: number;
    active: number;
    by_platform: Record<string, number>;
    total_messages: number;
  };
  employee_requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  roles: {
    total: number;
    active: number;
  };
  products: {
    total: number;
    total_files: number;
    total_storage_gb: number;
  };
  timestamp: string;
}

export interface MyStats {
  my_products: number;
  my_files: number;
  my_storage_gb: number;
  brand_products?: number;
  brand_files?: number;
  brand_storage_gb?: number;
  my_employees?: number;
  my_brands?: number;
  timestamp: string;
}

export const systemAPI = {
  getStats: async (): Promise<SystemStats> => {
    const response = await api.get('/api/system/stats');
    return response.data;
  },

  getHealth: async (): Promise<SystemHealth> => {
    const response = await api.get('/api/system/health');
    return response.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/api/system/dashboard-stats');
    return response.data;
  },

  getMyStats: async (): Promise<MyStats> => {
    const response = await api.get('/api/system/my-stats');
    return response.data;
  },
};
