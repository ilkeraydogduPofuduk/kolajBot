/**
 * Template Model
 * Handles template data management
 * @module models/template
 */

import BaseModel from './base.model.js';

/**
 * Template Model Class
 */
class TemplateModel extends BaseModel {
  constructor() {
    super('templates', [
      'id', 'name', 'slug', 'product_id', 'brand_id', 'template_type',
      'preview_image', 'template_data', 'thumbnail', 'settings',
      'is_premium', 'is_active', 'is_auto_generated', 'is_master_template',
      'visibility', 'placeholders', 'assigned_brands', 'permissions',
      'usage_count', 'created_by', 'created_at', 'updated_at'
    ]);
  }

  /**
   * Create template
   * @param {object} data - Template data
   * @returns {Promise<object>} Created template
   */
  async createTemplate(data) {
    const templateData = {
      ...data,
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_premium: data.is_premium || false,
      is_auto_generated: data.is_auto_generated || false,
      is_master_template: data.is_master_template || false,
      visibility: data.visibility || 'PRIVATE',
      usage_count: 0,
      template_data: data.template_data ? JSON.stringify(data.template_data) : '{}',
      settings: data.settings ? JSON.stringify(data.settings) : '{}',
      placeholders: data.placeholders ? JSON.stringify(data.placeholders) : '[]',
      assigned_brands: data.assigned_brands ? JSON.stringify(data.assigned_brands) : '[]',
      permissions: data.permissions ? JSON.stringify(data.permissions) : '{}'
    };

    return await this.create(templateData);
  }

  /**
   * Find template by slug
   * @param {string} slug - Template slug
   * @returns {Promise<object|null>} Template or null
   */
  async findBySlug(slug) {
    return await this.findOne({ slug });
  }

  /**
   * Find template with relations
   * @param {number} templateId - Template ID
   * @returns {Promise<object|null>} Template with relations
   */
  async findWithRelations(templateId) {
    const query = `
      SELECT t.*,
             b.name as brand_name,
             b.logo_url as brand_logo,
             p.name as product_name,
             u.first_name || ' ' || u.last_name as created_by_name
      FROM templates t
      LEFT JOIN brands b ON t.brand_id = b.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;
    const result = await this.query(query, [templateId]);
    return result[0] || null;
  }

  /**
   * Get templates by brand
   * @param {number} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Templates with pagination
   */
  async findByBrand(brandId, options = {}) {
    const { page = 1, limit = 20, visibility } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.brand_id = $1 AND t.is_active = true';
    const params = [brandId, limit, offset];
    let paramIndex = 4;

    if (visibility) {
      whereClause += ` AND t.visibility = $${paramIndex++}`;
      params.push(visibility);
    }

    const query = `
      SELECT t.*, b.name as brand_name, p.name as product_name
      FROM templates t
      LEFT JOIN brands b ON t.brand_id = b.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM templates t
      ${whereClause.replace('$2', '').replace('$3', '')}
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
   * Get master templates
   * @returns {Promise<Array>} Master templates
   */
  async getMasterTemplates() {
    return await this.findAll({
      where: { is_master_template: true, is_active: true },
      orderBy: 'usage_count',
      order: 'DESC'
    });
  }

  /**
   * Increment usage count
   * @param {number} templateId - Template ID
   * @returns {Promise<object>} Updated template
   */
  async incrementUsage(templateId) {
    const query = `
      UPDATE templates
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(query, [templateId]);
    return result[0];
  }

  /**
   * Duplicate template
   * @param {number} templateId - Template ID
   * @param {object} newData - New template data
   * @returns {Promise<object>} Duplicated template
   */
  async duplicateTemplate(templateId, newData = {}) {
    const original = await this.findById(templateId);
    if (!original) return null;

    const duplicateData = {
      ...original,
      ...newData,
      id: undefined,
      slug: newData.slug || `${original.slug}-copy-${Date.now()}`,
      name: newData.name || `${original.name} (Copy)`,
      is_master_template: false,
      usage_count: 0
    };

    delete duplicateData.created_at;
    delete duplicateData.updated_at;

    return await this.create(duplicateData);
  }

  /**
   * Search templates
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async search(searchTerm, options = {}) {
    const { page = 1, limit = 20, brandId, visibility } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE (t.name ILIKE $1) AND t.is_active = true';
    const params = [`%${searchTerm}%`, limit, offset];
    let paramIndex = 4;

    if (brandId) {
      whereClause += ` AND t.brand_id = $${paramIndex++}`;
      params.push(brandId);
    }

    if (visibility) {
      whereClause += ` AND t.visibility = $${paramIndex++}`;
      params.push(visibility);
    }

    const query = `
      SELECT t.*, b.name as brand_name, p.name as product_name
      FROM templates t
      LEFT JOIN brands b ON t.brand_id = b.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM templates t
      ${whereClause.replace('$2', '').replace('$3', '')}
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
}

export default new TemplateModel();
