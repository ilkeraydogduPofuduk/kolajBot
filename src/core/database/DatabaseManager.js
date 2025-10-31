/**
 * Database Manager - Singleton
 * Central database management with multiple connection support
 * @module core/database/DatabaseManager
 */

import { PostgreSQLAdapter } from './PostgreSQLAdapter.js';
import { QueryBuilder } from './QueryBuilder.js';

class DatabaseManager {
  constructor() {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance;
    }

    this.connections = new Map();
    this.defaultConnection = 'default';
    this.logger = null;

    DatabaseManager.instance = this;
  }

  /**
   * Set logger instance
   */
  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Add database connection
   */
  async addConnection(name, config, adapter = null) {
    if (this.connections.has(name)) {
      throw new Error(`Connection '${name}' already exists`);
    }

    // Use provided adapter or create PostgreSQL adapter by default
    const dbAdapter = adapter || new PostgreSQLAdapter(config, this.logger);

    await dbAdapter.connect(config);

    this.connections.set(name, {
      adapter: dbAdapter,
      config,
      connectedAt: new Date()
    });

    this.logger?.info(`Database connection '${name}' added`);
  }

  /**
   * Get connection by name
   */
  getConnection(name = this.defaultConnection) {
    const connection = this.connections.get(name);

    if (!connection) {
      throw new Error(`Connection '${name}' not found`);
    }

    return connection.adapter;
  }

  /**
   * Get query builder for connection
   */
  query(connectionName = this.defaultConnection) {
    const adapter = this.getConnection(connectionName);
    return new QueryBuilder(adapter, this.logger);
  }

  /**
   * Shorthand for query().from(table)
   */
  table(tableName, connectionName = this.defaultConnection) {
    return this.query(connectionName).from(tableName);
  }

  /**
   * Execute raw SQL query
   */
  async raw(sql, bindings = [], connectionName = this.defaultConnection) {
    const adapter = this.getConnection(connectionName);
    return await adapter.query(sql, bindings);
  }

  /**
   * Execute transaction
   */
  async transaction(callback, connectionName = this.defaultConnection) {
    const adapter = this.getConnection(connectionName);
    return await adapter.transaction(async (transactionAdapter) => {
      const queryBuilder = new QueryBuilder(transactionAdapter, this.logger);
      return await callback(queryBuilder);
    });
  }

  /**
   * Get connection statistics
   */
  getStats(connectionName = this.defaultConnection) {
    const connection = this.connections.get(connectionName);

    if (!connection) {
      return null;
    }

    return {
      name: connectionName,
      dialect: connection.adapter.getDialect(),
      connectedAt: connection.connectedAt,
      uptime: Date.now() - connection.connectedAt.getTime(),
      pool: connection.adapter.getPoolStats?.() || null
    };
  }

  /**
   * Get all connections stats
   */
  getAllStats() {
    const stats = {};

    for (const [name] of this.connections) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }

  /**
   * Close connection
   */
  async closeConnection(name) {
    const connection = this.connections.get(name);

    if (!connection) {
      return;
    }

    await connection.adapter.disconnect();
    this.connections.delete(name);

    this.logger?.info(`Database connection '${name}' closed`);
  }

  /**
   * Close all connections
   */
  async closeAll() {
    const closePromises = [];

    for (const [name] of this.connections) {
      closePromises.push(this.closeConnection(name));
    }

    await Promise.all(closePromises);
    this.logger?.info('All database connections closed');
  }

  /**
   * Health check
   */
  async healthCheck(connectionName = this.defaultConnection) {
    try {
      const adapter = this.getConnection(connectionName);
      await adapter.query('SELECT 1');
      return { healthy: true, connection: connectionName };
    } catch (error) {
      return { healthy: false, connection: connectionName, error: error.message };
    }
  }

  /**
   * Check all connections health
   */
  async healthCheckAll() {
    const checks = {};

    for (const [name] of this.connections) {
      checks[name] = await this.healthCheck(name);
    }

    return checks;
  }
}

// Export singleton instance
export default new DatabaseManager();
