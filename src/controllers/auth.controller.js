/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 * @module controllers/auth
 */

import AuthService from '../services/auth.service.js';
import Response from '../core/response.js';
import { ErrorHandler } from '../core/error-handler.js';
import Logger from '../core/logger.js';

/**
 * Authentication Controller Class
 */
class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  register = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await AuthService.register(req.body);
    Response.created(res, user, 'User registered successfully');
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = ErrorHandler.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);

    Logger.info('User logged in', { userId: result.user.id });

    Response.success(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refreshToken = ErrorHandler.asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);

    Response.success(res, result, 'Token refreshed successfully');
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  getCurrentUser = ErrorHandler.asyncHandler(async (req, res) => {
    const user = await AuthService.verifyToken(req.headers.authorization.substring(7));

    Response.success(res, { user: req.user }, 'Current user retrieved');
  });

  /**
   * Change password
   * POST /api/auth/change-password
   */
  changePassword = ErrorHandler.asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user.id, oldPassword, newPassword);

    Response.success(res, null, 'Password changed successfully');
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = ErrorHandler.asyncHandler(async (req, res) => {
    // In a stateless JWT system, logout is handled client-side
    // Server can optionally maintain a blacklist of tokens

    Logger.info('User logged out', { userId: req.user.id });

    Response.success(res, null, 'Logout successful');
  });
}

export default new AuthController();
