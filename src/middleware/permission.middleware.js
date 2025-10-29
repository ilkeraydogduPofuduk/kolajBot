/**
 * Permission Middleware
 * Checks user permissions for routes
 * @module middleware/permission
 */

import RoleModel from '../models/role.model.js';
import { ForbiddenError, UnauthorizedError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Check if user has specific permission
 * @param {string} permissionName - Permission name
 * @returns {Function} Middleware function
 */
export const hasPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const hasPermission = await RoleModel.hasPermission(req.user.roleId, permissionName);

      if (!hasPermission) {
        Logger.warn('Permission denied', {
          userId: req.user.id,
          permission: permissionName,
          path: req.path
        });
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} permissions - Array of permission names
 * @returns {Function} Middleware function
 */
export const hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      for (const permission of permissions) {
        const hasPermission = await RoleModel.hasPermission(req.user.roleId, permission);
        if (hasPermission) {
          return next();
        }
      }

      Logger.warn('Permission denied - no matching permissions', {
        userId: req.user.id,
        requiredPermissions: permissions,
        path: req.path
      });

      throw new ForbiddenError('You do not have permission to perform this action');
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has all specified permissions
 * @param {Array} permissions - Array of permission names
 * @returns {Function} Middleware function
 */
export const hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      for (const permission of permissions) {
        const hasPermission = await RoleModel.hasPermission(req.user.roleId, permission);
        if (!hasPermission) {
          Logger.warn('Permission denied - missing required permission', {
            userId: req.user.id,
            requiredPermission: permission,
            path: req.path
          });
          throw new ForbiddenError('You do not have all required permissions');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user is super admin
 * @returns {Function} Middleware function
 */
export const isSuperAdmin = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const role = await RoleModel.findById(req.user.roleId);

      if (!role || role.name !== 'super_admin') {
        Logger.warn('Super admin access denied', {
          userId: req.user.id,
          path: req.path
        });
        throw new ForbiddenError('Super admin access required');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has access to specific brand
 * @returns {Function} Middleware function
 */
export const hasBrandAccess = () => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const brandId = parseInt(req.params.brandId || req.body.brand_id, 10);

      if (!brandId) {
        return next();
      }

      // Super admin has access to all brands
      const role = await RoleModel.findById(req.user.roleId);
      if (role && role.name === 'super_admin') {
        return next();
      }

      // Check if user has access to this brand
      const userBrandIds = req.user.brandIds || [];
      if (!userBrandIds.includes(brandId)) {
        Logger.warn('Brand access denied', {
          userId: req.user.id,
          brandId,
          userBrands: userBrandIds,
          path: req.path
        });
        throw new ForbiddenError('You do not have access to this brand');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  hasBrandAccess
};
