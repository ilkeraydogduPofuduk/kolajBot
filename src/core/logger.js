/**
 * Advanced Logger Service
 * Provides structured logging with multiple transports and levels
 * @module core/logger
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add stack trace if error
  if (stack) {
    msg += `\n${stack}`;
  }

  // Add metadata if exists
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        customFormat
      )
    }),

    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for errors only
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log')
    })
  ],

  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log')
    })
  ],
});

/**
 * Logger class with additional helper methods
 */
class Logger {
  /**
   * Log info message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  static info(message, metadata = {}) {
    logger.info(message, metadata);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|object} error - Error object or metadata
   */
  static error(message, error = {}) {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack });
    } else {
      logger.error(message, error);
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  static warn(message, metadata = {}) {
    logger.warn(message, metadata);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {object} metadata - Additional metadata
   */
  static debug(message, metadata = {}) {
    logger.debug(message, metadata);
  }

  /**
   * Log HTTP request
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static http(req, res) {
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode}`;
    const metadata = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    logger.http(message, metadata);
  }

  /**
   * Log database query
   * @param {string} query - SQL query
   * @param {number} duration - Query duration in ms
   */
  static query(query, duration) {
    logger.debug('Database Query', { query, duration: `${duration}ms` });
  }

  /**
   * Log performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   * @param {object} metadata - Additional metadata
   */
  static performance(operation, duration, metadata = {}) {
    logger.info(`Performance: ${operation}`, {
      ...metadata,
      duration: `${duration}ms`
    });
  }
}

export default Logger;
