/**
 * Application Configuration
 * Main application settings
 * @module config/app
 */

import env from './env.js';

/**
 * Application configuration object
 */
const appConfig = {
  // Application info
  name: env.APP_NAME,
  version: env.APP_VERSION,
  env: env.NODE_ENV,
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  url: env.APP_URL,
  frontendUrl: env.FRONTEND_URL,

  // Security
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },

  bcrypt: {
    rounds: env.BCRYPT_ROUNDS
  },

  auth: {
    maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS,
    lockTime: env.LOCK_TIME
  },

  // CORS
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  },

  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW,
    max: env.RATE_LIMIT_MAX,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  },

  // File upload
  upload: {
    directory: env.UPLOAD_DIR,
    maxFileSize: env.MAX_FILE_SIZE,
    maxFilesPerUpload: env.MAX_FILES_PER_UPLOAD,
    allowedFileTypes: env.ALLOWED_FILE_TYPES
  },

  // CDN
  cdn: {
    bunny: {
      apiKey: env.BUNNY_CDN_API_KEY,
      storageZone: env.BUNNY_CDN_STORAGE_ZONE,
      storagePassword: env.BUNNY_CDN_STORAGE_PASSWORD,
      hostname: env.BUNNY_CDN_HOSTNAME,
      pullZone: env.BUNNY_CDN_PULL_ZONE
    }
  },

  // External services
  googleAI: {
    apiKey: env.GOOGLE_AI_API_KEY,
    ocrSettings: {
      parallelWorkers: env.OCR_PARALLEL_WORKERS,
      timeout: env.OCR_TIMEOUT,
      retryCount: env.OCR_RETRY_COUNT
    }
  },

  email: {
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD
      }
    },
    from: {
      email: env.SMTP_FROM_EMAIL,
      name: env.SMTP_FROM_NAME
    }
  },

  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    webhookUrl: env.TELEGRAM_WEBHOOK_URL
  },

  whatsapp: {
    apiKey: env.WHATSAPP_API_KEY,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: env.WHATSAPP_BUSINESS_ACCOUNT_ID
  },

  // Redis
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB
  },

  // Background jobs
  backgroundJobs: {
    collageSchedulerInterval: env.COLLAGE_SCHEDULER_INTERVAL,
    workers: env.BACKGROUND_WORKERS
  },

  // Feature flags
  features: {
    swagger: env.ENABLE_SWAGGER,
    metrics: env.ENABLE_METRICS,
    cache: env.ENABLE_CACHE
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    file: env.LOG_FILE
  }
};

export default appConfig;
