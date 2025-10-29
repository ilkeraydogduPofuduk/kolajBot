/**
 * Category Controller
 * Handles category management HTTP requests
 * @module controllers/category
 */

import CategoryService from '../services/category.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';

/**
 * Category Controller Class
 */
class CategoryController {
  /**
   * Get all categories
   * GET /api/categories
   */
  getAllCategories = ErrorHandler.asyncHandler(async (req, res) => {
    const { with_stats } = req.query;

    if (with_stats === 'true') {
      const categories = await CategoryService.getAllCategoriesWithStats();
      Response.success(res, categories, 'Categories with stats retrieved successfully');
    } else {
      const categories = await CategoryService.getAllCategories();
      Response.success(res, categories, 'Categories retrieved successfully');
    }
  });

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  getCategoryById = ErrorHandler.asyncHandler(async (req, res) => {
    const { with_stats } = req.query;

    if (with_stats === 'true') {
      const category = await CategoryService.getCategoryWithStats(parseInt(req.params.id));
      Response.success(res, category, 'Category with stats retrieved successfully');
    } else {
      const category = await CategoryService.getCategoryById(parseInt(req.params.id));
      Response.success(res, category, 'Category retrieved successfully');
    }
  });

  /**
   * Create new category
   * POST /api/categories
   */
  createCategory = ErrorHandler.asyncHandler(async (req, res) => {
    const category = await CategoryService.createCategory(req.body);
    Response.created(res, category, 'Category created successfully');
  });

  /**
   * Update category
   * PUT /api/categories/:id
   */
  updateCategory = ErrorHandler.asyncHandler(async (req, res) => {
    const category = await CategoryService.updateCategory(parseInt(req.params.id), req.body);
    Response.success(res, category, 'Category updated successfully');
  });

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  deleteCategory = ErrorHandler.asyncHandler(async (req, res) => {
    await CategoryService.deleteCategory(parseInt(req.params.id));
    Response.success(res, null, 'Category deleted successfully');
  });
}

export default new CategoryController();
