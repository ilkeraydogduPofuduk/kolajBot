/**
 * Standardized API Response Handler
 * Provides consistent response structure across all endpoints
 * @module core/response
 */

/**
 * Response class for standardized API responses
 */
class Response {
  /**
   * Success response
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Created response (201)
   * @param {object} res - Express response object
   * @param {any} data - Response data
   * @param {string} message - Success message
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response (204)
   * @param {object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated response
   * @param {object} res - Express response object
   * @param {Array} data - Array of items
   * @param {object} pagination - Pagination info
   * @param {string} message - Success message
   */
  static paginated(res, data = [], pagination = {}, message = 'Success') {
    return res.status(200).json({
      status: 'success',
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {Array} errors - Validation errors
   */
  static error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Bad Request response (400)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {Array} errors - Validation errors
   */
  static badRequest(res, message = 'Bad Request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized response (401)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response (403)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Not Found response (404)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Conflict response (409)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, 409);
  }

  /**
   * Validation Error response (422)
   * @param {object} res - Express response object
   * @param {Array} errors - Validation errors
   * @param {string} message - Error message
   */
  static validationError(res, errors = [], message = 'Validation failed') {
    return this.error(res, message, 422, errors);
  }

  /**
   * Internal Server Error response (500)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static internalError(res, message = 'Internal Server Error') {
    return this.error(res, message, 500);
  }

  /**
   * Service Unavailable response (503)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable') {
    return this.error(res, message, 503);
  }
}

export default Response;
