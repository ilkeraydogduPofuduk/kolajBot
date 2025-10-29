/**
 * Error Handling Middleware
 * Centralized error handling for Express
 * @module middleware/error
 */

import ErrorHandler from '../core/error-handler.js';

/**
 * Error handling middleware
 * Must be the last middleware in the chain
 */
export const errorMiddleware = (err, req, res, next) => {
  ErrorHandler.handle(err, req, res, next);
};

/**
 * 404 Not Found middleware
 */
export const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

export default {
  errorMiddleware,
  notFoundMiddleware
};
