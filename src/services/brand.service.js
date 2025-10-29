/**
 * Brand Service
 * Handles brand management business logic
 * @module services/brand
 */

import BrandModel from '../models/brand.model.js';
import CategoryModel from '../models/category.model.js';
import Logger from '../core/logger.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError
} from '../core/error-handler.js';

/**
 * Brand Service Class
 */
class BrandService {
  /**
   * Get all brands with pagination
   * @param {object} options - Query options
   * @returns {Promise<object>} Brands with pagination
   */
  async getAllBrands(options = {}) {
    try {
      const { page = 1, limit = 10, category_id, is_active } = options;

      const where = {};
      if (category_id) where.category_id = category_id;
      if (is_active !== undefined) where.is_active = is_active;

      return await BrandModel.paginate({ where, page, limit, orderBy: 'name' });
    } catch (error) {
      Logger.error('Failed to get brands', error);
      throw error;
    }
  }

  /**
   * Get brand by ID
   * @param {number} brandId - Brand ID
   * @returns {Promise<object>} Brand data
   */
  async getBrandById(brandId) {
    try {
      const brand = await BrandModel.findWithCategory(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      return brand;
    } catch (error) {
      Logger.error('Failed to get brand by ID', error);
      throw error;
    }
  }

  /**
   * Create new brand
   * @param {object} brandData - Brand data
   * @returns {Promise<object>} Created brand
   */
  async createBrand(brandData) {
    try {
      // Check if name exists
      const existing = await BrandModel.findByName(brandData.name);
      if (existing) {
        throw new ConflictError('Brand name already exists');
      }

      // Verify category exists
      if (brandData.category_id) {
        const category = await CategoryModel.findById(brandData.category_id);
        if (!category) {
          throw new BadRequestError('Invalid category');
        }
      }

      const brand = await BrandModel.createBrand(brandData);

      Logger.info('Brand created', { brandId: brand.id, name: brand.name });

      return brand;
    } catch (error) {
      Logger.error('Failed to create brand', error);
      throw error;
    }
  }

  /**
   * Update brand
   * @param {number} brandId - Brand ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated brand
   */
  async updateBrand(brandId, updateData) {
    try {
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      // Check name uniqueness if changing
      if (updateData.name && updateData.name !== brand.name) {
        const existing = await BrandModel.findByName(updateData.name);
        if (existing) {
          throw new ConflictError('Brand name already exists');
        }
      }

      // Verify category if changing
      if (updateData.category_id) {
        const category = await CategoryModel.findById(updateData.category_id);
        if (!category) {
          throw new BadRequestError('Invalid category');
        }
      }

      const updated = await BrandModel.update(brandId, updateData);

      Logger.info('Brand updated', { brandId });

      return updated;
    } catch (error) {
      Logger.error('Failed to update brand', error);
      throw error;
    }
  }

  /**
   * Delete brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteBrand(brandId) {
    try {
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      // Soft delete
      await BrandModel.softDelete(brandId);

      Logger.info('Brand deleted', { brandId });

      return true;
    } catch (error) {
      Logger.error('Failed to delete brand', error);
      throw error;
    }
  }

  /**
   * Search brands
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async searchBrands(searchTerm, options = {}) {
    try {
      return await BrandModel.search(searchTerm, options);
    } catch (error) {
      Logger.error('Brand search failed', error);
      throw error;
    }
  }

  /**
   * Get brands by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Brands
   */
  async getBrandsByCategory(categoryId) {
    try {
      // Verify category exists
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return await BrandModel.findByCategory(categoryId);
    } catch (error) {
      Logger.error('Failed to get brands by category', error);
      throw error;
    }
  }

  /**
   * Get brand statistics
   * @param {number} brandId - Brand ID
   * @returns {Promise<object>} Brand statistics
   */
  async getBrandStatistics(brandId) {
    try {
      const stats = await BrandModel.getStatistics(brandId);
      if (!stats) {
        throw new NotFoundError('Brand not found');
      }

      return stats;
    } catch (error) {
      Logger.error('Failed to get brand statistics', error);
      throw error;
    }
  }

  /**
   * Get active brands
   * @returns {Promise<Array>} Active brands
   */
  async getActiveBrands() {
    try {
      return await BrandModel.getActiveBrands();
    } catch (error) {
      Logger.error('Failed to get active brands', error);
      throw error;
    }
  }
}

export default new BrandService();
