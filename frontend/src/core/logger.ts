/**
 * Merkezi Logging Sistemi
 * Tüm loglar tek yerden yönetilir
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxEntries: number;
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxEntries: 1000,
    };

    this.setupGlobalLogging();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalLogging(): void {
    // Override console methods to capture all logs
    if (this.config.enableConsole) {
      const originalConsole = { ...console };
      
      console.log = (...args) => {
        this.log('info', args.join(' '));
        originalConsole.log(...args);
      };
      
      console.warn = (...args) => {
        this.log('warn', args.join(' '));
        originalConsole.warn(...args);
      };
      
      console.error = (...args) => {
        this.log('error', args.join(' '));
        originalConsole.error(...args);
      };
      
      console.debug = (...args) => {
        this.log('debug', args.join(' '));
        originalConsole.debug(...args);
      };
    }
  }

  public setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  public info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  private log(level: LogLevel, message: string, context?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      component: context?.component,
      action: context?.action,
    };

    // Add to entries
    this.entries.push(entry);

    // Maintain max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    // Store in localStorage if enabled
    if (this.config.enableStorage) {
      this.storeEntry(entry);
    }

    // Send to remote if enabled
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry);
    }
  }

  private storeEntry(entry: LogEntry): void {
    try {
      const stored = localStorage.getItem('app_logs');
      const logs = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only last 100 entries in localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('app_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log entry:', error);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      if (this.config.remoteEndpoint) {
        await fetch(this.config.remoteEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(entry),
        });
      }
    } catch (error) {
      console.error('Failed to send log to remote:', error);
    }
  }

  public getEntries(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.entries.filter(entry => entry.level === level);
    }
    return [...this.entries];
  }

  public getEntriesByComponent(component: string): LogEntry[] {
    return this.entries.filter(entry => entry.component === component);
  }

  public getEntriesByUser(userId: string): LogEntry[] {
    return this.entries.filter(entry => entry.userId === userId);
  }

  public getEntriesByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.entries.filter(entry => 
      entry.timestamp >= startTime && entry.timestamp <= endTime
    );
  }

  public clearEntries(): void {
    this.entries = [];
  }

  public getStats(): {
    totalEntries: number;
    entriesByLevel: Record<LogLevel, number>;
    entriesByComponent: Record<string, number>;
    entriesByUser: Record<string, number>;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entriesByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    const entriesByComponent: Record<string, number> = {};
    const entriesByUser: Record<string, number> = {};

    let oldestEntry = Date.now();
    let newestEntry = 0;

    this.entries.forEach(entry => {
      // Count by level
      entriesByLevel[entry.level]++;

      // Count by component
      if (entry.component) {
        entriesByComponent[entry.component] = (entriesByComponent[entry.component] || 0) + 1;
      }

      // Count by user
      if (entry.userId) {
        entriesByUser[entry.userId] = (entriesByUser[entry.userId] || 0) + 1;
      }

      // Track time range
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      totalEntries: this.entries.length,
      entriesByLevel,
      entriesByComponent,
      entriesByUser,
      oldestEntry,
      newestEntry,
    };
  }

  public exportEntries(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'component', 'action', 'userId'];
      const rows = this.entries.map(entry => [
        new Date(entry.timestamp).toISOString(),
        entry.level,
        entry.message,
        entry.component || '',
        entry.action || '',
        entry.userId || '',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.entries, null, 2);
  }

  public importEntries(data: string): void {
    try {
      const entries = JSON.parse(data);
      if (Array.isArray(entries)) {
        this.entries = [...this.entries, ...entries];
      }
    } catch (error) {
      console.error('Failed to import log entries:', error);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Export commonly used methods
export const { debug, info, warn, error, getEntries, clearEntries, getStats } = logger;

export default logger;
