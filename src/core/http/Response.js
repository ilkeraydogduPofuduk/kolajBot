/**
 * Response Handler - Standard API Responses
 * Consistent response formatting across all endpoints
 * @module core/http/Response
 */

export class Response {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data = null, message = 'Resource created') {
    return this.success(res, data, message, 201);
  }

  static error(res, message = 'Error', statusCode = 500, errorCode = null, details = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: errorCode,
        details
      },
      timestamp: new Date().toISOString()
    });
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total,
        perPage: pagination.perPage,
        currentPage: pagination.currentPage,
        lastPage: pagination.lastPage,
        from: pagination.from,
        to: pagination.to
      },
      timestamp: new Date().toISOString()
    });
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

export default Response;
