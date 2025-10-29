/**
 * Product Service
 * Handles product management business logic
 * @module services/product
 */

import ProductModel from '../models/product.model.js';
import BrandModel from '../models/brand.model.js';
import CategoryModel from '../models/category.model.js';
import Logger from '../core/logger.js';
import {
  NotFoundError,
  BadRequestError,
  ConflictError
} from '../core/error-handler.js';

/**
 * Product Service Class
 */
class ProductService {
  /**
   * Get all products with pagination
   * @param {object} options - Query options
   * @returns {Promise<object>} Products with pagination
   */
  async getAllProducts(options = {}) {
    try {
      const { page = 1, limit = 20, brand_id, category_id, is_active } = options;

      const where = {};
      if (brand_id) where.brand_id = brand_id;
      if (category_id) where.category_id = category_id;
      if (is_active !== undefined) where.is_active = is_active;

      return await ProductModel.paginate({
        where,
        page,
        limit,
        orderBy: 'created_at',
        order: 'DESC'
      });
    } catch (error) {
      Logger.error('Failed to get products', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   * @param {number} productId - Product ID
   * @returns {Promise<object>} Product data
   */
  async getProductById(productId) {
    try {
      const product = await ProductModel.findWithRelations(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return product;
    } catch (error) {
      Logger.error('Failed to get product by ID', error);
      throw error;
    }
  }

  /**
   * Get product by slug
   * @param {string} slug - Product slug
   * @returns {Promise<object>} Product data
   */
  async getProductBySlug(slug) {
    try {
      const product = await ProductModel.findBySlug(slug);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return product;
    } catch (error) {
      Logger.error('Failed to get product by slug', error);
      throw error;
    }
  }

  /**
   * Create new product
   * @param {object} productData - Product data
   * @returns {Promise<object>} Created product
   */
  async createProduct(productData) {
    try {
      // Verify brand exists
      const brand = await BrandModel.findById(productData.brand_id);
      if (!brand) {
        throw new BadRequestError('Invalid brand');
      }

      // Verify category if provided
      if (productData.category_id) {
        const category = await CategoryModel.findById(productData.category_id);
        if (!category) {
          throw new BadRequestError('Invalid category');
        }
      }

      // Check slug uniqueness if provided
      if (productData.slug) {
        const existing = await ProductModel.findBySlug(productData.slug);
        if (existing) {
          throw new ConflictError('Product slug already exists');
        }
      } else {
        // Generate slug from name
        productData.slug = this.generateSlug(productData.name);
      }

      const product = await ProductModel.createProduct(productData);

      Logger.info('Product created', { productId: product.id, name: product.name });

      return product;
    } catch (error) {
      Logger.error('Failed to create product', error);
      throw error;
    }
  }

  /**
   * Update product
   * @param {number} productId - Product ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated product
   */
  async updateProduct(productId, updateData) {
    try {
      const product = await ProductModel.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Check slug uniqueness if changing
      if (updateData.slug && updateData.slug !== product.slug) {
        const existing = await ProductModel.findBySlug(updateData.slug);
        if (existing) {
          throw new ConflictError('Product slug already exists');
        }
      }

      // Verify brand if changing
      if (updateData.brand_id && updateData.brand_id !== product.brand_id) {
        const brand = await BrandModel.findById(updateData.brand_id);
        if (!brand) {
          throw new BadRequestError('Invalid brand');
        }
      }

      // Verify category if changing
      if (updateData.category_id && updateData.category_id !== product.category_id) {
        const category = await CategoryModel.findById(updateData.category_id);
        if (!category) {
          throw new BadRequestError('Invalid category');
        }
      }

      const updated = await ProductModel.update(productId, updateData);

      Logger.info('Product updated', { productId });

      return updated;
    } catch (error) {
      Logger.error('Failed to update product', error);
      throw error;
    }
  }

  /**
   * Delete product
   * @param {number} productId - Product ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteProduct(productId) {
    try {
      const product = await ProductModel.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      // Soft delete
      await ProductModel.softDelete(productId);

      Logger.info('Product deleted', { productId });

      return true;
    } catch (error) {
      Logger.error('Failed to delete product', error);
      throw error;
    }
  }

  /**
   * Search products
   * @param {string} searchTerm - Search term
   * @param {object} options - Search options
   * @returns {Promise<object>} Search results
   */
  async searchProducts(searchTerm, options = {}) {
    try {
      return await ProductModel.search(searchTerm, options);
    } catch (error) {
      Logger.error('Product search failed', error);
      throw error;
    }
  }

  /**
   * Get products by brand
   * @param {number} brandId - Brand ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Products
   */
  async getProductsByBrand(brandId, options = {}) {
    try {
      // Verify brand exists
      const brand = await BrandModel.findById(brandId);
      if (!brand) {
        throw new NotFoundError('Brand not found');
      }

      return await ProductModel.findByBrand(brandId, options);
    } catch (error) {
      Logger.error('Failed to get products by brand', error);
      throw error;
    }
  }

  /**
   * Get products by category
   * @param {number} categoryId - Category ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Products
   */
  async getProductsByCategory(categoryId, options = {}) {
    try {
      // Verify category exists
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return await ProductModel.findByCategory(categoryId, options);
    } catch (error) {
      Logger.error('Failed to get products by category', error);
      throw error;
    }
  }

  /**
   * Get recent products
   * @param {number} limit - Limit
   * @returns {Promise<Array>} Recent products
   */
  async getRecentProducts(limit = 10) {
    try {
      return await ProductModel.getRecentProducts(limit);
    } catch (error) {
      Logger.error('Failed to get recent products', error);
      throw error;
    }
  }

  /**
   * Mark product as processed
   * @param {number} productId - Product ID
   * @returns {Promise<object>} Updated product
   */
  async markAsProcessed(productId) {
    try {
      const product = await ProductModel.findById(productId);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return await ProductModel.markAsProcessed(productId);
    } catch (error) {
      Logger.error('Failed to mark product as processed', error);
      throw error;
    }
  }

  /**
   * Get product statistics by brand
   * @param {number} brandId - Brand ID
   * @returns {Promise<object>} Statistics
   */
  async getStatisticsByBrand(brandId) {
    try {
      return await ProductModel.getStatisticsByBrand(brandId);
    } catch (error) {
      Logger.error('Failed to get product statistics', error);
      throw error;
    }
  }

  /**
   * Bulk create products
   * @param {Array} products - Array of product data
   * @returns {Promise<Array>} Created products
   */
  async bulkCreateProducts(products) {
    try {
      const created = [];
      const errors = [];

      for (const productData of products) {
        try {
          const product = await this.createProduct(productData);
          created.push(product);
        } catch (error) {
          errors.push({
            data: productData,
            error: error.message
          });
        }
      }

      Logger.info('Bulk product creation completed', {
        total: products.length,
        created: created.length,
        errors: errors.length
      });

      return { created, errors };
    } catch (error) {
      Logger.error('Bulk product creation failed', error);
      throw error;
    }
  }

  /**
   * Generate slug from name
   * @param {string} name - Product name
   * @returns {string} Slug
   */
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now();
  }
}

export default new ProductService();
