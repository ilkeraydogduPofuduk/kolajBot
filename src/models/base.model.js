/**
 * Base Model Class
 * Provides common functionality for all models
 * @module models/base
 */

import database from '../core/database.js';
import Logger from '../core/logger.js';
import { DatabaseError } from '../core/error-handler.js';

/**
 * Base Model class with ORM-like functionality
 */
class BaseModel {
  /**
   * Constructor
   * @param {string} tableName - Database table name
   * @param {Array} columns - Table columns
   */
  constructor(tableName, columns = []) {
    this.tableName = tableName;
    this.columns = columns;
    this.primaryKey = 'id';
  }

  /**
   * Find all records
   * @param {object} options - Query options
   * @returns {Array} Array of records
   */
  async findAll(options = {}) {
    try {
      const { where = {}, orderBy = 'id', order = 'ASC', limit, offset } = options;

      let query = `SELECT * FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;

      // WHERE clause
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map(key => {
          params.push(where[key]);
          return `${key} = $${paramIndex++}`;
        });
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      // ORDER BY
      query += ` ORDER BY ${orderBy} ${order}`;

      // LIMIT and OFFSET
      if (limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(limit);
      }

      if (offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }

      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      Logger.error(`Error finding all records in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to fetch records from ${this.tableName}`);
    }
  }

  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {object|null} Record or null
   */
  async findById(id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await database.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      Logger.error(`Error finding record by ID in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to fetch record from ${this.tableName}`);
    }
  }

  /**
   * Find one record by conditions
   * @param {object} where - WHERE conditions
   * @returns {object|null} Record or null
   */
  async findOne(where = {}) {
    try {
      const conditions = Object.keys(where).map((key, index) => `${key} = $${index + 1}`);
      const query = `SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')} LIMIT 1`;
      const params = Object.values(where);

      const result = await database.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      Logger.error(`Error finding one record in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to fetch record from ${this.tableName}`);
    }
  }

  /**
   * Count records
   * @param {object} where - WHERE conditions
   * @returns {number} Count
   */
  async count(where = {}) {
    try {
      let query = `SELECT COUNT(*) FROM ${this.tableName}`;
      const params = [];

      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where).map((key, index) => `${key} = $${index + 1}`);
        query += ` WHERE ${conditions.join(' AND ')}`;
        params.push(...Object.values(where));
      }

      const result = await database.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      Logger.error(`Error counting records in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to count records in ${this.tableName}`);
    }
  }

  /**
   * Create a new record
   * @param {object} data - Record data
   * @returns {object} Created record
   */
  async create(data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await database.query(query, values);
      return result.rows[0];
    } catch (error) {
      Logger.error(`Error creating record in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to create record in ${this.tableName}`);
    }
  }

  /**
   * Update a record
   * @param {number} id - Record ID
   * @param {object} data - Update data
   * @returns {object|null} Updated record or null
   */
  async update(id, data) {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause.join(', ')}, updated_at = NOW()
        WHERE ${this.primaryKey} = $${keys.length + 1}
        RETURNING *
      `;

      const result = await database.query(query, [...values, id]);
      return result.rows[0] || null;
    } catch (error) {
      Logger.error(`Error updating record in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to update record in ${this.tableName}`);
    }
  }

  /**
   * Delete a record
   * @param {number} id - Record ID
   * @returns {boolean} Success status
   */
  async delete(id) {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1 RETURNING *`;
      const result = await database.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      Logger.error(`Error deleting record in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to delete record from ${this.tableName}`);
    }
  }

  /**
   * Soft delete a record (sets is_active = false)
   * @param {number} id - Record ID
   * @returns {object|null} Updated record or null
   */
  async softDelete(id) {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET is_active = false, updated_at = NOW()
        WHERE ${this.primaryKey} = $1
        RETURNING *
      `;

      const result = await database.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      Logger.error(`Error soft deleting record in ${this.tableName}`, error);
      throw new DatabaseError(`Failed to soft delete record from ${this.tableName}`);
    }
  }

  /**
   * Execute custom query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Array} Query results
   */
  async query(query, params = []) {
    try {
      const result = await database.query(query, params);
      return result.rows;
    } catch (error) {
      Logger.error(`Error executing custom query on ${this.tableName}`, error);
      throw new DatabaseError(`Query execution failed on ${this.tableName}`);
    }
  }

  /**
   * Begin transaction
   * @returns {object} Database client
   */
  async beginTransaction() {
    const client = await database.getClient();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit transaction
   * @param {object} client - Database client
   */
  async commitTransaction(client) {
    await client.query('COMMIT');
    client.release();
  }

  /**
   * Rollback transaction
   * @param {object} client - Database client
   */
  async rollbackTransaction(client) {
    await client.query('ROLLBACK');
    client.release();
  }

  /**
   * Check if record exists
   * @param {object} where - WHERE conditions
   * @returns {boolean} Exists status
   */
  async exists(where = {}) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Paginate results
   * @param {object} options - Pagination options
   * @returns {object} Paginated results with metadata
   */
  async paginate(options = {}) {
    const { page = 1, limit = 10, where = {}, orderBy = 'id', order = 'ASC' } = options;
    const offset = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.findAll({ where, orderBy, order, limit, offset }),
      this.count(where)
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

export default BaseModel;
