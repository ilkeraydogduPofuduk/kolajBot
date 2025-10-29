/**
 * Database Connection Pool Manager
 * Manages PostgreSQL connections with pooling and error handling
 * @module core/database
 */

import pg from 'pg';
import Logger from './logger.js';

const { Pool } = pg;

/**
 * Database class for managing PostgreSQL connections
 */
class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize database connection pool
   * @param {object} config - Database configuration
   * @returns {Pool} PostgreSQL pool instance
   */
  async connect(config) {
    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.maxConnections || 20,
        idleTimeoutMillis: config.idleTimeout || 30000,
        connectionTimeoutMillis: config.connectionTimeout || 5000,

        // Advanced pool options
        allowExitOnIdle: false,

        // SSL configuration for production
        ssl: config.ssl
          ? {
              rejectUnauthorized: false
            }
          : false
      });

      // Test connection
      await this.testConnection();

      // Set up event handlers
      this.setupEventHandlers();

      this.isConnected = true;
      Logger.info('Database connection pool established successfully', {
        host: config.host,
        database: config.database,
        maxConnections: config.maxConnections || 20
      });

      return this.pool;
    } catch (error) {
      Logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      Logger.info('Database connection test successful', {
        serverTime: result.rows[0].now
      });
    } finally {
      client.release();
    }
  }

  /**
   * Set up pool event handlers
   */
  setupEventHandlers() {
    // Error event
    this.pool.on('error', (err, client) => {
      Logger.error('Unexpected error on idle client', err);
    });

    // Connect event
    this.pool.on('connect', (client) => {
      Logger.debug('New client connected to database pool');
    });

    // Acquire event
    this.pool.on('acquire', (client) => {
      Logger.debug('Client acquired from pool');
    });

    // Remove event
    this.pool.on('remove', (client) => {
      Logger.debug('Client removed from pool');
    });
  }

  /**
   * Execute a query
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {object} Query result
   */
  async query(text, params = []) {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      Logger.query(text, duration);

      return result;
    } catch (error) {
      Logger.error('Database query error', {
        query: text,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   * @returns {object} Database client
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback function
   * @returns {any} Transaction result
   */
  async transaction(callback) {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      const result = await callback(client);

      await client.query('COMMIT');

      Logger.debug('Transaction committed successfully');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');

      Logger.error('Transaction rolled back', error);

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute queries in batch
   * @param {Array} queries - Array of query objects {text, params}
   * @returns {Array} Array of results
   */
  async batchQuery(queries) {
    const client = await this.getClient();
    const results = [];

    try {
      await client.query('BEGIN');

      for (const query of queries) {
        const result = await client.query(query.text, query.params || []);
        results.push(result);
      }

      await client.query('COMMIT');

      Logger.debug('Batch query executed successfully', {
        queriesCount: queries.length
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      Logger.error('Batch query failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   * @returns {object} Pool statistics
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  /**
   * Close all database connections
   */
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      Logger.info('Database connection pool closed');
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} Connection status
   */
  isHealthy() {
    return this.isConnected && this.pool && this.pool.totalCount > 0;
  }
}

// Export singleton instance
const database = new Database();

export default database;
