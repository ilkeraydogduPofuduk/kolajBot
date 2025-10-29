/**
 * User Controller
 * Handles user management HTTP requests
 * @module controllers/user
 */

import UserService from '../services/user.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';

/**
 * User Controller Class
 */
class UserController {
  /**
   * Get all users
   * GET /api/users
   */
  getAllUsers = ErrorHandler.asyncHandler(async (req, res) => {
    const { page, limit, role_id, is_active } = req.query;
    const result = await UserService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      role_id: role_id ? parseInt(role_id) : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : undefined
    });

    Response.paginated(res, result.records, result.pagination, 'Users retrieved successfully');
  });

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await UserService.getUserById(parseInt(req.params.id));
    Response.success(res, user, 'User retrieved successfully');
  });

  /**
   * Create new user
   * POST /api/users
   */
  createUser = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await UserService.createUser(req.body);
    Response.created(res, user, 'User created successfully');
  });

  /**
   * Update user
   * PUT /api/users/:id
   */
  updateUser = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await UserService.updateUser(parseInt(req.params.id), req.body);
    Response.success(res, user, 'User updated successfully');
  });

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  deleteUser = ErrorHandler.asyncHandler(async (req, res) => {
    await UserService.deleteUser(parseInt(req.params.id));
    Response.success(res, null, 'User deleted successfully');
  });

  /**
   * Search users
   * GET /api/users/search
   */
  searchUsers = ErrorHandler.asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;
    const result = await UserService.searchUsers(q, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });

    Response.paginated(res, result.records, result.pagination, 'Search completed');
  });

  /**
   * Get users by role
   * GET /api/users/by-role/:roleId
   */
  getUsersByRole = ErrorHandler.asyncHandler(async (req, res) => {
    const users = await UserService.getUsersByRole(parseInt(req.params.roleId));
    Response.success(res, users, 'Users retrieved successfully');
  });

  /**
   * Get users by brand
   * GET /api/users/by-brand/:brandId
   */
  getUsersByBrand = ErrorHandler.asyncHandler(async (req, res) => {
    const users = await UserService.getUsersByBrand(parseInt(req.params.brandId));
    Response.success(res, users, 'Users retrieved successfully');
  });

  /**
   * Activate user
   * PUT /api/users/:id/activate
   */
  activateUser = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await UserService.activateUser(parseInt(req.params.id));
    Response.success(res, user, 'User activated successfully');
  });

  /**
   * Deactivate user
   * PUT /api/users/:id/deactivate
   */
  deactivateUser = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await UserService.deactivateUser(parseInt(req.params.id));
    Response.success(res, user, 'User deactivated successfully');
  });

  /**
   * Assign brands to user
   * PUT /api/users/:id/brands
   */
  assignBrands = ErrorHandler.asyncHandler(async (req, res) => {
    const { brandIds } = req.body;
    const user = await UserService.assignBrands(parseInt(req.params.id), brandIds);
    Response.success(res, user, 'Brands assigned successfully');
  });
}

export default new UserController();
