import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  fallback?: React.ReactNode;
}

/**
 * İzin kontrolü yapan wrapper komponenti
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  module,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule } = usePermissions();
  const { user } = useAuth();

  // DİNAMİK: Permission kontrolü - Super Admin bypass YOK

  // Tek izin kontrolü
  if (permission) {
    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }
  }

  // Çoklu izin kontrolü
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasRequiredPermissions) {
      return <>{fallback}</>;
    }
  }

  // Modül erişim kontrolü
  if (module) {
    if (!canAccessModule(module)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

interface ConditionalRenderProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  children: React.ReactNode;
}

/**
 * Koşullu render yapan komponenti
 */
export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  permission,
  permissions,
  requireAll = false,
  module,
  children,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule } = usePermissions();
  const { user } = useAuth();

  // DİNAMİK: Permission kontrolü - Super Admin bypass YOK

  // Tek izin kontrolü
  if (permission) {
    if (!hasPermission(permission)) {
      return null;
    }
  }

  // Çoklu izin kontrolü
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasRequiredPermissions) {
      return null;
    }
  }

  // Modül erişim kontrolü
  if (module) {
    if (!canAccessModule(module)) {
      return null;
    }
  }

  return <>{children}</>;
};

// HOC (Higher Order Component) olarak kullanım için
export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  permission?: string,
  permissions?: string[],
  requireAll: boolean = false,
  module?: string
) => {
  return (props: P) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule } = usePermissions();

    // İzin kontrolü
    if (permission && !hasPermission(permission)) {
      return null;
    }

    if (permissions && permissions.length > 0) {
      const hasRequiredPermissions = requireAll 
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
      
      if (!hasRequiredPermissions) {
        return null;
      }
    }

    if (module && !canAccessModule(module)) {
      return null;
    }

    return <Component {...props} />;
  };
};

// Hook olarak kullanım için
export const usePermissionCheck = () => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule } = usePermissions();

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessModule,
    
    // Kolay kullanım için yardımcı fonksiyonlar
    canView: (module: string) => canAccessModule(module),
    canManage: (module: string) => canAccessModule(module),
    
    // Özel izin kontrolleri
    canManageUsers: () => hasPermission('users.manage'),
    canManageRoles: () => hasPermission('roles.manage'),
    canManageBrands: () => hasPermission('brands.manage'),
    canManageProducts: () => hasPermission('products.manage'),
    canManageTemplates: () => hasPermission('templates.manage'),
    canManageSocialMedia: () => hasPermission('social.manage'),
    canManageEmployeeRequests: () => hasPermission('employee_requests'),
    canViewReports: () => hasPermission('reports.view'),
    canManageSettings: () => hasPermission('settings'),
    canManageCategories: () => hasPermission('categories.manage'),
  };
};
