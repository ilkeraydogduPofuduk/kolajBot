/**
 * Authentication Service
 * Handles user authentication and authorization
 * @module services/auth
 */

import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';
import RoleModel from '../models/role.model.js';
import appConfig from '../config/app.config.js';
import Logger from '../core/logger.js';
import {
  UnauthorizedError,
  BadRequestError,
  NotFoundError
} from '../core/error-handler.js';

/**
 * Authentication Service Class
 */
class AuthService {
  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @returns {Promise<object>} Created user (without password)
   */
  async register(userData) {
    try {
      // Check if email already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new BadRequestError('Email already exists');
      }

      // Create user
      const user = await UserModel.createUser(userData);

      Logger.info('New user registered', { userId: user.id, email: user.email });

      return user;
    } catch (error) {
      Logger.error('Registration failed', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} Login result with tokens
   */
  async login(email, password) {
    try {
      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid credentials');
      }

      // Check if account is active
      if (!user.is_active) {
        throw new UnauthorizedError('Account is disabled');
      }

      // Check if account is locked
      if (UserModel.isAccountLocked(user)) {
        throw new UnauthorizedError('Account is locked due to too many failed login attempts');
      }

      // Verify password
      const isPasswordValid = await UserModel.comparePassword(password, user.password_hash);
      if (!isPasswordValid) {
        await UserModel.incrementFailedAttempts(user.id);
        throw new UnauthorizedError('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await UserModel.resetFailedAttempts(user.id);

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Get user with role
      const userWithRole = await UserModel.findWithRole(user.id);

      // Generate tokens
      const accessToken = this.generateAccessToken(userWithRole);
      const refreshToken = this.generateRefreshToken(userWithRole);

      Logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email
      });

      // Remove sensitive data
      delete userWithRole.password_hash;
      delete userWithRole.two_fa_secret;

      return {
        user: userWithRole,
        accessToken,
        refreshToken
      };
    } catch (error) {
      Logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, appConfig.jwt.refreshSecret);

      // Find user
      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new UnauthorizedError('Invalid token');
      }

      // Get user with role
      const userWithRole = await UserModel.findWithRole(user.id);

      // Generate new access token
      const accessToken = this.generateAccessToken(userWithRole);

      Logger.info('Access token refreshed', { userId: user.id });

      return { accessToken };
    } catch (error) {
      Logger.error('Token refresh failed', error);
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Change password
   * @param {number} userId - User ID
   * @param {string} oldPassword - Old password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify old password
      const isValid = await UserModel.comparePassword(oldPassword, user.password_hash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid current password');
      }

      // Update password
      await UserModel.updatePassword(userId, newPassword);

      Logger.info('Password changed successfully', { userId });

      return true;
    } catch (error) {
      Logger.error('Password change failed', error);
      throw error;
    }
  }

  /**
   * Reset password (admin only)
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async resetPassword(userId, newPassword) {
    try {
      await UserModel.updatePassword(userId, newPassword);

      // Mark that user must change password on next login
      await UserModel.update(userId, { must_change_password: true });

      Logger.info('Password reset by admin', { userId });

      return true;
    } catch (error) {
      Logger.error('Password reset failed', error);
      throw error;
    }
  }

  /**
   * Verify user token
   * @param {string} token - JWT token
   * @returns {Promise<object>} Decoded token data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret);

      // Check if user still exists and is active
      const user = await UserModel.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new UnauthorizedError('User not found or inactive');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Check if user has permission
   * @param {number} userId - User ID
   * @param {string} permissionName - Permission name
   * @returns {Promise<boolean>} Has permission
   */
  async hasPermission(userId, permissionName) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        return false;
      }

      return await RoleModel.hasPermission(user.role_id, permissionName);
    } catch (error) {
      Logger.error('Permission check failed', error);
      return false;
    }
  }

  /**
   * Generate access token
   * @param {object} user - User object
   * @returns {string} JWT access token
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      roleId: user.role_id,
      roleName: user.role_name
    };

    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiresIn
    });
  }

  /**
   * Generate refresh token
   * @param {object} user - User object
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      email: user.email
    };

    return jwt.sign(payload, appConfig.jwt.refreshSecret, {
      expiresIn: appConfig.jwt.refreshExpiresIn
    });
  }
}

export default new AuthService();
