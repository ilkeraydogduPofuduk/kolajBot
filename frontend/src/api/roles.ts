import api from '../utils/api';

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  module: string;
  is_active: boolean;
  created_at: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  is_active: boolean;
  is_system_role: boolean;
  user_count?: number;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  name: string;
  display_name: string;
  description: string;
  permission_ids: number[];
}

export interface RoleUpdate {
  name?: string;
  display_name?: string;
  description?: string;
  permission_ids?: number[];
}

export interface RolesResponse {
  roles: Role[];
  total: number;
}

export interface RolePermissionsResponse {
  role_id: number;
  role_name: string;
  role_display_name: string;
  permissions: Permission[];
}

export const rolesAPI = {
  getRoles: async (): Promise<RolesResponse> => {
    const response = await api.get('/api/roles');
    return response.data;
  },

  getPermissions: async (): Promise<{ permissions: Permission[] }> => {
    const response = await api.get('/api/roles/permissions');
    return { permissions: response.data };
  },

  getRole: async (id: number): Promise<Role> => {
    const response = await api.get(`/api/roles/${id}`);
    return response.data;
  },

  getRolePermissions: async (id: number): Promise<RolePermissionsResponse> => {
    const response = await api.get(`/api/roles/${id}/permissions`);
    return response.data;
  },

  createRole: async (roleData: RoleCreate): Promise<Role> => {
    const response = await api.post('/api/roles', roleData);
    return response.data;
  },

  updateRole: async (id: number, roleData: RoleUpdate): Promise<Role> => {
    const response = await api.put(`/api/roles/${id}`, roleData);
    return response.data;
  },

  assignPermissionsToRole: async (roleId: number, permissionIds: number[]): Promise<void> => {
    await api.post(`/api/roles/${roleId}/permissions`, permissionIds);
  },

  removePermissionFromRole: async (roleId: number, permissionId: number): Promise<void> => {
    await api.delete(`/api/roles/${roleId}/permissions/${permissionId}`);
  },

  toggleRoleStatus: async (id: number): Promise<Role> => {
    const response = await api.patch(`/api/roles/${id}/toggle-status`);
    return response.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await api.delete(`/api/roles/${id}`);
  },
};
