/**
 * Enterprise Logging Service
 * Advanced logging with structured data and real-time monitoring
 */

import { LogEntry, LogFilter, LogStats, LogAlert } from '../types/enterprise';

// Extended interfaces for service-specific needs
interface ExtendedLogEntry extends LogEntry {
  tags?: string[];
  metadata?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  request_id?: string;
  duration?: number;
  stack_trace?: string;
}

interface ExtendedLogFilter {
  level?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  category?: string[];
  tags?: string[];
  user_id?: string;
  session_id?: string;
  date_range?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

interface ExtendedLogStats extends LogStats {
  total_logs?: number;
  by_level?: Record<string, number>;
  by_source?: Record<string, number>;
  by_category?: Record<string, number>;
  error_rate?: number;
  avg_response_time?: number;
  unique_users?: number;
  unique_sessions?: number;
}

interface ExtendedLogAlert {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  type?: 'error_spike' | 'performance_degradation' | 'security_incident' | 'system_failure';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  timestamp?: string;
  resolved?: boolean;
  details?: Record<string, any>;
  affected_users?: number;
  affected_sessions?: number;
}

class EnterpriseLoggingService {
  private logs: ExtendedLogEntry[] = [];
  private alerts: ExtendedLogAlert[] = [];
  private listeners: Array<(log: ExtendedLogEntry) => void> = [];
  private alertListeners: Array<(alert: ExtendedLogAlert) => void> = [];
  private readonly MAX_LOGS = 50000;
  private readonly MAX_ALERTS = 1000;
  private readonly ALERT_THRESHOLDS = {
    error_spike: 10,
    performance_degradation: 1000,
    security_incident: 5,
    system_failure: 1
  };

  /**
   * Log entry
   */
  log(entry: Omit<ExtendedLogEntry, 'id' | 'timestamp'>): void {
    const logEntry: ExtendedLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: new Date().toISOString()
    };

    // Add to logs
    this.logs.unshift(logEntry);
    
    // Limit logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    // Check for alerts
    this.checkAlerts(logEntry);

    // Notify listeners
    this.listeners.forEach(listener => listener(logEntry));
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata: Record<string, any> = {}, source: string = 'system'): void {
    this.log({
      level: 'debug',
      message,
      source,
      category: 'debug',
      tags: ['debug'],
      metadata
    });
  }

  /**
   * Log info message
   */
  info(message: string, metadata: Record<string, any> = {}, source: string = 'system'): void {
    this.log({
      level: 'info',
      message,
      source,
      category: 'info',
      tags: ['info'],
      metadata
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata: Record<string, any> = {}, source: string = 'system'): void {
    this.log({
      level: 'warn',
      message,
      source,
      category: 'warning',
      tags: ['warning'],
      metadata
    });
  }

  /**
   * Log error message
   */
  error(message: string, metadata: Record<string, any> = {}, source: string = 'system', stackTrace?: string): void {
    this.log({
      level: 'error',
      message,
      source,
      category: 'error',
      tags: ['error'],
      metadata,
      stack_trace: stackTrace
    });
  }

  /**
   * Log fatal message
   */
  fatal(message: string, metadata: Record<string, any> = {}, source: string = 'system', stackTrace?: string): void {
    this.log({
      level: 'fatal',
      message,
      source,
      category: 'fatal',
      tags: ['fatal'],
      metadata,
      stack_trace: stackTrace
    });
  }

  /**
   * Log user action
   */
  userAction(action: string, user_id: string, metadata: Record<string, any> = {}): void {
    this.log({
      level: 'info',
      message: `User action: ${action}`,
      source: 'user',
      category: 'user_action',
      tags: ['user', 'action'],
      metadata: {
        action,
        ...metadata
      },
      user_id
    });
  }

  /**
   * Log API request
   */
  apiRequest(method: string, endpoint: string, status_code: number, duration: number, metadata: Record<string, any> = {}): void {
    this.log({
      level: status_code >= 400 ? 'error' : 'info',
      message: `${method} ${endpoint} - ${status_code}`,
      source: 'api',
      category: 'api_request',
      tags: ['api', 'request'],
      metadata: {
        method,
        endpoint,
        status_code,
        ...metadata
      },
      duration
    });
  }

  /**
   * Log security event
   */
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata: Record<string, any> = {}): void {
    this.log({
      level: severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warn',
      message: `Security event: ${event}`,
      source: 'security',
      category: 'security',
      tags: ['security', 'event'],
      metadata: {
        event,
        severity,
        ...metadata
      }
    });
  }

  /**
   * Log performance metric
   */
  performanceMetric(metric: string, value: number, unit: string, metadata: Record<string, any> = {}): void {
    this.log({
      level: 'info',
      message: `Performance metric: ${metric} = ${value}${unit}`,
      source: 'performance',
      category: 'performance',
      tags: ['performance', 'metric'],
      metadata: {
        metric,
        value,
        unit,
        ...metadata
      }
    });
  }

  /**
   * Check for alerts
   */
  private checkAlerts(log: LogEntry): void {
    const now = new Date();
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);
    const last1min = new Date(now.getTime() - 1 * 60 * 1000);

    // Error spike detection
    if (log.level === 'error' || log.level === 'fatal') {
      const recentErrors = this.logs.filter(l => 
        (l.level === 'error' || l.level === 'fatal') && 
        new Date(l.timestamp) > last5min
      );

      if (recentErrors.length >= this.ALERT_THRESHOLDS.error_spike) {
        this.createAlert({
          name: 'Error Spike',
          condition: `>= ${this.ALERT_THRESHOLDS.error_spike} errors in 5 minutes`,
          enabled: true,
          type: 'error_spike',
          severity: 'high',
          message: `Error spike detected: ${recentErrors.length} errors in 5 minutes`,
          timestamp: new Date().toISOString(),
          resolved: false,
          details: {
            error_count: recentErrors.length,
            time_window: '5 minutes',
            recent_errors: recentErrors.slice(0, 5).map(e => e.message)
          },
          affected_users: new Set(recentErrors.map(e => e.user_id).filter(Boolean)).size,
          affected_sessions: new Set(recentErrors.map(e => e.session_id).filter(Boolean)).size
        });
      }
    }

    // Performance degradation detection
    if (log.category === 'performance' && log.metadata.value) {
      const value = log.metadata.value;
      const metric = log.metadata.metric;

      if (metric === 'response_time' && value > this.ALERT_THRESHOLDS.performance_degradation) {
        this.createAlert({
          name: 'Performance Degradation',
          condition: `> ${this.ALERT_THRESHOLDS.performance_degradation}ms`,
          enabled: true,
          type: 'performance_degradation',
          severity: 'medium',
          message: `Performance degradation: ${metric} = ${value}ms`,
          timestamp: new Date().toISOString(),
          resolved: false,
          details: {
            metric,
            value,
            threshold: this.ALERT_THRESHOLDS.performance_degradation
          },
          affected_users: 0,
          affected_sessions: 0
        });
      }
    }

    // Security incident detection
    if (log.category === 'security' && log.metadata?.severity === 'high') {
      const recentSecurityEvents = this.logs.filter(l => 
        l.category === 'security' && 
        l.metadata?.severity === 'high' &&
        new Date(l.timestamp) > last1min
      );

      if (recentSecurityEvents.length >= this.ALERT_THRESHOLDS.security_incident) {
        this.createAlert({
          name: 'Security Incident',
          condition: `>= ${this.ALERT_THRESHOLDS.security_incident} high-severity events in 1 minute`,
          enabled: true,
          type: 'security_incident',
          severity: 'critical',
          message: `Security incident detected: ${recentSecurityEvents.length} high-severity events in 1 minute`,
          timestamp: new Date().toISOString(),
          resolved: false,
          details: {
            event_count: recentSecurityEvents.length,
            time_window: '1 minute',
            recent_events: recentSecurityEvents.map(e => e.message)
          },
          affected_users: new Set(recentSecurityEvents.map(e => e.user_id).filter(Boolean)).size,
          affected_sessions: new Set(recentSecurityEvents.map(e => e.session_id).filter(Boolean)).size
        });
      }
    }

    // System failure detection
    if (log.level === 'fatal') {
      this.createAlert({
        name: 'System Failure',
        condition: 'Fatal error detected',
        enabled: true,
        type: 'system_failure',
        severity: 'critical',
        message: `System failure: ${log.message}`,
        timestamp: new Date().toISOString(),
        resolved: false,
        details: {
          source: log.source,
          category: log.category,
          stack_trace: log.stack_trace
        },
        affected_users: log.user_id ? 1 : 0,
        affected_sessions: log.session_id ? 1 : 0
      });
    }
  }

  /**
   * Create log alert
   */
  private createAlert(alert: Omit<ExtendedLogAlert, 'id'>): void {
    const logAlert: ExtendedLogAlert = {
      ...alert,
      id: this.generateAlertId()
    };

    // Add to alerts
    this.alerts.unshift(logAlert);
    
    // Limit alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // Notify listeners
    this.alertListeners.forEach(listener => listener(logAlert));
  }

  /**
   * Get logs with filter
   */
  getLogs(filter: ExtendedLogFilter = {}, limit: number = 100): ExtendedLogEntry[] {
    let filteredLogs = this.logs;

    // Apply filters
    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filter.level);
    }

    if (filter.source) {
      filteredLogs = filteredLogs.filter(log => log.source === filter.source);
    }

    if (filter.category && filter.category.length > 0) {
      filteredLogs = filteredLogs.filter(log => log.category && filter.category!.includes(log.category));
    }

    if (filter.tags && filter.tags.length > 0) {
      filteredLogs = filteredLogs.filter(log => 
        log.tags && filter.tags!.some((tag: string) => log.tags!.includes(tag))
      );
    }

    if (filter.user_id) {
      filteredLogs = filteredLogs.filter(log => log.user_id === filter.user_id);
    }

    if (filter.session_id) {
      filteredLogs = filteredLogs.filter(log => log.session_id === filter.session_id);
    }

    if (filter.date_range) {
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= filter.date_range!.start && 
        new Date(log.timestamp) <= filter.date_range!.end
      );
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower) ||
        (log.category && log.category.toLowerCase().includes(searchLower))
      );
    }

    return filteredLogs.slice(0, limit);
  }

  /**
   * Get log alerts
   */
  getAlerts(): ExtendedLogAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): ExtendedLogAlert[] {
    return this.alerts;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    this.alerts = this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get log statistics
   */
  getLogStats(): LogStats {
    const totalLogs = this.logs.length;
    
    const byLevel = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySource = this.logs.reduce((acc, log) => {
      acc[log.source] = (acc[log.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = this.logs.reduce((acc, log) => {
      if (log.category) {
        acc[log.category] = (acc[log.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const errorCount = byLevel.error || 0;
    const fatalCount = byLevel.fatal || 0;
    const errorRate = totalLogs > 0 ? ((errorCount + fatalCount) / totalLogs) * 100 : 0;

    const performanceLogs = this.logs.filter(log => log.category === 'performance' && log.duration);
    const avgResponseTime = performanceLogs.length > 0 
      ? performanceLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / performanceLogs.length 
      : 0;

    const uniqueUsers = new Set(this.logs.map(log => log.user_id).filter(Boolean)).size;
    const uniqueSessions = new Set(this.logs.map(log => log.session_id).filter(Boolean)).size;

    return {
      totalLogs: totalLogs,
      logsByLevel: byLevel,
      logsBySource: bySource,
      total_logs: totalLogs,
      by_level: byLevel,
      by_source: bySource,
      by_category: byCategory,
      error_rate: errorRate,
      avg_response_time: avgResponseTime,
      unique_users: uniqueUsers
    };
  }

  /**
   * Add log listener
   */
  addLogListener(listener: (log: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove log listener
   */
  removeLogListener(listener: (log: LogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: LogAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: LogAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Generate log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old logs
   */
  clearOldLogs(olderThanDays: number = 7): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.logs.length;
    
    this.logs = this.logs.filter(log => new Date(log.timestamp) > cutoff);
    
    return initialLength - this.logs.length;
  }

  /**
   * Export logs
   */
  exportLogs(filter: ExtendedLogFilter = {}, format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogs(filter, 10000); // Export up to 10k logs
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'source', 'category', 'message', 'user_id', 'session_id'];
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = headers.map(header => {
          const value = log[header as keyof LogEntry];
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value || '';
        });
        csvRows.push(row.join(','));
      });
      
      return csvRows.join('\n');
    } else {
      return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Get logging health
   */
  getLoggingHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const stats = this.getLogStats();
    
    // Check error rate
    if (stats.error_rate && stats.error_rate > 10) {
      issues.push('High error rate');
      recommendations.push('Investigate and fix error-causing issues');
    }

    // Check log volume
    if (stats.total_logs && stats.total_logs > 40000) {
      issues.push('High log volume');
      recommendations.push('Consider log rotation or filtering');
    }

    // Check active alerts
    const activeAlerts = this.getAlerts().length;
    if (activeAlerts > 10) {
      issues.push('High number of active alerts');
      recommendations.push('Review and resolve alerts');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const enterpriseLoggingService = new EnterpriseLoggingService();

export default enterpriseLoggingService;
