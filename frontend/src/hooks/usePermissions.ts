/**
 * usePermissions Hook
 * Kullanıcı izinlerini kontrol eden hook
 */

import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    
    // DİNAMİK: Sadece permission kontrolü - Super Admin bypass YOK
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    
    // DİNAMİK: Sadece permission kontrolü - Super Admin bypass YOK
    return permissions.some(permission => user.permissions.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) {
      return false;
    }
    
    // DİNAMİK: Sadece permission kontrolü - Super Admin bypass YOK
    return permissions.every(permission => user.permissions.includes(permission));
  };

  const canAccessModule = (module: string): boolean => {
    if (!user) {
      return false;
    }
    
    if (!user.permissions) {
      return false;
    }
    
    // Modül bazlı izin kontrolü - Revize edilmiş permission sistemi
    const modulePermissions: { [key: string]: string[] } = {
      'dashboard': ['dashboard'],
      'users': ['users.view', 'users.manage'],
      'roles': ['roles.view', 'roles.manage'],
      'brands': ['brands.view', 'brands.manage'],
      'categories': ['categories.view', 'categories.manage'],
      'branches': ['branches.view', 'branches.manage'],
      'products': ['products.view', 'products.manage'],
      'templates': ['templates.view', 'templates.manage'],
      'collages': ['collages.view', 'collages.manage'],
      'social_media': ['social_media', 'social.view'],
      'social': ['social.view', 'social.manage'],
      'settings': ['settings', 'system_admin'],
      'reports': ['reports.view', 'analytics'],
      'employees': ['my_employees'],
      'employee_requests': ['employee_requests'],
      'ai': ['ai_templates', 'price_extraction', 'label_extraction']
    };
    
    const requiredPermissions = modulePermissions[module];
    if (!requiredPermissions) {
      return false;
    }
    
    return hasAnyPermission(requiredPermissions);
  };

  // DİNAMİK: Permission bazlı kontroller
  const isAdmin = (): boolean => {
    return Boolean(user?.permissions?.includes('users.manage') && user?.permissions?.includes('roles.manage'));
  };

  const isManager = (): boolean => {
    return Boolean(user?.permissions?.includes('brands.manage'));
  };

  const isEmployee = (): boolean => {
    return Boolean(!user?.permissions?.includes('users.manage') && !user?.permissions?.includes('brands.manage'));
  };

  const isCreator = (): boolean => {
    return Boolean(user?.permissions?.includes('templates.manage'));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    isAdmin,
    isManager,
    isEmployee,
    isCreator,
    permissions: user?.permissions || [],
    role: user?.role || null
  };
};