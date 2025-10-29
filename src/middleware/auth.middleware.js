/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 * @module middleware/auth
 */

import jwt from 'jsonwebtoken';
import appConfig from '../config/app.config.js';
import UserModel from '../models/user.model.js';
import { UnauthorizedError } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, appConfig.jwt.secret);

    // Get user from database
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account is disabled');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.role_id,
      brandIds: user.brand_ids ? JSON.parse(user.brand_ids) : [],
      ...decoded
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }

    Logger.error('Authentication failed', error);
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, appConfig.jwt.secret);

      const user = await UserModel.findById(decoded.userId);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          roleId: user.role_id,
          brandIds: user.brand_ids ? JSON.parse(user.brand_ids) : [],
          ...decoded
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
};

/**
 * Check if user must change password
 */
export const checkPasswordChange = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const user = await UserModel.findById(req.user.id);

    if (user.must_change_password) {
      // Allow only password change endpoint
      if (!req.path.includes('/change-password')) {
        throw new UnauthorizedError('You must change your password before continuing');
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  authenticate,
  optionalAuth,
  checkPasswordChange
};
