/**
 * Configuration Manager - Central Configuration
 * Environment + Database-driven configuration with validation
 * @module core/config/ConfigManager
 */

import dotenv from 'dotenv';
import Joi from 'joi';
import DatabaseManager from '../database/DatabaseManager.js';

dotenv.config();

class ConfigManager {
  constructor() {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }

    this.config = new Map();
    this.envLoaded = false;
    this.dbLoaded = false;
    this.logger = null;

    ConfigManager.instance = this;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Load and validate environment configuration
   */
  loadEnv() {
    const schema = Joi.object({
      NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
      PORT: Joi.number().default(3000),

      // Database
      DB_HOST: Joi.string().required(),
      DB_PORT: Joi.number().default(5432),
      DB_DATABASE: Joi.string().required(),
      DB_USER: Joi.string().required(),
      DB_PASSWORD: Joi.string().required(),

      // Redis
      REDIS_HOST: Joi.string().default('localhost'),
      REDIS_PORT: Joi.number().default(6379),
      REDIS_PASSWORD: Joi.string().allow('').optional(),

      // JWT
      JWT_SECRET: Joi.string().required(),
      JWT_EXPIRY: Joi.string().default('15m'),
      JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

      // App
      APP_NAME: Joi.string().default('KolajBot'),
      APP_URL: Joi.string().uri().default('http://localhost:3000'),

      // CORS
      CORS_ORIGIN: Joi.string().default('*'),

      // File Upload
      MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
      UPLOAD_DIR: Joi.string().default('./uploads'),

      // CDN
      BUNNY_STORAGE_PASSWORD: Joi.string().optional(),
      BUNNY_API_KEY: Joi.string().optional(),
      BUNNY_STORAGE_ZONE: Joi.string().optional(),

      // Google Vision
      GOOGLE_APPLICATION_CREDENTIALS: Joi.string().optional()
    }).unknown(true);

    const { error, value } = schema.validate(process.env);

    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }

    // Store validated config
    Object.entries(value).forEach(([key, val]) => {
      this.config.set(key, val);
    });

    this.envLoaded = true;
    this.logger?.info('Environment configuration loaded');

    return value;
  }

  /**
   * Load configuration from database
   */
  async loadDatabase() {
    try {
      const settings = await DatabaseManager.table('settings').execute();

      settings.forEach(setting => {
        this.config.set(setting.key, setting.value);
      });

      this.dbLoaded = true;
      this.logger?.info('Database configuration loaded', { count: settings.length });
    } catch (error) {
      this.logger?.warn('Failed to load database configuration', { error: error.message });
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = null) {
    return this.config.get(key) || defaultValue;
  }

  /**
   * Get all configuration
   */
  getAll() {
    return Object.fromEntries(this.config);
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    this.config.set(key, value);
  }

  /**
   * Check if key exists
   */
  has(key) {
    return this.config.has(key);
  }

  /**
   * Get database config
   */
  database() {
    return {
      host: this.get('DB_HOST'),
      port: this.get('DB_PORT'),
      database: this.get('DB_DATABASE'),
      user: this.get('DB_USER'),
      password: this.get('DB_PASSWORD'),
      pool: {
        max: 20,
        min: 5,
        idleTimeout: 30000,
        connectionTimeout: 10000
      }
    };
  }

  /**
   * Get Redis config
   */
  redis() {
    return {
      host: this.get('REDIS_HOST'),
      port: this.get('REDIS_PORT'),
      password: this.get('REDIS_PASSWORD') || undefined
    };
  }

  /**
   * Get JWT config
   */
  jwt() {
    return {
      secret: this.get('JWT_SECRET'),
      expiry: this.get('JWT_EXPIRY'),
      refreshExpiry: this.get('JWT_REFRESH_EXPIRY')
    };
  }

  /**
   * Check if production
   */
  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Check if development
   */
  isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * Check if test
   */
  isTest() {
    return this.get('NODE_ENV') === 'test';
  }
}

export default new ConfigManager();
