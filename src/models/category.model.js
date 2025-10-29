/**
 * Category Model
 * Handles category data management
 * @module models/category
 */

import BaseModel from './base.model.js';

/**
 * Category Model Class
 */
class CategoryModel extends BaseModel {
  constructor() {
    super('categories', ['id', 'name', 'created_at', 'updated_at']);
  }

  /**
   * Find category by name
   * @param {string} name - Category name
   * @returns {Promise<object|null>} Category or null
   */
  async findByName(name) {
    return await this.findOne({ name });
  }

  /**
   * Get all active categories
   * @returns {Promise<Array>} Active categories
   */
  async getActiveCategories() {
    return await this.findAll({
      orderBy: 'name',
      order: 'ASC'
    });
  }

  /**
   * Get category with brands count
   * @param {number} categoryId - Category ID
   * @returns {Promise<object|null>} Category with stats
   */
  async findWithStats(categoryId) {
    const query = `
      SELECT c.*,
             COUNT(DISTINCT b.id) as brand_count,
             COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN brands b ON c.id = b.category_id AND b.is_active = true
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      WHERE c.id = $1
      GROUP BY c.id
    `;
    const result = await this.query(query, [categoryId]);
    return result[0] || null;
  }

  /**
   * Get all categories with stats
   * @returns {Promise<Array>} Categories with stats
   */
  async getAllWithStats() {
    const query = `
      SELECT c.*,
             COUNT(DISTINCT b.id) as brand_count,
             COUNT(DISTINCT p.id) as product_count
      FROM categories c
      LEFT JOIN brands b ON c.id = b.category_id AND b.is_active = true
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = true
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return await this.query(query);
  }
}

export default new CategoryModel();
