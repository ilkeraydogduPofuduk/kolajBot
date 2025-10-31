/**
 * Global Error Handler
 * Catches and formats all application errors
 * @module core/errors/ErrorHandler
 */

import { AppError } from './AppError.js';
import Logger from '../logging/Logger.js';

export class ErrorHandler {
  /**
   * Express error middleware
   */
  static middleware() {
    return (err, req, res, next) => {
      // Log error
      Logger.error('Request error', err, {
        method: req.method,
        path: req.path,
        body: req.body,
        userId: req.user?.id
      });

      // Handle operational errors
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          success: false,
          error: {
            message: err.message,
            code: err.errorCode,
            details: err.details
          }
        });
      }

      // Handle validation errors (Joi)
      if (err.name === 'ValidationError' && err.isJoi) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: err.details.map(d => ({ field: d.path.join('.'), message: d.message }))
          }
        });
      }

      // Handle JWT errors
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
          }
        });
      }

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          }
        });
      }

      // Handle multer errors
      if (err.name === 'MulterError') {
        return res.status(400).json({
          success: false,
          error: {
            message: err.message,
            code: 'FILE_UPLOAD_ERROR'
          }
        });
      }

      // Default: Internal server error
      res.status(500).json({
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      });
    };
  }

  /**
   * Async handler wrapper
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle unhandled rejections
   */
  static handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled Rejection', reason);
      throw reason;
    });
  }

  /**
   * Handle uncaught exceptions
   */
  static handleUncaughtException() {
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught Exception', error);
      process.exit(1);
    });
  }
}
