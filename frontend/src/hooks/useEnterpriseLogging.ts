// @ts-nocheck
/**
 * useEnterpriseLogging Hook
 * Custom hook for enterprise logging management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseLoggingService
} from '../services/enterpriseLoggingService';
import { 
  LogEntry, 
  LogFilter, 
  LogAlert, 
  LogStats 
} from '../types/enterprise';

interface UseEnterpriseLoggingOptions {
  autoStart?: boolean;
  logLimit?: number;
  alertLimit?: number;
}

interface UseEnterpriseLoggingReturn {
  logs: LogEntry[];
  alerts: LogAlert[];
  stats: LogStats;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  log: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  debug: (message: string, metadata?: Record<string, any>, source?: string) => void;
  info: (message: string, metadata?: Record<string, any>, source?: string) => void;
  warn: (message: string, metadata?: Record<string, any>, source?: string) => void;
  error: (message: string, metadata?: Record<string, any>, source?: string, stackTrace?: string) => void;
  fatal: (message: string, metadata?: Record<string, any>, source?: string, stackTrace?: string) => void;
  userAction: (action: string, user_id: string, metadata?: Record<string, any>) => void;
  apiRequest: (method: string, endpoint: string, status_code: number, duration: number, metadata?: Record<string, any>) => void;
  securityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata?: Record<string, any>) => void;
  performanceMetric: (metric: string, value: number, unit: string, metadata?: Record<string, any>) => void;
  getLogs: (filter?: LogFilter, limit?: number) => LogEntry[];
  resolveAlert: (alertId: string) => boolean;
  clearResolvedAlerts: () => void;
  refreshLogs: () => void;
  refreshAlerts: () => void;
  clearOldLogs: (olderThanDays?: number) => number;
  exportLogs: (filter?: LogFilter, format?: 'json' | 'csv') => string;
  loggingHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseLogging = (
  options: UseEnterpriseLoggingOptions = {}
): UseEnterpriseLoggingReturn => {
  const {
    autoStart = true,
    logLimit = 100,
    alertLimit = 50
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<LogAlert[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total_logs: 0,
    by_level: {},
    by_source: {},
    by_category: {},
    error_rate: 0,
    avg_response_time: 0,
    unique_users: 0,
    unique_sessions: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Log entry
  const log = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    enterpriseLoggingService.log(entry);
  }, []);

  // Debug log
  const debug = useCallback((message: string, metadata: Record<string, any> = {}, source: string = 'system') => {
    enterpriseLoggingService.debug(message, metadata, source);
  }, []);

  // Info log
  const info = useCallback((message: string, metadata: Record<string, any> = {}, source: string = 'system') => {
    enterpriseLoggingService.info(message, metadata, source);
  }, []);

  // Warning log
  const warn = useCallback((message: string, metadata: Record<string, any> = {}, source: string = 'system') => {
    enterpriseLoggingService.warn(message, metadata, source);
  }, []);

  // Error log
  const logError = useCallback((message: string, metadata: Record<string, any> = {}, source: string = 'system', stackTrace?: string) => {
    enterpriseLoggingService.error(message, metadata, source, stackTrace);
  }, []);

  // Fatal log
  const fatal = useCallback((message: string, metadata: Record<string, any> = {}, source: string = 'system', stackTrace?: string) => {
    enterpriseLoggingService.fatal(message, metadata, source, stackTrace);
  }, []);

  // User action log
  const userAction = useCallback((action: string, user_id: string, metadata: Record<string, any> = {}) => {
    enterpriseLoggingService.userAction(action, user_id, metadata);
  }, []);

  // API request log
  const apiRequest = useCallback((method: string, endpoint: string, status_code: number, duration: number, metadata: Record<string, any> = {}) => {
    enterpriseLoggingService.apiRequest(method, endpoint, status_code, duration, metadata);
  }, []);

  // Security event log
  const securityEvent = useCallback((event: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata: Record<string, any> = {}) => {
    enterpriseLoggingService.securityEvent(event, severity, metadata);
  }, []);

  // Performance metric log
  const performanceMetric = useCallback((metric: string, value: number, unit: string, metadata: Record<string, any> = {}) => {
    enterpriseLoggingService.performanceMetric(metric, value, unit, metadata);
  }, []);

  // Get logs with filter
  const getLogs = useCallback((filter: LogFilter = {}, limit: number = logLimit): LogEntry[] => {
    return enterpriseLoggingService.getLogs(filter, limit);
  }, [logLimit]);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string): boolean => {
    const resolved = enterpriseLoggingService.resolveAlert(alertId);
    if (resolved) {
      setAlerts(enterpriseLoggingService.getAlerts());
    }
    return resolved;
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    enterpriseLoggingService.clearResolvedAlerts();
    setAlerts(enterpriseLoggingService.getAlerts());
  }, []);

  // Refresh logs
  const refreshLogs = useCallback(() => {
    setLogs(enterpriseLoggingService.getLogs({}, logLimit));
  }, [logLimit]);

  // Refresh alerts
  const refreshAlerts = useCallback(() => {
    setAlerts(enterpriseLoggingService.getAlerts());
  }, []);

  // Clear old logs
  const clearOldLogs = useCallback((olderThanDays: number = 7): number => {
    const cleared = enterpriseLoggingService.clearOldLogs(olderThanDays);
    setLogs(enterpriseLoggingService.getLogs({}, logLimit));
    return cleared;
  }, [logLimit]);

  // Export logs
  const exportLogs = useCallback((filter: LogFilter = {}, format: 'json' | 'csv' = 'json'): string => {
    return enterpriseLoggingService.exportLogs(filter, format);
  }, []);

  // Setup log listener
  useEffect(() => {
    const handleLog = (log: LogEntry) => {
      setLogs(prev => [log, ...prev.slice(0, logLimit - 1)]);
      setStats(enterpriseLoggingService.getLogStats());
    };

    enterpriseLoggingService.addLogListener(handleLog);

    return () => {
      enterpriseLoggingService.removeLogListener(handleLog);
    };
  }, [logLimit]);

  // Setup alert listener
  useEffect(() => {
    const handleAlert = (alert: LogAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, alertLimit - 1)]);
    };

    enterpriseLoggingService.addAlertListener(handleAlert);

    return () => {
      enterpriseLoggingService.removeAlertListener(handleAlert);
    };
  }, [alertLimit]);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setLogs(enterpriseLoggingService.getLogs({}, logLimit));
      setAlerts(enterpriseLoggingService.getAlerts());
      setStats(enterpriseLoggingService.getLogStats());
    }
  }, [autoStart, logLimit]);

  // Get logging health
  const loggingHealth = enterpriseLoggingService.getLoggingHealth();

  return {
    logs,
    alerts,
    stats,
    isLoading,
    hasError,
    errorMessage,
    log,
    debug,
    info,
    warn,
    error: logError,
    fatal,
    userAction,
    apiRequest,
    securityEvent,
    performanceMetric,
    getLogs,
    resolveAlert,
    clearResolvedAlerts,
    refreshLogs,
    refreshAlerts,
    clearOldLogs,
    exportLogs,
    loggingHealth
  };
};

export default useEnterpriseLogging;
