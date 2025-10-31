/**
 * PostgreSQL Database Adapter
 * High-performance connection pooling and query execution
 * @module core/database/PostgreSQLAdapter
 */

import pg from 'pg';
import { IDatabaseAdapter } from './interfaces.js';

const { Pool } = pg;

export class PostgreSQLAdapter extends IDatabaseAdapter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.pool = null;
    this.isConnected = false;
  }

  async connect(config = this.config) {
    if (this.isConnected) {
      this.logger?.warn('Database already connected');
      return;
    }

    try {
      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.pool?.max || 20,
        min: config.pool?.min || 5,
        idleTimeoutMillis: config.pool?.idleTimeout || 30000,
        connectionTimeoutMillis: config.pool?.connectionTimeout || 10000,
        maxUses: config.pool?.maxUses || 7500,
        allowExitOnIdle: false,
        application_name: config.applicationName || 'KolajBot'
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      this.logger?.info('PostgreSQL connected successfully', {
        host: config.host,
        database: config.database,
        poolSize: config.pool?.max || 20
      });

      // Setup event handlers
      this._setupEventHandlers();
    } catch (error) {
      this.logger?.error('Failed to connect to PostgreSQL', { error });
      throw error;
    }
  }

  _setupEventHandlers() {
    this.pool.on('error', (err, client) => {
      this.logger?.error('Unexpected pool error', { error: err });
    });

    this.pool.on('connect', (client) => {
      this.logger?.debug('New client connected to pool');
    });

    this.pool.on('acquire', (client) => {
      this.logger?.debug('Client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      this.logger?.debug('Client removed from pool');
    });
  }

  async disconnect() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.pool.end();
      this.isConnected = false;
      this.logger?.info('PostgreSQL disconnected');
    } catch (error) {
      this.logger?.error('Error disconnecting from PostgreSQL', { error });
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    try {
      // Convert ? placeholders to $1, $2, etc. for PostgreSQL
      const { text, values } = this._convertPlaceholders(sql, params);

      const result = await this.pool.query(text, values);

      const duration = Date.now() - startTime;
      this.logger?.debug('Query executed', {
        sql: text,
        params: values,
        duration,
        rows: result.rowCount
      });

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger?.error('Query execution failed', {
        sql,
        params,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  async execute(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const startTime = Date.now();

    try {
      const { text, values } = this._convertPlaceholders(sql, params);
      const result = await this.pool.query(text, values);

      const duration = Date.now() - startTime;
      this.logger?.debug('Execute completed', {
        sql: text,
        params: values,
        duration,
        affected: result.rowCount
      });

      return {
        rowCount: result.rowCount,
        rows: result.rows,
        command: result.command
      };
    } catch (error) {
      this.logger?.error('Execute failed', { sql, params, error: error.message });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      this.logger?.debug('Transaction started');

      // Create transaction-scoped adapter
      const transactionAdapter = new TransactionAdapter(client, this.logger);
      const result = await callback(transactionAdapter);

      await client.query('COMMIT');
      this.logger?.debug('Transaction committed');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger?.error('Transaction rolled back', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  getDialect() {
    return 'postgresql';
  }

  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  _convertPlaceholders(sql, params) {
    let index = 0;
    const values = [];

    const text = sql.replace(/\?/g, () => {
      values.push(params[index]);
      index++;
      return `$${index}`;
    });

    return { text, values };
  }
}

/**
 * Transaction Adapter
 * Provides transaction-scoped query execution
 */
class TransactionAdapter extends IDatabaseAdapter {
  constructor(client, logger) {
    super();
    this.client = client;
    this.logger = logger;
  }

  async query(sql, params = []) {
    const { text, values } = this._convertPlaceholders(sql, params);
    const result = await this.client.query(text, values);
    return result.rows;
  }

  async execute(sql, params = []) {
    const { text, values } = this._convertPlaceholders(sql, params);
    const result = await this.client.query(text, values);
    return {
      rowCount: result.rowCount,
      rows: result.rows,
      command: result.command
    };
  }

  async savepoint(name) {
    await this.client.query(`SAVEPOINT ${name}`);
    this.logger?.debug('Savepoint created', { name });
  }

  async rollbackTo(name) {
    await this.client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    this.logger?.debug('Rolled back to savepoint', { name });
  }

  getDialect() {
    return 'postgresql';
  }

  _convertPlaceholders(sql, params) {
    let index = 0;
    const values = [];

    const text = sql.replace(/\?/g, () => {
      values.push(params[index]);
      index++;
      return `$${index}`;
    });

    return { text, values };
  }
}
