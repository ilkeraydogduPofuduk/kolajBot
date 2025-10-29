/**
 * User Model
 * Handles user data and authentication
 * @module models/user
 */

import BaseModel from './base.model.js';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

/**
 * User Model Class
 */
class UserModel extends BaseModel {
  constructor() {
    super('users', [
      'id', 'email', 'password_hash', 'first_name', 'last_name',
      'phone_number', 'role_id', 'brand_ids', 'is_active',
      'is_2fa_enabled', 'two_fa_secret', 'must_change_password',
      'failed_login_attempts', 'locked_until', 'is_verified',
      'created_at', 'updated_at', 'last_login'
    ]);
  }

  /**
   * Hash password
   * @param {string} password - Plain password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  /**
   * Compare password
   * @param {string} password - Plain password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} Match result
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Create user with hashed password
   * @param {object} data - User data
   * @returns {Promise<object>} Created user
   */
  async createUser(data) {
    const hashedPassword = await this.hashPassword(data.password);
    const userData = {
      ...data,
      password_hash: hashedPassword,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_verified: data.is_verified !== undefined ? data.is_verified : false,
      failed_login_attempts: 0,
      brand_ids: data.brand_ids ? JSON.stringify(data.brand_ids) : '[]'
    };

    delete userData.password;

    const user = await this.create(userData);
    delete user.password_hash;
    return user;
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<object|null>} User or null
   */
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  /**
   * Update password
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Updated user
   */
  async updatePassword(userId, newPassword) {
    const hashedPassword = await this.hashPassword(newPassword);
    return await this.update(userId, {
      password_hash: hashedPassword,
      must_change_password: false
    });
  }

  /**
   * Increment failed login attempts
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated user
   */
  async incrementFailedAttempts(userId) {
    const user = await this.findById(userId);
    const attempts = (user.failed_login_attempts || 0) + 1;

    const updateData = { failed_login_attempts: attempts };

    // Lock account if max attempts reached
    if (attempts >= env.MAX_LOGIN_ATTEMPTS) {
      updateData.locked_until = new Date(Date.now() + env.LOCK_TIME);
    }

    return await this.update(userId, updateData);
  }

  /**
   * Reset failed login attempts
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated user
   */
  async resetFailedAttempts(userId) {
    return await this.update(userId, {
      failed_login_attempts: 0,
      locked_until: null
    });
  }

  /**
   * Update last login
   * @param {number} userId - User ID
   * @returns {Promise<object>} Updated user
   */
  async updateLastLogin(userId) {
    return await this.update(userId, { last_login: new Date() });
  }

  /**
   * Check if account is locked
   * @param {object} user - User object
   * @returns {boolean} Lock status
   */
  isAccountLocked(user) {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  /**
   * Get users by role
   * @param {number} roleId - Role ID
   * @returns {Promise<Array>} Users
   */
  async findByRole(roleId) {
    return await this.findAll({ where: { role_id: roleId } });
  }

  /**
   * Get users by brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<Array>} Users
   */
  async findByBrand(brandId) {
    const query = `
      SELECT u.* FROM users u
      WHERE u.brand_ids::jsonb @> $1::jsonb
      AND u.is_active = true
    `;
    return await this.query(query, [JSON.stringify([brandId])]);
  }

  /**
   * Find user with role details
   * @param {number} userId - User ID
   * @returns {Promise<object|null>} User with role
   */
  async findWithRole(userId) {
    const query = `
      SELECT u.*, r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `;
    const result = await this.query(query, [userId]);
    return result[0] || null;
  }

  /**
   * Search users
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async search(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT u.*, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email ILIKE $1
      OR u.first_name ILIKE $1
      OR u.last_name ILIKE $1
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM users u
      WHERE u.email ILIKE $1
      OR u.first_name ILIKE $1
      OR u.last_name ILIKE $1
    `;

    const searchPattern = `%${searchTerm}%`;

    const [records, countResult] = await Promise.all([
      this.query(query, [searchPattern, limit, offset]),
      this.query(countQuery, [searchPattern])
    ]);

    const total = parseInt(countResult[0].count, 10);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export default new UserModel();
