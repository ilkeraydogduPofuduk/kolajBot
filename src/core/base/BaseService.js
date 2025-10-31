/**
 * Base Service - All services extend this
 * Common business logic patterns
 * @module core/base/BaseService
 */

import Logger from '../logging/Logger.js';
import { NotFoundError } from '../errors/AppError.js';

export class BaseService {
  constructor(model) {
    this.model = model;
    this.logger = Logger;
  }

  async getAll(options = {}) {
    return await this.model.findAll(options);
  }

  async getById(id) {
    const result = await this.model.findById(id);

    if (!result) {
      throw new NotFoundError(this.model.tableName);
    }

    return result;
  }

  async create(data) {
    return await this.model.create(data);
  }

  async update(id, data) {
    return await this.model.update(id, data);
  }

  async delete(id) {
    return await this.model.delete(id);
  }

  async paginate(page, limit, options = {}) {
    return await this.model.paginate(page, limit, options);
  }
}

export default BaseService;
