/**
 * PermissionGuard Component
 * İzin kontrolü yapan wrapper component
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  adminOnly?: boolean;
  managerOnly?: boolean;
  creatorOnly?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  adminOnly = false,
  managerOnly = false,
  creatorOnly = false
}) => {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions, 
    isAdmin, 
    isManager, 
    isCreator 
  } = usePermissions();

  // Role-based checks
  if (adminOnly && !isAdmin()) {
    return <>{fallback}</>;
  }
  
  if (managerOnly && !isManager()) {
    return <>{fallback}</>;
  }
  
  if (creatorOnly && !isCreator()) {
    return <>{fallback}</>;
  }

  // Permission-based checks
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0) {
    if (requireAll) {
      if (!hasAllPermissions(permissions)) {
        return <>{fallback}</>;
      }
    } else {
      if (!hasAnyPermission(permissions)) {
        return <>{fallback}</>;
      }
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;
