/**
 * Gelişmiş Hata Ayıklama ve Loglama Sistemi
 * Derinlemesine analiz ve ileri seviye loglama
 */

import { eventBus } from './eventBus';
import { apiClient } from './apiClient';
import { config } from './config';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  TRACE = 'trace',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  BUSINESS = 'business',
  AUDIT = 'audit'
}

export enum LogCategory {
  SYSTEM = 'system',
  USER = 'user',
  API = 'api',
  DATABASE = 'database',
  AUTH = 'auth',
  UPLOAD = 'upload',
  OCR = 'ocr',
  TEMPLATE = 'template',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  CACHE = 'cache',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  BUSINESS = 'business',
  AUDIT = 'audit'
}

export interface LogContext {
  requestId: string;
  userId?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  errorCode?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  data: Record<string, any>;
  tags: string[];
  source: string;
  function: string;
  lineNumber: number;
  threadId: number;
  processId: number;
}

export interface PerformanceMetrics {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsByCategory: Record<string, number>;
  errorCount: number;
  warningCount: number;
  performanceIssues: number;
  securityEvents: number;
  businessEvents: number;
  auditEvents: number;
}

export interface PerformanceStats {
  count: number;
  avg: number;
  min: number;
  max: number;
  recent: number[];
}

export class AdvancedLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 50000;
  private contextStack: LogContext[] = [];
  private filters: Array<(log: LogEntry) => boolean> = [];
  private handlers: Array<(log: LogEntry) => void> = [];
  private metrics: any = {
    totalLogs: 0,
    logsByLevel: {},
    logsByCategory: {},
    errorCount: 0,
    warningCount: 0,
    performanceIssues: 0,
    securityEvents: 0,
    businessEvents: 0,
    auditEvents: 0
  };
  private performanceTracker: Record<string, number[]> = {};
  private errorPatterns: Record<string, number> = {};
  private eventBus: any;
  private isInitialized = false;

  constructor() {
    this.eventBus = eventBus;
    this.initializeMetrics();
    this.setupEventListeners();
    this.initializeLogger();
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      logsByLevel: {},
      logsByCategory: {},
      errorCount: 0,
      warningCount: 0,
      performanceIssues: 0,
      securityEvents: 0,
      businessEvents: 0,
      auditEvents: 0
    };

    Object.values(LogLevel).forEach(level => {
      this.metrics.logsByLevel[level] = 0;
    });

    Object.values(LogCategory).forEach(category => {
      this.metrics.logsByCategory[category] = 0;
    });
  }

  private setupEventListeners(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.error(LogCategory.SYSTEM, 'Global error occurred', {
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        },
        tags: ['global_error', 'unhandled']
      });
    });

    // Unhandled promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.error(LogCategory.SYSTEM, 'Unhandled promise rejection', {
        data: {
          reason: event.reason,
          promise: event.promise
        },
        tags: ['promise_rejection', 'unhandled']
      });
    });

    // Performance observer
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.performance(LogCategory.PERFORMANCE, `Performance entry: ${entry.name}`, {
            data: {
              name: entry.name,
              entryType: entry.entryType,
              startTime: entry.startTime,
              duration: entry.duration,
              detail: entry
            },
            tags: ['performance_observer']
          });
        });
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    }
  }

  private async initializeLogger(): Promise<void> {
    try {
      // Test connection to backend logging
      await apiClient.get('/api/logging/health');
      this.isInitialized = true;
      this.info(LogCategory.SYSTEM, 'Advanced logger initialized successfully');
    } catch (error) {
      console.warn('Advanced logger initialization failed, using console fallback');
      this.isInitialized = false;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  private getCurrentContext(): LogContext | null {
    return this.contextStack.length > 0 ? this.contextStack[this.contextStack.length - 1] : null;
  }

  private createContext(overrides: Partial<LogContext> = {}): LogContext {
    return {
      requestId: this.generateId(),
      ...overrides
    };
  }

  public pushContext(context: LogContext): void {
    this.contextStack.push(context);
  }

  public popContext(): LogContext | null {
    return this.contextStack.pop() || null;
  }

  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data: Record<string, any> = {},
    tags: string[] = [],
    exception?: Error
  ): void {
    try {
      // Get caller information
      const stack = new Error().stack;
      const callerInfo = this.parseStackTrace(stack);
      
      // Create log entry
      const logEntry: LogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        level,
        category,
        message,
        context: this.getCurrentContext() || this.createContext(),
        data: { ...data },
        tags: [...tags],
        source: callerInfo.source,
        function: callerInfo.function,
        lineNumber: callerInfo.lineNumber,
        threadId: 0, // Browser doesn't have thread concept
        processId: 0 // Browser doesn't have process concept
      };

      // Add exception information
      if (exception) {
        logEntry.data.exception = {
          type: exception.constructor.name,
          message: exception.message,
          stack: exception.stack
        };
        logEntry.context.stackTrace = exception.stack;
      }

      // Apply filters
      if (!this.applyFilters(logEntry)) {
        return;
      }

      // Add to logs
      this.logs.push(logEntry);

      // Maintain max logs
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      // Update metrics
      this.updateMetrics(logEntry);

      // Track performance
      if (level === LogLevel.PERFORMANCE) {
        this.trackPerformance(logEntry);
      }

      // Track error patterns
      if (level === LogLevel.ERROR || level === LogLevel.CRITICAL) {
        this.trackErrorPatterns(logEntry);
      }

      // Call handlers
      this.callHandlers(logEntry);

      // Send to backend if initialized
      if (this.isInitialized) {
        this.sendToBackend(logEntry);
      }

      // Console fallback
      this.logToConsole(logEntry);

    } catch (error) {
      console.error('Advanced logging error:', error);
    }
  }

  private parseStackTrace(stack: string | undefined): { source: string; function: string; lineNumber: number } {
    if (!stack) {
      return { source: 'unknown', function: 'unknown', lineNumber: 0 };
    }

    const lines = stack.split('\n');
    const callerLine = lines[3] || lines[2] || lines[1] || '';
    
    // Parse stack trace line
    const match = callerLine.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/) || 
                  callerLine.match(/at\s+(.+?):(\d+):\d+/);
    
    if (match) {
      return {
        source: match[2] || 'unknown',
        function: match[1] || 'unknown',
        lineNumber: parseInt(match[3] || match[2] || '0', 10)
      };
    }

    return { source: 'unknown', function: 'unknown', lineNumber: 0 };
  }

  private applyFilters(logEntry: LogEntry): boolean {
    return this.filters.every(filter => {
      try {
        return filter(logEntry);
      } catch {
        return true;
      }
    });
  }

  private updateMetrics(logEntry: LogEntry): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[logEntry.level]++;
    this.metrics.logsByCategory[logEntry.category]++;

    if (logEntry.level === LogLevel.ERROR) {
      this.metrics.errorCount++;
    } else if (logEntry.level === LogLevel.WARNING) {
      this.metrics.warningCount++;
    }

    if (logEntry.category === LogCategory.PERFORMANCE) {
      this.metrics.performanceIssues++;
    } else if (logEntry.category === LogCategory.SECURITY) {
      this.metrics.securityEvents++;
    } else if (logEntry.category === LogCategory.BUSINESS) {
      this.metrics.businessEvents++;
    } else if (logEntry.category === LogCategory.AUDIT) {
      this.metrics.auditEvents++;
    }
  }

  private trackPerformance(logEntry: LogEntry): void {
    if (logEntry.data.duration !== undefined) {
      const duration = logEntry.data.duration;
      const functionKey = `${logEntry.source}:${logEntry.function}`;

      if (!this.performanceTracker[functionKey]) {
        this.performanceTracker[functionKey] = [];
      }

      this.performanceTracker[functionKey].push(duration);

      // Keep only last 100 measurements
      if (this.performanceTracker[functionKey].length > 100) {
        this.performanceTracker[functionKey].shift();
      }
    }
  }

  private trackErrorPatterns(logEntry: LogEntry): void {
    const errorKey = `${logEntry.category}:${logEntry.message}`;
    this.errorPatterns[errorKey] = (this.errorPatterns[errorKey] || 0) + 1;
  }

  private callHandlers(logEntry: LogEntry): void {
    this.handlers.forEach(handler => {
      try {
        handler(logEntry);
      } catch (error) {
        console.error('Handler error:', error);
      }
    });
  }

  private async sendToBackend(logEntry: LogEntry): Promise<void> {
    try {
      await apiClient.post('/api/logging/log', logEntry);
    } catch (error) {
      // Silent fail to avoid infinite loops
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    const logMethod = this.getConsoleMethod(logEntry.level);
    const message = `[${logEntry.level.toUpperCase()}] ${logEntry.category}: ${logEntry.message}`;
    
    if (logEntry.data && Object.keys(logEntry.data).length > 0) {
      logMethod(message, logEntry.data);
    } else {
      logMethod(message);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARNING:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  public addFilter(filter: (log: LogEntry) => boolean): void {
    this.filters.push(filter);
  }

  public addHandler(handler: (log: LogEntry) => void): void {
    this.handlers.push(handler);
  }

  public debug(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.DEBUG, category, message, data, tags);
  }

  public info(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.INFO, category, message, data, tags);
  }

  public warning(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.WARNING, category, message, data, tags);
  }

  public error(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[], exception?: Error): void {
    this.log(LogLevel.ERROR, category, message, data, tags, exception);
  }

  public critical(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[], exception?: Error): void {
    this.log(LogLevel.CRITICAL, category, message, data, tags, exception);
  }

  public performance(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.PERFORMANCE, category, message, data, tags);
  }

  public security(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.SECURITY, category, message, data, tags);
  }

  public business(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.BUSINESS, category, message, data, tags);
  }

  public audit(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
    this.log(LogLevel.AUDIT, category, message, data, tags);
  }

  public getLogs(
    level?: LogLevel,
    category?: LogCategory,
    startTime?: Date,
    endTime?: Date,
    limit = 1000
  ): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startTime);
    }

    if (endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endTime);
    }

    return filteredLogs.slice(-limit);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getPerformanceStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};
    
    Object.entries(this.performanceTracker).forEach(([functionKey, durations]) => {
      if (durations.length > 0) {
        stats[functionKey] = {
          count: durations.length,
          avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
          min: Math.min(...durations),
          max: Math.max(...durations),
          recent: durations.slice(-10)
        };
      }
    });

    return stats;
  }

  public getErrorPatterns(): Record<string, number> {
    return { ...this.errorPatterns };
  }

  public clearLogs(): void {
    this.logs = [];
    this.performanceTracker = {};
    this.errorPatterns = {};
    this.initializeMetrics();
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public importLogs(logsJson: string): void {
    try {
      const importedLogs = JSON.parse(logsJson);
      if (Array.isArray(importedLogs)) {
        this.logs = importedLogs;
      }
    } catch (error) {
      this.error(LogCategory.SYSTEM, 'Failed to import logs', { error: (error as Error).message });
    }
  }
}

// Global advanced logger instance
export const advancedLogger = new AdvancedLogger();

// Utility functions
export function logFunctionCall(
  level: LogLevel = LogLevel.DEBUG,
  category: LogCategory = LogCategory.SYSTEM
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const functionName = `${target.constructor.name}.${propertyName}`;

      try {
        const result = method.apply(this, args);
        const duration = performance.now() - startTime;

        advancedLogger.info(
          category,
          `Function ${functionName} completed successfully`,
          {
            function: functionName,
            duration,
            level,
            argsCount: args.length
          }
        );

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        advancedLogger.error(
          category,
          `Function ${functionName} failed`,
          {
            function: functionName,
            duration,
            error: (error as Error).message,
            argsCount: args.length
          },
          ['function_call', 'error'],
          error as Error
        );

        throw error;
      }
    };

    return descriptor;
  };
}

export function logPerformance(category: LogCategory = LogCategory.PERFORMANCE) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now();
      const functionName = `${target.constructor.name}.${propertyName}`;

      try {
        const result = method.apply(this, args);
        const duration = performance.now() - startTime;

        advancedLogger.performance(
          category,
          `Performance: ${functionName}`,
          {
            function: functionName,
            duration,
            argsCount: args.length
          },
          ['performance', 'function']
        );

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        advancedLogger.error(
          category,
          `Performance error: ${functionName}`,
          {
            function: functionName,
            duration,
            error: (error as Error).message
          },
          ['performance', 'error'],
          error as Error
        );

        throw error;
      }
    };

    return descriptor;
  };
}

// Context manager
export function createLogContext(overrides: Partial<LogContext> = {}): LogContext {
  return advancedLogger['createContext'](overrides);
}

export function withLogContext<T>(
  context: LogContext,
  fn: () => T
): T {
  advancedLogger.pushContext(context);
  try {
    return fn();
  } finally {
    advancedLogger.popContext();
  }
}

// Export commonly used functions
export function logDebug(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.debug(category, message, data, tags);
}

export function logInfo(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.info(category, message, data, tags);
}

export function logWarning(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.warning(category, message, data, tags);
}

export function logError(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[], exception?: Error): void {
  advancedLogger.error(category, message, data, tags, exception);
}

export function logCritical(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[], exception?: Error): void {
  advancedLogger.critical(category, message, data, tags, exception);
}

export function logPerformanceEvent(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.performance(category, message, data, tags);
}

export function logSecurityEvent(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.security(category, message, data, tags);
}

export function logBusinessEvent(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.business(category, message, data, tags);
}

export function logAuditEvent(category: LogCategory, message: string, data?: Record<string, any>, tags?: string[]): void {
  advancedLogger.audit(category, message, data, tags);
}

export default advancedLogger;
