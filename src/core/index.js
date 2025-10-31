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

// Default exports for convenience
import DatabaseManager from './database/DatabaseManager.js';
import EmailService from './email/EmailService.js';
import SessionManager from './session/SessionManager.js';
import Logger from './logging/Logger.js';
import CacheManager from './cache/CacheManager.js';
import NotificationService from './notification/NotificationService.js';
import EventBus from './events/EventBus.js';

export default {
  DatabaseManager,
  EmailService,
  SessionManager,
  Logger,
  CacheManager,
  NotificationService,
  EventBus
};
