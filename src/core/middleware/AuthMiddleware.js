/**
 * Auth Middleware - JWT verification
 * @module core/middleware/AuthMiddleware
 */

import { AuthenticationError, AuthorizationError } from '../errors/AppError.js';
import Security from '../security/Security.js';
import DatabaseManager from '../database/DatabaseManager.js';

export class AuthMiddleware {
  static authenticate = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AuthenticationError('No token provided');
      }

      const decoded = Security.verifyToken(token);

      const user = await DatabaseManager.table('users')
        .where('id', decoded.userId)
        .where('is_active', true)
        .first();

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      req.user = user;
      next();
    } catch (error) {
      next(new AuthenticationError('Invalid token'));
    }
  };

  static requirePermission = (permission) => {
    return async (req, res, next) => {
      if (!req.user) {
        return next(new AuthenticationError());
      }

      // Load user permissions
      const permissions = await DatabaseManager.raw(`
        SELECT p.name FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
      `, [req.user.role_id]);

      const userPermissions = permissions.map(p => p.name);

      if (!userPermissions.includes(permission)) {
        return next(new AuthorizationError('Insufficient permissions'));
      }

      next();
    };
  };
}

export default AuthMiddleware;
