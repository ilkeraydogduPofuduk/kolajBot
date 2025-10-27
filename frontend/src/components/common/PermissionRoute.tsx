import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissionCheck } from './PermissionGuard';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  module?: string;
  fallbackPath?: string;
}

/**
 * İzin kontrolü yapan route wrapper komponenti
 */
export const PermissionRoute: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  module,
  fallbackPath = '/admin/dashboard',
}) => {
  const { user, loading } = useAuth();
  const { hasPermission, hasAnyPermission, hasAllPermissions, canAccessModule } = usePermissionCheck();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Tek izin kontrolü
  if (permission && !hasPermission(permission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Çoklu izin kontrolü
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasRequiredPermissions) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Modül erişim kontrolü
  if (module && !canAccessModule(module)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

// Kolay kullanım için yardımcı komponentler
export const RequirePermission: React.FC<{ permission: string; children: React.ReactNode; fallbackPath?: string }> = ({
  permission,
  children,
  fallbackPath = '/admin/dashboard'
}) => {
  return (
    <PermissionRoute permission={permission} fallbackPath={fallbackPath}>
      {children}
    </PermissionRoute>
  );
};

export const RequireAnyPermission: React.FC<{ 
  permissions: string[]; 
  children: React.ReactNode; 
  fallbackPath?: string;
}> = ({ permissions, children, fallbackPath = '/admin/dashboard' }) => {
  return (
    <PermissionRoute permissions={permissions} requireAll={false} fallbackPath={fallbackPath}>
      {children}
    </PermissionRoute>
  );
};

export const RequireAllPermissions: React.FC<{ 
  permissions: string[]; 
  children: React.ReactNode; 
  fallbackPath?: string;
}> = ({ permissions, children, fallbackPath = '/admin/dashboard' }) => {
  return (
    <PermissionRoute permissions={permissions} requireAll={true} fallbackPath={fallbackPath}>
      {children}
    </PermissionRoute>
  );
};

export const RequireModule: React.FC<{ 
  module: string; 
  children: React.ReactNode; 
  fallbackPath?: string;
}> = ({ module, children, fallbackPath = '/admin/dashboard' }) => {
  return (
    <PermissionRoute module={module} fallbackPath={fallbackPath}>
      {children}
    </PermissionRoute>
  );
};
