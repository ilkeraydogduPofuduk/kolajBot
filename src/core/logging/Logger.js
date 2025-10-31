/**
 * Advanced Logging System
 * Structured, rotated, multi-transport logging
 * @module core/logging/Logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

class Logger {
  constructor() {
    if (Logger.instance) {
      return Logger.instance;
    }

    this.logger = null;
    this.initialized = false;

    Logger.instance = this;
  }

  /**
   * Initialize logger
   */
  initialize(config = {}) {
    const {
      level = 'info',
      logsDir = 'logs',
      maxSize = '20m',
      maxFiles = '14d',
      format = 'json'
    } = config;

    const formats = [];

    // Add timestamp
    formats.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }));

    // Add errors format
    formats.push(winston.format.errors({ stack: true }));

    // Add JSON or simple format
    if (format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }

    // Create transports
    const transports = [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      }),

      // Combined log file
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize,
        maxFiles,
        format: winston.format.combine(...formats)
      }),

      // Error log file
      new DailyRotateFile({
        dirname: logsDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize,
        maxFiles,
        format: winston.format.combine(...formats)
      })
    ];

    // Create logger
    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false
    });

    this.initialized = true;
  }

  debug(message, meta = {}) {
    this._ensureInitialized();
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this._ensureInitialized();
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this._ensureInitialized();
    this.logger.warn(message, meta);
  }

  error(message, error = null, meta = {}) {
    this._ensureInitialized();
    this.logger.error(message, {
      ...meta,
      error: error ? { message: error.message, stack: error.stack } : undefined
    });
  }

  _ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }
}

export default new Logger();
