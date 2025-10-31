/**
 * Base Model - All models extend this
 * Provides common CRUD operations
 * @module core/base/BaseModel
 */

import DatabaseManager from '../database/DatabaseManager.js';
import { NotFoundError, DatabaseError } from '../errors/AppError.js';

export class BaseModel {
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.timestamps = true;
    this.softDeletes = false;
  }

  query() {
    return DatabaseManager.table(this.tableName);
  }

  async findAll(options = {}) {
    let query = this.query();

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.where(key, value);
      });
    }

    if (this.softDeletes) {
      query = query.whereNull('deleted_at');
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy.column, options.orderBy.direction);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query.execute();
  }

  async findById(id) {
    let query = this.query().where(this.primaryKey, id);

    if (this.softDeletes) {
      query = query.whereNull('deleted_at');
    }

    return await query.first();
  }

  async findOne(conditions) {
    let query = this.query();

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.where(key, value);
    });

    if (this.softDeletes) {
      query = query.whereNull('deleted_at');
    }

    return await query.first();
  }

  async create(data) {
    if (this.timestamps) {
      data.created_at = new Date();
      data.updated_at = new Date();
    }

    const [result] = await this.query()
      .insert(data)
      .returning('*')
      .execute();

    return result;
  }

  async update(id, data) {
    if (this.timestamps) {
      data.updated_at = new Date();
    }

    const [result] = await this.query()
      .where(this.primaryKey, id)
      .update(data)
      .returning('*')
      .execute();

    if (!result) {
      throw new NotFoundError(this.tableName);
    }

    return result;
  }

  async delete(id) {
    if (this.softDeletes) {
      return await this.update(id, { deleted_at: new Date() });
    }

    await this.query()
      .where(this.primaryKey, id)
      .delete()
      .execute();

    return true;
  }

  async paginate(page = 1, limit = 20, options = {}) {
    let query = this.query();

    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        query = query.where(key, value);
      });
    }

    if (this.softDeletes) {
      query = query.whereNull('deleted_at');
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy.column, options.orderBy.direction);
    }

    return await query.paginate(page, limit);
  }

  async count(conditions = {}) {
    let query = this.query();

    Object.entries(conditions).forEach(([key, value]) => {
      query = query.where(key, value);
    });

    if (this.softDeletes) {
      query = query.whereNull('deleted_at');
    }

    return await query.count();
  }

  async exists(conditions) {
    return await this.query().where(conditions).exists();
  }
}

export default BaseModel;
