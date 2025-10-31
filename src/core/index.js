/**
 * Core Infrastructure - Central Export
 * Complete enterprise-grade foundation
 * @module core
 */

// Database
export { default as DatabaseManager } from './database/DatabaseManager.js';
export { QueryBuilder } from './database/QueryBuilder.js';
export { SchemaBuilder } from './database/SchemaBuilder.js';
export { MigrationManager } from './database/MigrationManager.js';

// Configuration
export { default as ConfigManager } from './config/ConfigManager.js';

// Errors
export * from './errors/AppError.js';
export { ErrorHandler } from './errors/ErrorHandler.js';

// HTTP
export { Response } from './http/Response.js';

// Validation
export { Validator } from './validation/Validator.js';

// Security
export { Security } from './security/Security.js';

// Base Classes
export { BaseModel } from './base/BaseModel.js';
export { BaseService } from './base/BaseService.js';
export { BaseController } from './base/BaseController.js';

// Storage
export { default as StorageManager } from './storage/StorageManager.js';

// Queue
export { default as QueueManager } from './queue/QueueManager.js';

// Middleware
export { AuthMiddleware } from './middleware/AuthMiddleware.js';

// Email
export { default as EmailService } from './email/EmailService.js';
export { renderTemplate as renderEmailTemplate } from './email/TemplateEngine.js';

// Session
export { default as SessionManager } from './session/SessionManager.js';

// Logging
export { default as Logger } from './logging/Logger.js';

// Cache
export { default as CacheManager } from './cache/CacheManager.js';

// Notification
export { default as NotificationService } from './notification/NotificationService.js';

// Events
export { default as EventBus } from './events/EventBus.js';

// Default export
import DatabaseManager from './database/DatabaseManager.js';
import ConfigManager from './config/ConfigManager.js';
import { ErrorHandler } from './errors/ErrorHandler.js';
import { Response } from './http/Response.js';
import { Validator } from './validation/Validator.js';
import { Security } from './security/Security.js';
import { BaseModel } from './base/BaseModel.js';
import { BaseService } from './base/BaseService.js';
import { BaseController } from './base/BaseController.js';
import StorageManager from './storage/StorageManager.js';
import QueueManager from './queue/QueueManager.js';
import { AuthMiddleware } from './middleware/AuthMiddleware.js';
import EmailService from './email/EmailService.js';
import SessionManager from './session/SessionManager.js';
import Logger from './logging/Logger.js';
import CacheManager from './cache/CacheManager.js';
import NotificationService from './notification/NotificationService.js';
import EventBus from './events/EventBus.js';

export default {
  DatabaseManager,
  ConfigManager,
  ErrorHandler,
  Response,
  Validator,
  Security,
  BaseModel,
  BaseService,
  BaseController,
  StorageManager,
  QueueManager,
  AuthMiddleware,
  EmailService,
  SessionManager,
  Logger,
  CacheManager,
  NotificationService,
  EventBus
};
