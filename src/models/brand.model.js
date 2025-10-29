/**
 * Brand Model
 * Handles brand data management
 * @module models/brand
 */

import BaseModel from './base.model.js';

/**
 * Brand Model Class
 */
class BrandModel extends BaseModel {
  constructor() {
    super('brands', [
      'id', 'name', 'category_id', 'logo_url', 'created_at',
      'updated_at', 'is_active', 'product_ids', 'template_ids'
    ]);
  }

  /**
   * Create brand
   * @param {object} data - Brand data
   * @returns {Promise<object>} Created brand
   */
  async createBrand(data) {
    const brandData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
      product_ids: data.product_ids ? JSON.stringify(data.product_ids) : '[]',
      template_ids: data.template_ids ? JSON.stringify(data.template_ids) : '[]'
    };

    return await this.create(brandData);
  }

  /**
   * Find brand by name
   * @param {string} name - Brand name
   * @returns {Promise<object|null>} Brand or null
   */
  async findByName(name) {
    return await this.findOne({ name });
  }

  /**
   * Find brand with category
   * @param {number} brandId - Brand ID
   * @returns {Promise<object|null>} Brand with category
   */
  async findWithCategory(brandId) {
    const query = `
      SELECT b.*, c.name as category_name
      FROM brands b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = $1
    `;
    const result = await this.query(query, [brandId]);
    return result[0] || null;
  }

  /**
   * Get brands by category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Brands
   */
  async findByCategory(categoryId) {
    return await this.findAll({
      where: { category_id: categoryId, is_active: true }
    });
  }

  /**
   * Get active brands
   * @returns {Promise<Array>} Active brands
   */
  async getActiveBrands() {
    return await this.findAll({
      where: { is_active: true },
      orderBy: 'name',
      order: 'ASC'
    });
  }

  /**
   * Get brand statistics
   * @param {number} brandId - Brand ID
   * @returns {Promise<object>} Brand statistics
   */
  async getStatistics(brandId) {
    const query = `
      SELECT
        b.id,
        b.name,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT t.id) as template_count,
        COUNT(DISTINCT u.id) as user_count
      FROM brands b
      LEFT JOIN products p ON p.brand_id = b.id AND p.is_active = true
      LEFT JOIN templates t ON t.brand_id = b.id AND t.is_active = true
      LEFT JOIN users u ON u.brand_ids::jsonb @> to_jsonb(ARRAY[b.id]) AND u.is_active = true
      WHERE b.id = $1
      GROUP BY b.id, b.name
    `;
    const result = await this.query(query, [brandId]);
    return result[0] || null;
  }

  /**
   * Search brands
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async search(searchTerm, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT b.*, c.name as category_name
      FROM brands b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.name ILIKE $1
      ORDER BY b.name ASC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM brands b
      WHERE b.name ILIKE $1
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

  /**
   * Add product to brand
   * @param {number} brandId - Brand ID
   * @param {number} productId - Product ID
   * @returns {Promise<object>} Updated brand
   */
  async addProduct(brandId, productId) {
    const brand = await this.findById(brandId);
    const productIds = brand.product_ids ? JSON.parse(brand.product_ids) : [];

    if (!productIds.includes(productId)) {
      productIds.push(productId);
      return await this.update(brandId, {
        product_ids: JSON.stringify(productIds)
      });
    }

    return brand;
  }

  /**
   * Add template to brand
   * @param {number} brandId - Brand ID
   * @param {number} templateId - Template ID
   * @returns {Promise<object>} Updated brand
   */
  async addTemplate(brandId, templateId) {
    const brand = await this.findById(brandId);
    const templateIds = brand.template_ids ? JSON.parse(brand.template_ids) : [];

    if (!templateIds.includes(templateId)) {
      templateIds.push(templateId);
      return await this.update(brandId, {
        template_ids: JSON.stringify(templateIds)
      });
    }

    return brand;
  }
}

export default new BrandModel();
