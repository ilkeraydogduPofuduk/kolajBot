/**
 * Product Controller
 * Handles product management HTTP requests
 * @module controllers/product
 */

import ProductService from '../services/product.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';

/**
 * Product Controller Class
 */
class ProductController {
  /**
   * Get all products
   * GET /api/products
   */
  getAllProducts = ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit, brand_id, category_id, is_active } = req.query;
    const result = await ProductService.getAllProducts({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      brand_id: brand_id ? parseInt(brand_id) : undefined,
      category_id: category_id ? parseInt(category_id) : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : undefined
    });

    Response.paginated(res, result.records, result.pagination, 'Products retrieved successfully');
  });

  /**
   * Get product by ID
   * GET /api/products/:id
   */
  getProductById = ErrorHandler.asyncHandler(async (req, res) => {
    const product = await ProductService.getProductById(parseInt(req.params.id));
    Response.success(res, product, 'Product retrieved successfully');
  });

  /**
   * Get product by slug
   * GET /api/products/slug/:slug
   */
  getProductBySlug = ErrorHandler.asyncHandler(async (req, res) => {
    const product = await ProductService.getProductBySlug(req.params.slug);
    Response.success(res, product, 'Product retrieved successfully');
  });

  /**
   * Create new product
   * POST /api/products
   */
  createProduct = ErrorHandler.asyncHandler(async (req, res) => {
    // Add created_by from authenticated user
    req.body.created_by = req.user.id;

    const product = await ProductService.createProduct(req.body);
    Response.created(res, product, 'Product created successfully');
  });

  /**
   * Update product
   * PUT /api/products/:id
   */
  updateProduct = ErrorHandler.asyncHandler(async (req, res) => {
    // Add updated_by from authenticated user
    req.body.updated_by = req.user.id;

    const product = await ProductService.updateProduct(parseInt(req.params.id), req.body);
    Response.success(res, product, 'Product updated successfully');
  });

  /**
   * Delete product
   * DELETE /api/products/:id
   */
  deleteProduct = ErrorHandler.asyncHandler(async (req, res) => {
    await ProductService.deleteProduct(parseInt(req.params.id));
    Response.success(res, null, 'Product deleted successfully');
  });

  /**
   * Search products
   * GET /api/products/search
   */
  searchProducts = ErrorHandler.asyncHandler(async (req, res) => {
    const { q, page, limit, brand_id, category_id } = req.query;
    const result = await ProductService.searchProducts(q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      brandId: brand_id ? parseInt(brand_id) : undefined,
      categoryId: category_id ? parseInt(category_id) : undefined
    });

    Response.paginated(res, result.records, result.pagination, 'Search completed');
  });

  /**
   * Get products by brand
   * GET /api/products/by-brand/:brandId
   */
  getProductsByBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await ProductService.getProductsByBrand(parseInt(req.params.brandId), {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    Response.paginated(res, result.records, result.pagination, 'Products retrieved successfully');
  });

  /**
   * Get products by category
   * GET /api/products/by-category/:categoryId
   */
  getProductsByCategory = ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await ProductService.getProductsByCategory(parseInt(req.params.categoryId), {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    Response.paginated(res, result.records, result.pagination, 'Products retrieved successfully');
  });

  /**
   * Get recent products
   * GET /api/products/recent
   */
  getRecentProducts = ErrorHandler.asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const products = await ProductService.getRecentProducts(parseInt(limit) || 10);
    Response.success(res, products, 'Recent products retrieved successfully');
  });

  /**
   * Mark product as processed
   * PUT /api/products/:id/mark-processed
   */
  markAsProcessed = ErrorHandler.asyncHandler(async (req, res) => {
    const product = await ProductService.markAsProcessed(parseInt(req.params.id));
    Response.success(res, product, 'Product marked as processed');
  });

  /**
   * Get product statistics by brand
   * GET /api/products/statistics/brand/:brandId
   */
  getStatisticsByBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const stats = await ProductService.getStatisticsByBrand(parseInt(req.params.brandId));
    Response.success(res, stats, 'Statistics retrieved successfully');
  });

  /**
   * Bulk create products
   * POST /api/products/bulk
   */
  bulkCreateProducts = ErrorHandler.asyncHandler(async (req, res) => {
    const { products } = req.body;

    // Add created_by to each product
    const productsWithUser = products.map(p => ({
      ...p,
      created_by: req.user.id
    }));

    const result = await ProductService.bulkCreateProducts(productsWithUser);
    Response.success(res, result, `Bulk creation completed. Created: ${result.created.length}, Errors: ${result.errors.length}`);
  });
}

export default new ProductController();
