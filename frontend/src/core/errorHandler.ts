/**
 * Merkezi Hata Yönetim Sistemi
 * Tüm hatalar tek yerden yönetilir
 */

import { logger } from './logger';
// import { errorHandler } from './notificationService';

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  details?: any;
  stack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  requestId?: string;
  additionalData?: any;
}

class ErrorHandler {
  private errorQueue: ErrorInfo[] = [];
  private maxQueueSize = 100;
  private isReporting = false;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError({
        message: event.message,
        code: 'GLOBAL_ERROR',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error,
        },
        stack: event.error?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: event.reason?.message || 'Unhandled promise rejection',
        code: 'PROMISE_REJECTION',
        details: {
          reason: event.reason,
          promise: event.promise,
        },
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    });
  }

  public handleError(
    error: Error | string | ErrorInfo,
    context?: ErrorContext
  ): void {
    try {
      const errorInfo = this.normalizeError(error, context);
      
      // Log error
      logger.error('Error occurred', errorInfo);
      
      // Add to queue
      this.addToQueue(errorInfo);
      
      // Show user notification
      this.showUserNotification(errorInfo);
      
      // Report to external service if enabled
      this.reportError(errorInfo);
      
    } catch (handlingError) {
      console.error('Error in error handler:', handlingError);
    }
  }

  private normalizeError(
    error: Error | string | ErrorInfo,
    context?: ErrorContext
  ): ErrorInfo {
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'STRING_ERROR',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        details: context?.additionalData,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'ERROR_INSTANCE',
        stack: error.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        details: {
          name: error.name,
          context: context?.additionalData,
        },
      };
    }

    // ErrorInfo object
    return {
      ...error,
      timestamp: error.timestamp || Date.now(),
      userAgent: error.userAgent || navigator.userAgent,
      url: error.url || window.location.href,
      details: {
        ...error.details,
        context: context?.additionalData,
      },
    };
  }

  private addToQueue(errorInfo: ErrorInfo): void {
    this.errorQueue.push(errorInfo);
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private showUserNotification(errorInfo: ErrorInfo): void {
    // Determine notification type based on error
    let type: 'error' | 'warning' | 'info' = 'error';
    
    if (errorInfo.status && errorInfo.status >= 400 && errorInfo.status < 500) {
      type = 'warning';
    } else if (errorInfo.status && errorInfo.status >= 500) {
      type = 'error';
    } else if (errorInfo.code === 'NETWORK_ERROR') {
      type = 'warning';
    }

    // Show notification logic can be implemented here
  }

  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    if (this.isReporting) return;
    
    this.isReporting = true;
    
    try {
      // Report to external error tracking service
      await this.sendToErrorService(errorInfo);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    } finally {
      this.isReporting = false;
    }
  }

  private async sendToErrorService(errorInfo: ErrorInfo): Promise<void> {
    // This would typically send to a service like Sentry, LogRocket, etc.
    // For now, we'll just log it
    console.log('Error reported to external service:', errorInfo);
  }

  public getErrorQueue(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  public clearErrorQueue(): void {
    this.errorQueue = [];
  }

  public getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<string, number>;
    errorsByStatus: Record<string, number>;
    recentErrors: ErrorInfo[];
  } {
    const errorsByCode: Record<string, number> = {};
    const errorsByStatus: Record<string, number> = {};
    
    this.errorQueue.forEach(error => {
      // Count by code
      const code = error.code || 'UNKNOWN';
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
      
      // Count by status
      if (error.status) {
        const statusRange = Math.floor(error.status / 100) * 100;
        errorsByStatus[statusRange.toString()] = (errorsByStatus[statusRange.toString()] || 0) + 1;
      }
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByCode,
      errorsByStatus,
      recentErrors: this.errorQueue.slice(-10), // Last 10 errors
    };
  }

  public createErrorBoundary(componentName: string) {
    return (error: Error, errorInfo: any) => {
      this.handleError(error, {
        component: componentName,
        action: 'render',
        additionalData: errorInfo,
      });
    };
  }

  public wrapAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: ErrorContext
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handleError(error as Error, context);
        throw error;
      }
    }) as T;
  }

  public wrapSyncFunction<T extends (...args: any[]) => any>(
    fn: T,
    context?: ErrorContext
  ): T {
    return ((...args: any[]) => {
      try {
        return fn(...args);
      } catch (error) {
        this.handleError(error as Error, context);
        throw error;
      }
    }) as T;
  }
}

// Singleton instance
const errorHandler = new ErrorHandler();

// Export commonly used methods
export const { handleError, getErrorQueue, clearErrorQueue, getErrorStats } = errorHandler;

export default errorHandler;
