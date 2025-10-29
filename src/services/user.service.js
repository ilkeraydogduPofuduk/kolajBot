/**
 * User Service
 * Handles user management business logic
 * @module services/user
 */

import UserModel from '../models/user.model.js';
import RoleModel from '../models/role.model.js';
import Logger from '../core/logger.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError
} from '../core/error-handler.js';

/**
 * User Service Class
 */
class UserService {
  /**
   * Get all users with pagination
   * @param {object} options - Query options
   * @returns {Promise<object>} Users with pagination
   */
  async getAllUsers(options = {}) {
    try {
      const { page = 1, limit = 10, role_id, is_active } = options;

      const where = {};
      if (role_id) where.role_id = role_id;
      if (is_active !== undefined) where.is_active = is_active;

      const result = await UserModel.paginate({ where, page, limit });

      // Remove sensitive data
      result.records = result.records.map(user => {
        delete user.password_hash;
        delete user.two_fa_secret;
        return user;
      });

      return result;
    } catch (error) {
      Logger.error('Failed to get users', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} User data
   */
  async getUserById(userId) {
    try {
      const user = await UserModel.findWithRole(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      delete user.password_hash;
      delete user.two_fa_secret;

      return user;
    } catch (error) {
      Logger.error('Failed to get user by ID', error);
      throw error;
    }
  }

  /**
   * Create new user
   * @param {object} userData - User data
   * @returns {Promise<object>} Created user
   */
  async createUser(userData) {
    try {
      // Check if email exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }

      // Verify role exists
      const role = await RoleModel.findById(userData.role_id);
      if (!role) {
        throw new BadRequestError('Invalid role');
      }

      const user = await UserModel.createUser(userData);

      Logger.info('User created', { userId: user.id, email: user.email });

      return user;
    } catch (error) {
      Logger.error('Failed to create user', error);
      throw error;
    }
  }

  /**
   * Update user
   * @param {number} userId - User ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated user
   */
  async updateUser(userId, updateData) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check email uniqueness if changing
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await UserModel.findByEmail(updateData.email);
        if (existingUser) {
          throw new ConflictError('Email already exists');
        }
      }

      // Verify role if changing
      if (updateData.role_id) {
        const role = await RoleModel.findById(updateData.role_id);
        if (!role) {
          throw new BadRequestError('Invalid role');
        }
      }

      // Don't allow password update through this method
      delete updateData.password;
      delete updateData.password_hash;

      // Update brand_ids JSON
      if (updateData.brand_ids) {
        updateData.brand_ids = JSON.stringify(updateData.brand_ids);
      }

      const updated = await UserModel.update(userId, updateData);

      Logger.info('User updated', { userId });

      delete updated.password_hash;
      delete updated.two_fa_secret;

      return updated;
    } catch (error) {
      Logger.error('Failed to update user', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(userId) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Soft delete
      await UserModel.softDelete(userId);

      Logger.info('User deleted', { userId });

      return true;
    } catch (error) {
      Logger.error('Failed to delete user', error);
      throw error;
    }
  }

  /**
   * Search users
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async searchUsers(searchTerm, options = {}) {
    try {
      const result = await UserModel.search(searchTerm, options);

      // Remove sensitive data
      result.records = result.records.map(user => {
        delete user.password_hash;
        delete user.two_fa_secret;
        return user;
      });

      return result;
    } catch (error) {
      Logger.error('User search failed', error);
      throw error;
    }
  }

  /**
   * Get users by role
   * @param {number} roleId - Role ID
   * @returns {Promise<Array>} Users
   */
  async getUsersByRole(roleId) {
    try {
      const users = await UserModel.findByRole(roleId);

      return users.map(user => {
        delete user.password_hash;
        delete user.two_fa_secret;
        return user;
      });
    } catch (error) {
      Logger.error('Failed to get users by role', error);
      throw error;
    }
  }

  /**
   * Get users by brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<Array>} Users
   */
  async getUsersByBrand(brandId) {
    try {
      const users = await UserModel.findByBrand(brandId);

      return users.map(user => {
        delete user.password_hash;
        delete user.two_fa_secret;
        return user;
      });
    } catch (error) {
      Logger.error('Failed to get users by brand', error);
      throw error;
    }
  }

  /**
   * Activate user account
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated user
   */
  async activateUser(userId) {
    try {
      const updated = await UserModel.update(userId, { is_active: true });
      if (!updated) {
        throw new NotFoundError('User not found');
      }

      Logger.info('User activated', { userId });

      delete updated.password_hash;
      delete updated.two_fa_secret;

      return updated;
    } catch (error) {
      Logger.error('Failed to activate user', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated user
   */
  async deactivateUser(userId) {
    try {
      const updated = await UserModel.update(userId, { is_active: false });
      if (!updated) {
        throw new NotFoundError('User not found');
      }

      Logger.info('User deactivated', { userId });

      delete updated.password_hash;
      delete updated.two_fa_secret;

      return updated;
    } catch (error) {
      Logger.error('Failed to deactivate user', error);
      throw error;
    }
  }

  /**
   * Assign brands to user
   * @param {number} userId - User ID
   * @param {Array} brandIds - Array of brand IDs
   * @returns {Promise<object>} Updated user
   */
  async assignBrands(userId, brandIds) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updated = await UserModel.update(userId, {
        brand_ids: JSON.stringify(brandIds)
      });

      Logger.info('Brands assigned to user', { userId, brandCount: brandIds.length });

      delete updated.password_hash;
      delete updated.two_fa_secret;

      return updated;
    } catch (error) {
      Logger.error('Failed to assign brands', error);
      throw error;
    }
  }
}

export default new UserService();
