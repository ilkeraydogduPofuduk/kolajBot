/**
 * Product Model
 * Handles product data management
 * @module models/product
 */

import BaseModel from './base.model.js';

/**
 * Product Model Class
 */
class ProductModel extends BaseModel {
  constructor() {
    super('products', [
      'id', 'name', 'code', 'color', 'product_type', 'size_range', 'slug',
      'brand_id', 'category_id', 'price', 'currency', 'code_2', 'color_2',
      'product_type_2', 'size_range_2', 'price_2', 'currency_2',
      'images', 'specifications', 'ai_extracted_data', 'seo_title',
      'seo_description', 'seo_keywords', 'is_active', 'is_processed',
      'telegram_sent', 'stock_quantity', 'created_at', 'updated_at',
      'created_by', 'updated_by'
    ]);
  }

  /**
   * Create product
   * @param {object} data - Product data
   * @returns {Promise<object>} Created product
   */
  async createProduct(data) {
    const productData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_processed: data.is_processed || false,
      telegram_sent: data.telegram_sent || false,
      images: data.images ? JSON.stringify(data.images) : '[]',
      specifications: data.specifications ? JSON.stringify(data.specifications) : '{}',
      ai_extracted_data: data.ai_extracted_data ? JSON.stringify(data.ai_extracted_data) : '{}'
    };

    return await this.create(productData);
  }

  /**
   * Find product by slug
   * @param {string} slug - Product slug
   * @returns {Promise<object|null>} Product or null
   */
  async findBySlug(slug) {
    return await this.findOne({ slug });
  }

  /**
   * Find product with brand and category
   * @param {number} productId - Product ID
   * @returns {Promise<object|null>} Product with relations
   */
  async findWithRelations(productId) {
    const query = `
      SELECT p.*,
             b.name as brand_name,
             b.logo_url as brand_logo,
             c.name as category_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;
    const result = await this.query(query, [productId]);
    return result[0] || null;
  }

  /**
   * Get products by brand
   * @param {number} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Products with pagination
   */
  async findByBrand(brandId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return await this.paginate({
      where: { brand_id: brandId, is_active: true },
      page,
      limit,
      orderBy: 'created_at',
      order: 'DESC'
    });
  }

  /**
   * Get products by category
   * @param {number} categoryId - Category ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Products with pagination
   */
  async findByCategory(categoryId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return await this.paginate({
      where: { category_id: categoryId, is_active: true },
      page,
      limit,
      orderBy: 'created_at',
      order: 'DESC'
    });
  }

  /**
   * Search products
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async search(searchTerm, options = {}) {
    const { page = 1, limit = 20, brandId, categoryId } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE (p.name ILIKE $1 OR p.code ILIKE $1)';
    const params = [`%${searchTerm}%`, limit, offset];
    let paramIndex = 4;

    if (brandId) {
      whereClause += ` AND p.brand_id = $${paramIndex++}`;
      params.push(brandId);
    }

    if (categoryId) {
      whereClause += ` AND p.category_id = $${paramIndex++}`;
      params.push(categoryId);
    }

    const query = `
      SELECT p.*, b.name as brand_name, c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM products p
      ${whereClause}
    `;

    const countParams = params.filter((_, idx) => idx !== 1 && idx !== 2);

    const [records, countResult] = await Promise.all([
      this.query(query, params),
      this.query(countQuery, countParams)
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
   * Get recent products
   * @param {number} limit - Limit
   * @returns {Promise<Array>} Recent products
   */
  async getRecentProducts(limit = 10) {
    return await this.findAll({
      where: { is_active: true },
      limit,
      orderBy: 'created_at',
      order: 'DESC'
    });
  }

  /**
   * Mark product as processed
   * @param {number} productId - Product ID
   * @returns {Promise<object>} Updated product
   */
  async markAsProcessed(productId) {
    return await this.update(productId, { is_processed: true });
  }

  /**
   * Mark telegram as sent
   * @param {number} productId - Product ID
   * @returns {Promise<object>} Updated product
   */
  async markTelegramSent(productId) {
    return await this.update(productId, { telegram_sent: true });
  }

  /**
   * Get product statistics by brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<object>} Statistics
   */
  async getStatisticsByBrand(brandId) {
    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE is_active = true) as active_products,
        COUNT(*) FILTER (WHERE is_processed = true) as processed_products,
        COUNT(*) FILTER (WHERE telegram_sent = true) as sent_products,
        AVG(price) as avg_price
      FROM products
      WHERE brand_id = $1
    `;
    const result = await this.query(query, [brandId]);
    return result[0] || null;
  }

  /**
   * Bulk create products
   * @param {Array} products - Array of product data
   * @returns {Promise<Array>} Created products
   */
  async bulkCreate(products) {
    const client = await this.beginTransaction();
    const created = [];

    try {
      for (const productData of products) {
        const product = await this.createProduct(productData);
        created.push(product);
      }

      await this.commitTransaction(client);
      return created;
    } catch (error) {
      await this.rollbackTransaction(client);
      throw error;
    }
  }
}

export default new ProductModel();
