/**
 * Centralized Error Handling System
 * Custom error classes and error handler middleware
 * @module core/error-handler
 */

import Logger from './logger.js';

/**
 * Base Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 503);
    this.service = service;
  }
}

/**
 * Error Handler Middleware
 */
export class ErrorHandler {
  /**
   * Handle operational errors
   * @param {Error} error - Error object
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static handleOperationalError(error, req, res) {
    const response = {
      status: error.status,
      message: error.message,
      ...(error.errors && { errors: error.errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    Logger.error(`Operational Error: ${error.message}`, {
      statusCode: error.statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
    });

    res.status(error.statusCode).json(response);
  }

  /**
   * Handle programming errors
   * @param {Error} error - Error object
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  static handleProgrammingError(error, req, res) {
    Logger.error('Programming Error:', error);

    const response = {
      status: 'error',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong!'
        : error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    };

    res.status(500).json(response);
  }

  /**
   * Main error handler middleware
   * @param {Error} error - Error object
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {Function} next - Express next function
   */
  static handle(error, req, res, next) {
    // Set default values
    error.statusCode = error.statusCode || 500;
    error.status = error.status || 'error';

    // Handle different error types
    if (error.isOperational) {
      ErrorHandler.handleOperationalError(error, req, res);
    } else if (error.name === 'ValidationError') {
      // Mongoose/Joi validation errors
      const validationError = new ValidationError(
        'Validation failed',
        Object.values(error.errors || {}).map(err => ({
          field: err.path || err.field,
          message: err.message
        }))
      );
      ErrorHandler.handleOperationalError(validationError, req, res);
    } else if (error.code === '23505') {
      // PostgreSQL unique violation
      const conflictError = new ConflictError('Resource already exists');
      ErrorHandler.handleOperationalError(conflictError, req, res);
    } else if (error.code === '23503') {
      // PostgreSQL foreign key violation
      const badRequestError = new BadRequestError('Invalid reference');
      ErrorHandler.handleOperationalError(badRequestError, req, res);
    } else if (error.code === 'ECONNREFUSED') {
      // Database connection error
      const dbError = new DatabaseError('Database connection failed');
      ErrorHandler.handleOperationalError(dbError, req, res);
    } else if (error.name === 'JsonWebTokenError') {
      // JWT errors
      const jwtError = new UnauthorizedError('Invalid token');
      ErrorHandler.handleOperationalError(jwtError, req, res);
    } else if (error.name === 'TokenExpiredError') {
      const jwtError = new UnauthorizedError('Token expired');
      ErrorHandler.handleOperationalError(jwtError, req, res);
    } else {
      // Programming or unknown errors
      ErrorHandler.handleProgrammingError(error, req, res);
    }
  }

  /**
   * Async error wrapper for route handlers
   * @param {Function} fn - Async route handler
   * @returns {Function} Wrapped function
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

/**
 * Global unhandled rejection handler
 */
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection', {
    reason,
    promise
  });

  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

/**
 * Global uncaught exception handler
 */
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception', error);

  // Always exit on uncaught exception
  process.exit(1);
});

export default ErrorHandler;
