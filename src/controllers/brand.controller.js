/**
 * Brand Controller
 * Handles brand management HTTP requests
 * @module controllers/brand
 */

import BrandService from '../services/brand.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';

/**
 * Brand Controller Class
 */
class BrandController {
  /**
   * Get all brands
   * GET /api/brands
   */
  getAllBrands = ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit, category_id, is_active } = req.query;
    const result = await BrandService.getAllBrands({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      category_id: category_id ? parseInt(category_id) : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : undefined
    });

    Response.paginated(res, result.records, result.pagination, 'Brands retrieved successfully');
  });

  /**
   * Get brand by ID
   * GET /api/brands/:id
   */
  getBrandById = ErrorHandler.asyncHandler(async (req, res) => {
    const brand = await BrandService.getBrandById(parseInt(req.params.id));
    Response.success(res, brand, 'Brand retrieved successfully');
  });

  /**
   * Create new brand
   * POST /api/brands
   */
  createBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const brand = await BrandService.createBrand(req.body);
    Response.created(res, brand, 'Brand created successfully');
  });

  /**
   * Update brand
   * PUT /api/brands/:id
   */
  updateBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const brand = await BrandService.updateBrand(parseInt(req.params.id), req.body);
    Response.success(res, brand, 'Brand updated successfully');
  });

  /**
   * Delete brand
   * DELETE /api/brands/:id
   */
  deleteBrand = ErrorHandler.asyncHandler(async (req, res) => {
    await BrandService.deleteBrand(parseInt(req.params.id));
    Response.success(res, null, 'Brand deleted successfully');
  });

  /**
   * Search brands
   * GET /api/brands/search
   */
  searchBrands = ErrorHandler.asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;
    const result = await BrandService.searchBrands(q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    Response.paginated(res, result.records, result.pagination, 'Search completed');
  });

  /**
   * Get brands by category
   * GET /api/brands/by-category/:categoryId
   */
  getBrandsByCategory = ErrorHandler.asyncHandler(async (req, res) => {
    const brands = await BrandService.getBrandsByCategory(parseInt(req.params.categoryId));
    Response.success(res, brands, 'Brands retrieved successfully');
  });

  /**
   * Get brand statistics
   * GET /api/brands/:id/statistics
   */
  getBrandStatistics = ErrorHandler.asyncHandler(async (req, res) => {
    const stats = await BrandService.getBrandStatistics(parseInt(req.params.id));
    Response.success(res, stats, 'Statistics retrieved successfully');
  });

  /**
   * Get active brands
   * GET /api/brands/active
   */
  getActiveBrands = ErrorHandler.asyncHandler(async (req, res) => {
    const brands = await BrandService.getActiveBrands();
    Response.success(res, brands, 'Active brands retrieved successfully');
  });
}

export default new BrandController();
