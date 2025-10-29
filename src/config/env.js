/**
 * Environment Configuration
 * Loads and validates environment variables
 * @module config/env
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Environment configuration object
 */
const env = {
  // Application
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 8000,
  API_PREFIX: process.env.API_PREFIX || '/api',

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT, 10) || 5432,
  DB_NAME: process.env.DB_NAME || 'kolajbot_db',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 20,
  DB_IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
  DB_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000,
  DB_SSL: process.env.DB_SSL === 'true',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
  LOCK_TIME: parseInt(process.env.LOCK_TIME, 10) || 3600000, // 1 hour

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],

  // File Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
  MAX_FILES_PER_UPLOAD: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 100,
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],

  // CDN (Bunny CDN)
  BUNNY_CDN_API_KEY: process.env.BUNNY_CDN_API_KEY || '',
  BUNNY_CDN_STORAGE_ZONE: process.env.BUNNY_CDN_STORAGE_ZONE || '',
  BUNNY_CDN_STORAGE_PASSWORD: process.env.BUNNY_CDN_STORAGE_PASSWORD || '',
  BUNNY_CDN_HOSTNAME: process.env.BUNNY_CDN_HOSTNAME || '',
  BUNNY_CDN_PULL_ZONE: process.env.BUNNY_CDN_PULL_ZONE || '',

  // Google AI (OCR)
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || '',
  OCR_PARALLEL_WORKERS: parseInt(process.env.OCR_PARALLEL_WORKERS, 10) || 10,
  OCR_TIMEOUT: parseInt(process.env.OCR_TIMEOUT, 10) || 30000,
  OCR_RETRY_COUNT: parseInt(process.env.OCR_RETRY_COUNT, 10) || 3,

  // Email (SMTP)
  SMTP_HOST: process.env.SMTP_HOST || 'localhost',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@kolajbot.com',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'KolajBot',

  // Telegram Bot
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || '',

  // WhatsApp
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: process.env.LOG_FILE === 'true',

  // Redis (Optional - for caching and sessions)
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseInt(process.env.REDIS_DB, 10) || 0,

  // Background Jobs
  COLLAGE_SCHEDULER_INTERVAL: parseInt(process.env.COLLAGE_SCHEDULER_INTERVAL, 10) || 30000, // 30 seconds
  BACKGROUND_WORKERS: parseInt(process.env.BACKGROUND_WORKERS, 10) || 8,

  // Application Settings
  APP_NAME: process.env.APP_NAME || 'KolajBot API',
  APP_VERSION: process.env.APP_VERSION || '3.0.0',
  APP_URL: process.env.APP_URL || 'http://localhost:8000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Feature Flags
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true',
  ENABLE_METRICS: process.env.ENABLE_METRICS === 'true',
  ENABLE_CACHE: process.env.ENABLE_CACHE === 'true',
};

/**
 * Validate required environment variables
 */
function validateEnv() {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate on load
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

export default env;
