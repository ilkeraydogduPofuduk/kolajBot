/**
 * Audit Logs API
 * Denetim kayıtları API'si
 */

import api from '../utils/api';

export interface EmployeeRequestLog {
  id: number;
  employee_id: number;
  request_type: string;
  request_data: any;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    name: string;
    email: string;
  };
  action?: string;
  user_name?: string;
  user_role?: string;
  resource_name?: string;
  resource_id?: number;
  details?: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
}

export enum AuditActions {
  EMPLOYEE_REQUEST_CREATED = 'employee_request_created',
  EMPLOYEE_REQUEST_APPROVED = 'employee_request_approved',
  EMPLOYEE_REQUEST_REJECTED = 'employee_request_rejected',
  EMPLOYEE_REQUEST_UPDATED = 'employee_request_updated'
}

export enum ResourceTypes {
  EMPLOYEE_REQUEST = 'employee_request'
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id: number;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AuditLogFilters {
  user_id?: number;
  action?: string;
  resource_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const auditLogsAPI = {
  // Get audit logs
  getAuditLogs: async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
    const response = await api.get('/audit-logs', { params: filters });
    return response.data;
  },

  // Get single audit log
  getAuditLog: async (id: number): Promise<AuditLog> => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  },

  // Get employee request logs
  getEmployeeRequestLogs: async (filters: AuditLogFilters = {}): Promise<EmployeeRequestLog[]> => {
    const response = await api.get('/employee-request-logs', { params: filters });
    return response.data;
  },

  // Get single employee request log
  getEmployeeRequestLog: async (id: number): Promise<EmployeeRequestLog> => {
    const response = await api.get(`/employee-request-logs/${id}`);
    return response.data;
  },

  // Export audit logs
  exportAuditLogs: async (filters: AuditLogFilters = {}): Promise<Blob> => {
    const response = await api.get('/audit-logs/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },

  // Get audit log statistics
  getAuditLogStats: async (): Promise<{
    total_logs: number;
    logs_today: number;
    logs_this_week: number;
    logs_this_month: number;
    top_actions: Array<{ action: string; count: number }>;
    top_users: Array<{ user_id: number; user_name: string; count: number }>;
  }> => {
    const response = await api.get('/audit-logs/stats');
    return response.data;
  },

  // Create audit log
  createAuditLog: async (logData: {
    action: string;
    resource_type: string;
    resource_id: number;
    details?: any;
    ip_address?: string;
    user_agent?: string;
  }): Promise<AuditLog> => {
    const response = await api.post('/audit-logs', logData);
    return response.data;
  }
};

// Helper function to get action description
export const getActionDescription = (action: string): string => {
  const actionDescriptions: Record<string, string> = {
    'create': 'Oluşturma',
    'update': 'Güncelleme',
    'delete': 'Silme',
    'login': 'Giriş',
    'logout': 'Çıkış',
    'upload': 'Yükleme',
    'download': 'İndirme',
    'export': 'Dışa Aktarma',
    'import': 'İçe Aktarma',
    'approve': 'Onaylama',
    'reject': 'Reddetme',
    'view': 'Görüntüleme',
    'search': 'Arama',
    'filter': 'Filtreleme',
    'sort': 'Sıralama',
    'pagination': 'Sayfalama'
  };

  return actionDescriptions[action] || action;
};

// Helper function to get resource type description
export const getResourceTypeDescription = (resourceType: string): string => {
  const resourceDescriptions: Record<string, string> = {
    'user': 'Kullanıcı',
    'product': 'Ürün',
    'brand': 'Marka',
    'category': 'Kategori',
    'template': 'Şablon',
    'upload': 'Yükleme',
    'file': 'Dosya',
    'image': 'Resim',
    'document': 'Belge',
    'report': 'Rapor',
    'setting': 'Ayar',
    'role': 'Rol',
    'permission': 'İzin',
    'audit_log': 'Denetim Kaydı',
    'employee_request': 'Çalışan İsteği'
  };

  return resourceDescriptions[resourceType] || resourceType;
};

// Helper function to format date
export const formatAuditLogDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// Helper function to get status color
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'pending': 'text-yellow-600',
    'approved': 'text-green-600',
    'rejected': 'text-red-600',
    'success': 'text-green-600',
    'error': 'text-red-600',
    'warning': 'text-yellow-600',
    'info': 'text-blue-600'
  };

  return statusColors[status] || 'text-gray-600';
};

// Helper function to get status icon
export const getStatusIcon = (status: string): string => {
  const statusIcons: Record<string, string> = {
    'pending': '⏳',
    'approved': '✅',
    'rejected': '❌',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  };

  return statusIcons[status] || '❓';
};
