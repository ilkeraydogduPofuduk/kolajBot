/**
 * Base Controller - All controllers extend this
 * Common HTTP request handling patterns
 * @module core/base/BaseController
 */

import { Response } from '../http/Response.js';
import { ErrorHandler } from '../errors/ErrorHandler.js';

export class BaseController {
  constructor(service) {
    this.service = service;
  }

  getAll = ErrorHandler.asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const result = await this.service.paginate(parseInt(page), parseInt(limit));
    return Response.paginated(res, result.data, result.pagination);
  });

  getById = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await this.service.getById(parseInt(req.params.id));
    return Response.success(res, result);
  });

  create = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await this.service.create(req.body);
    return Response.created(res, result);
  });

  update = ErrorHandler.asyncHandler(async (req, res) => {
    const result = await this.service.update(parseInt(req.params.id), req.body);
    return Response.success(res, result, 'Updated successfully');
  });

  delete = ErrorHandler.asyncHandler(async (req, res) => {
    await this.service.delete(parseInt(req.params.id));
    return Response.success(res, null, 'Deleted successfully');
  });
}

export default BaseController;
