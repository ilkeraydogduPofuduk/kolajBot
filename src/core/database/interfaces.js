/**
 * Database Core Interfaces
 * Abstract definitions for database operations
 * @module core/database/interfaces
 */

/**
 * Base Database Adapter Interface
 * All database adapters must implement this interface
 */
export class IDatabaseAdapter {
  async connect(config) { throw new Error('Not implemented'); }
  async disconnect() { throw new Error('Not implemented'); }
  async query(sql, params) { throw new Error('Not implemented'); }
  async execute(sql, params) { throw new Error('Not implemented'); }
  async transaction(callback) { throw new Error('Not implemented'); }
  getDialect() { throw new Error('Not implemented'); }
}

/**
 * Query Builder Interface
 * Provides fluent API for building SQL queries
 */
export class IQueryBuilder {
  select(...columns) { throw new Error('Not implemented'); }
  from(table) { throw new Error('Not implemented'); }
  where(conditions) { throw new Error('Not implemented'); }
  join(table, condition, type) { throw new Error('Not implemented'); }
  orderBy(column, direction) { throw new Error('Not implemented'); }
  limit(count) { throw new Error('Not implemented'); }
  offset(count) { throw new Error('Not implemented'); }
  groupBy(...columns) { throw new Error('Not implemented'); }
  having(conditions) { throw new Error('Not implemented'); }
  insert(data) { throw new Error('Not implemented'); }
  update(data) { throw new Error('Not implemented'); }
  delete() { throw new Error('Not implemented'); }
  toSQL() { throw new Error('Not implemented'); }
  execute() { throw new Error('Not implemented'); }
}

/**
 * Transaction Manager Interface
 */
export class ITransactionManager {
  async begin() { throw new Error('Not implemented'); }
  async commit() { throw new Error('Not implemented'); }
  async rollback() { throw new Error('Not implemented'); }
  async savepoint(name) { throw new Error('Not implemented'); }
  async rollbackTo(name) { throw new Error('Not implemented'); }
}

/**
 * Connection Pool Interface
 */
export class IConnectionPool {
  async acquire() { throw new Error('Not implemented'); }
  async release(connection) { throw new Error('Not implemented'); }
  async destroy(connection) { throw new Error('Not implemented'); }
  getStats() { throw new Error('Not implemented'); }
}

/**
 * Migration Interface
 */
export class IMigration {
  async up(queryBuilder) { throw new Error('Not implemented'); }
  async down(queryBuilder) { throw new Error('Not implemented'); }
}

/**
 * Schema Builder Interface
 */
export class ISchemaBuilder {
  createTable(tableName, callback) { throw new Error('Not implemented'); }
  alterTable(tableName, callback) { throw new Error('Not implemented'); }
  dropTable(tableName) { throw new Error('Not implemented'); }
  hasTable(tableName) { throw new Error('Not implemented'); }
  hasColumn(tableName, columnName) { throw new Error('Not implemented'); }
}
