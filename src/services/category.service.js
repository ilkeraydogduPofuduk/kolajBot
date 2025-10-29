/**
 * Category Service
 * Handles category management business logic
 * @module services/category
 */

import CategoryModel from '../models/category.model.js';
import Logger from '../core/logger.js';
import {
  NotFoundError,
  ConflictError
} from '../core/error-handler.js';

/**
 * Category Service Class
 */
class CategoryService {
  /**
   * Get all categories
   * @returns {Promise<Array>} Categories
   */
  async getAllCategories() {
    try {
      return await CategoryModel.getActiveCategories();
    } catch (error) {
      Logger.error('Failed to get categories', error);
      throw error;
    }
  }

  /**
   * Get all categories with statistics
   * @returns {Promise<Array>} Categories with stats
   */
  async getAllCategoriesWithStats() {
    try {
      return await CategoryModel.getAllWithStats();
    } catch (error) {
      Logger.error('Failed to get categories with stats', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<object>} Category data
   */
  async getCategoryById(categoryId) {
    try {
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return category;
    } catch (error) {
      Logger.error('Failed to get category by ID', error);
      throw error;
    }
  }

  /**
   * Get category with statistics
   * @param {number} categoryId - Category ID
   * @returns {Promise<object>} Category with stats
   */
  async getCategoryWithStats(categoryId) {
    try {
      const category = await CategoryModel.findWithStats(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return category;
    } catch (error) {
      Logger.error('Failed to get category with stats', error);
      throw error;
    }
  }

  /**
   * Create new category
   * @param {object} categoryData - Category data
   * @returns {Promise<object>} Created category
   */
  async createCategory(categoryData) {
    try {
      // Check if name exists
      const existing = await CategoryModel.findByName(categoryData.name);
      if (existing) {
        throw new ConflictError('Category name already exists');
      }

      const category = await CategoryModel.create(categoryData);

      Logger.info('Category created', { categoryId: category.id, name: category.name });

      return category;
    } catch (error) {
      Logger.error('Failed to create category', error);
      throw error;
    }
  }

  /**
   * Update category
   * @param {number} categoryId - Category ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated category
   */
  async updateCategory(categoryId, updateData) {
    try {
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check name uniqueness if changing
      if (updateData.name && updateData.name !== category.name) {
        const existing = await CategoryModel.findByName(updateData.name);
        if (existing) {
          throw new ConflictError('Category name already exists');
        }
      }

      const updated = await CategoryModel.update(categoryId, updateData);

      Logger.info('Category updated', { categoryId });

      return updated;
    } catch (error) {
      Logger.error('Failed to update category', error);
      throw error;
    }
  }

  /**
   * Delete category
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteCategory(categoryId) {
    try {
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has brands or products
      const stats = await CategoryModel.findWithStats(categoryId);
      if (stats.brand_count > 0 || stats.product_count > 0) {
        throw new ConflictError('Cannot delete category with associated brands or products');
      }

      await CategoryModel.delete(categoryId);

      Logger.info('Category deleted', { categoryId });

      return true;
    } catch (error) {
      Logger.error('Failed to delete category', error);
      throw error;
    }
  }
}

export default new CategoryService();
