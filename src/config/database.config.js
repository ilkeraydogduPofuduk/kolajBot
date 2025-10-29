/**
 * Database Configuration
 * PostgreSQL connection configuration
 * @module config/database
 */

import env from './env.js';

/**
 * Database configuration object
 */
const databaseConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  maxConnections: env.DB_MAX_CONNECTIONS,
  idleTimeout: env.DB_IDLE_TIMEOUT,
  connectionTimeout: env.DB_CONNECTION_TIMEOUT,
  ssl: env.DB_SSL,

  // Connection pool settings
  poolSettings: {
    min: 2,
    max: env.DB_MAX_CONNECTIONS,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT,
  },

  // Migration settings
  migrations: {
    directory: './src/database/migrations',
    tableName: 'migrations'
  },

  // Seed settings
  seeds: {
    directory: './src/database/seeds'
  }
};

export default databaseConfig;
