/**
 * Main Application Entry Point
 * Initializes and starts the Express application
 * @module app
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Core imports
import database from './core/database.js';
import Logger from './core/logger.js';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware.js';

// Config imports
import appConfig from './config/app.config.js';
import databaseConfig from './config/database.config.js';

// Route imports
import routes from './routes/index.js';

/**
 * Application class
 */
class Application {
  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize Express middlewares
   */
  initializeMiddlewares() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS middleware
    this.app.use(cors(appConfig.cors));

    // Compression middleware
    this.app.use(compression());

    // Body parser middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    if (appConfig.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      // Custom morgan format for production
      this.app.use(morgan('combined', {
        stream: {
          write: (message) => Logger.http(message.trim())
        }
      }));
    }

    // Rate limiting middleware
    const limiter = rateLimit(appConfig.rateLimit);
    this.app.use('/api/', limiter);

    // Trust proxy (for rate limiting behind reverse proxy)
    this.app.set('trust proxy', 1);

    Logger.info('Middlewares initialized');
  }

  /**
   * Initialize API routes
   */
  initializeRoutes() {
    // API routes
    this.app.use(appConfig.apiPrefix, routes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: appConfig.name,
        version: appConfig.version,
        status: 'running',
        environment: appConfig.env,
        api: {
          prefix: appConfig.apiPrefix,
          documentation: `${appConfig.apiPrefix}/docs`
        },
        timestamp: new Date().toISOString()
      });
    });

    Logger.info('Routes initialized');
  }

  /**
   * Initialize error handling
   */
  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundMiddleware);

    // Global error handler (must be last)
    this.app.use(errorMiddleware);

    Logger.info('Error handling initialized');
  }

  /**
   * Connect to database
   */
  async connectDatabase() {
    try {
      await database.connect(databaseConfig);
      Logger.info('Database connected successfully');
    } catch (error) {
      Logger.error('Database connection failed', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Connect to database
      await this.connectDatabase();

      // Start HTTP server
      const server = this.app.listen(appConfig.port, () => {
        Logger.info('='.repeat(60));
        Logger.info(`🚀 ${appConfig.name} v${appConfig.version}`);
        Logger.info(`📡 Server running on port ${appConfig.port}`);
        Logger.info(`🌍 Environment: ${appConfig.env}`);
        Logger.info(`📍 API Base URL: ${appConfig.url}${appConfig.apiPrefix}`);
        Logger.info(`💾 Database: Connected`);
        Logger.info('='.repeat(60));
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown(server));
      process.on('SIGINT', () => this.shutdown(server));

    } catch (error) {
      Logger.error('Failed to start application', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(server) {
    Logger.info('Shutting down gracefully...');

    // Close server
    server.close(async () => {
      Logger.info('HTTP server closed');

      // Close database connections
      try {
        await database.disconnect();
        Logger.info('Database connections closed');
      } catch (error) {
        Logger.error('Error closing database connections', error);
      }

      Logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      Logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }
}

// Create and start application
const application = new Application();

// Start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  application.start();
}

export default application.getApp();
