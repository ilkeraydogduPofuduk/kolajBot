/**
 * Main Application Entry Point
 * @module app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Core imports
import {
  DatabaseManager,
  ConfigManager,
  Logger,
  SessionManager,
  CacheManager,
  EmailService,
  StorageManager,
  ErrorHandler
} from './core/index.js';

const app = express();

/**
 * Initialize Core Services
 */
async function initializeCoreServices() {
  try {
    // Load configuration
    Logger.info('Loading configuration...');
    ConfigManager.loadEnv();
    ConfigManager.setLogger(Logger);

    // Initialize logger
    Logger.initialize({
      level: ConfigManager.isDevelopment() ? 'debug' : 'info',
      logsDir: 'logs'
    });

    // Connect database
    Logger.info('Connecting to database...');
    DatabaseManager.setLogger(Logger);
    await DatabaseManager.addConnection('default', ConfigManager.database());

    // Load DB config
    try {
      await ConfigManager.loadDatabase();
    } catch (error) {
      Logger.warn('Could not load database configuration (settings table may not exist yet)');
    }

    // Initialize Redis
    Logger.info('Initializing Redis services...');
    try {
      const redisConfig = ConfigManager.redis();
      await SessionManager.initialize(redisConfig, Logger);
      await CacheManager.initialize(redisConfig, Logger);
    } catch (error) {
      Logger.warn('Redis not available, using fallback');
    }

    // Initialize email
    try {
      await EmailService.initialize(Logger);
    } catch (error) {
      Logger.warn('Email service not configured');
    }

    // Initialize storage
    await StorageManager.initialize();

    Logger.info('Core services initialized');
  } catch (error) {
    Logger.error('Failed to initialize services', error);
    throw error;
  }
}

/**
 * Setup Middleware
 */
function setupMiddleware() {
  app.use(helmet());
  app.use(cors({ origin: ConfigManager.get('CORS_ORIGIN', '*'), credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(compression());
  app.use(morgan(ConfigManager.isDevelopment() ? 'dev' : 'combined'));
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
}

/**
 * Setup Routes
 */
function setupRoutes() {
  // Health
  app.get('/health', async (req, res) => {
    const db = await DatabaseManager.healthCheck();
    res.status(db.healthy ? 200 : 503).json({
      status: db.healthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      database: db
    });
  });

  // Root
  app.get('/', (req, res) => {
    res.json({
      name: 'KolajBot API',
      version: '3.0.0',
      health: '/health'
    });
  });

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use(ErrorHandler.middleware());
}

/**
 * Start Server
 */
async function startServer() {
  const PORT = ConfigManager.get('PORT', 3000);
  const server = app.listen(PORT, () => {
    Logger.info(`🚀 Server: http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    Logger.info('Shutting down...');
    server.close(async () => {
      await DatabaseManager.closeAll();
      await SessionManager.close();
      await CacheManager.close();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Bootstrap
 */
async function bootstrap() {
  try {
    ErrorHandler.handleUncaughtException();
    ErrorHandler.handleUnhandledRejection();
    await initializeCoreServices();
    setupMiddleware();
    setupRoutes();
    await startServer();
  } catch (error) {
    Logger.error('Bootstrap failed', error);
    process.exit(1);
  }
}

bootstrap();

export default app;
