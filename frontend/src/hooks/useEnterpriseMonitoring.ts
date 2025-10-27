// @ts-nocheck
/**
 * useEnterpriseMonitoring Hook
 * Custom hook for enterprise monitoring management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseMonitoringService
} from '../services/enterpriseMonitoringService';
import { 
  MonitoringMetric, 
  MonitoringAlert, 
  MonitoringDashboard, 
  MonitoringService 
} from '../types/enterprise';

interface UseEnterpriseMonitoringOptions {
  autoStart?: boolean;
  metricLimit?: number;
  alertLimit?: number;
}

interface UseEnterpriseMonitoringReturn {
  metrics: MonitoringMetric[];
  alerts: MonitoringAlert[];
  dashboards: MonitoringDashboard[];
  services: MonitoringService[];
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  recordMetric: (metric: Omit<MonitoringMetric, 'id' | 'timestamp'>) => void;
  createAlert: (alert: Omit<MonitoringAlert, 'id'>) => void;
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => boolean;
  resolveAlert: (alertId: string, resolvedBy: string) => boolean;
  addService: (service: Omit<MonitoringService, 'id' | 'last_check' | 'uptime' | 'response_time' | 'error_rate'>) => string;
  updateServiceStatus: (id: string, status: MonitoringService['status'], responseTime?: number, error?: boolean) => boolean;
  createDashboard: (dashboard: Omit<MonitoringDashboard, 'id' | 'created_at' | 'updated_at'>) => string;
  updateDashboard: (id: string, updates: Partial<MonitoringDashboard>) => boolean;
  getMetrics: (filter?: any, limit?: number) => MonitoringMetric[];
  getAlerts: (status?: MonitoringAlert['status'], limit?: number) => MonitoringAlert[];
  getAlert: (id: string) => MonitoringAlert | null;
  getService: (id: string) => MonitoringService | null;
  getDashboard: (id: string) => MonitoringDashboard | null;
  refreshMetrics: () => void;
  refreshAlerts: () => void;
  refreshServices: () => void;
  refreshDashboards: () => void;
  clearOldMetrics: (olderThanDays?: number) => number;
  clearResolvedAlerts: () => number;
  monitoringStats: {
    total_metrics: number;
    total_alerts: number;
    active_alerts: number;
    total_services: number;
    healthy_services: number;
    total_dashboards: number;
    avg_response_time: number;
    system_uptime: number;
  };
  monitoringHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseMonitoring = (
  options: UseEnterpriseMonitoringOptions = {}
): UseEnterpriseMonitoringReturn => {
  const {
    autoStart = true,
    metricLimit = 1000,
    alertLimit = 100
  } = options;

  const [metrics, setMetrics] = useState<MonitoringMetric[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [dashboards, setDashboards] = useState<MonitoringDashboard[]>([]);
  const [services, setServices] = useState<MonitoringService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Record metric
  const recordMetric = useCallback((metric: Omit<MonitoringMetric, 'id' | 'timestamp'>) => {
    enterpriseMonitoringService.recordMetric(metric);
  }, []);

  // Create alert
  const createAlert = useCallback((alert: Omit<MonitoringAlert, 'id'>) => {
    enterpriseMonitoringService.createAlert(alert);
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((alertId: string, acknowledgedBy: string): boolean => {
    const acknowledged = enterpriseMonitoringService.acknowledgeAlert(alertId, acknowledgedBy);
    if (acknowledged) {
      setAlerts(enterpriseMonitoringService.getAlerts(undefined, alertLimit));
    }
    return acknowledged;
  }, [alertLimit]);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string, resolvedBy: string): boolean => {
    const resolved = enterpriseMonitoringService.resolveAlert(alertId, resolvedBy);
    if (resolved) {
      setAlerts(enterpriseMonitoringService.getAlerts(undefined, alertLimit));
    }
    return resolved;
  }, [alertLimit]);

  // Add service
  const addService = useCallback((service: Omit<MonitoringService, 'id' | 'last_check' | 'uptime' | 'response_time' | 'error_rate'>): string => {
    const id = enterpriseMonitoringService.addService(service);
    setServices(enterpriseMonitoringService.getServices());
    return id;
  }, []);

  // Update service status
  const updateServiceStatus = useCallback((id: string, status: MonitoringService['status'], responseTime: number = 0, error: boolean = false): boolean => {
    const updated = enterpriseMonitoringService.updateServiceStatus(id, status, responseTime, error);
    if (updated) {
      setServices(enterpriseMonitoringService.getServices());
    }
    return updated;
  }, []);

  // Create dashboard
  const createDashboard = useCallback((dashboard: Omit<MonitoringDashboard, 'id' | 'created_at' | 'updated_at'>): string => {
    const id = enterpriseMonitoringService.createDashboard(dashboard);
    setDashboards(enterpriseMonitoringService.getDashboards());
    return id;
  }, []);

  // Update dashboard
  const updateDashboard = useCallback((id: string, updates: Partial<MonitoringDashboard>): boolean => {
    const updated = enterpriseMonitoringService.updateDashboard(id, updates);
    if (updated) {
      setDashboards(enterpriseMonitoringService.getDashboards());
    }
    return updated;
  }, []);

  // Get metrics with filter
  const getMetrics = useCallback((filter?: any, limit: number = metricLimit): MonitoringMetric[] => {
    return enterpriseMonitoringService.getMetrics(filter, limit);
  }, [metricLimit]);

  // Get alerts
  const getAlerts = useCallback((status?: MonitoringAlert['status'], limit: number = alertLimit): MonitoringAlert[] => {
    return enterpriseMonitoringService.getAlerts(status, limit);
  }, [alertLimit]);

  // Get alert by ID
  const getAlert = useCallback((id: string): MonitoringAlert | null => {
    return enterpriseMonitoringService.getAlert(id);
  }, []);

  // Get service by ID
  const getService = useCallback((id: string): MonitoringService | null => {
    return enterpriseMonitoringService.getService(id);
  }, []);

  // Get dashboard by ID
  const getDashboard = useCallback((id: string): MonitoringDashboard | null => {
    return enterpriseMonitoringService.getDashboard(id);
  }, []);

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    setMetrics(enterpriseMonitoringService.getMetrics(undefined, metricLimit));
  }, [metricLimit]);

  // Refresh alerts
  const refreshAlerts = useCallback(() => {
    setAlerts(enterpriseMonitoringService.getAlerts(undefined, alertLimit));
  }, [alertLimit]);

  // Refresh services
  const refreshServices = useCallback(() => {
    setServices(enterpriseMonitoringService.getServices());
  }, []);

  // Refresh dashboards
  const refreshDashboards = useCallback(() => {
    setDashboards(enterpriseMonitoringService.getDashboards());
  }, []);

  // Clear old metrics
  const clearOldMetrics = useCallback((olderThanDays: number = 30): number => {
    const cleared = enterpriseMonitoringService.clearOldMetrics(olderThanDays);
    setMetrics(enterpriseMonitoringService.getMetrics(undefined, metricLimit));
    return cleared;
  }, [metricLimit]);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback((): number => {
    const cleared = enterpriseMonitoringService.clearResolvedAlerts();
    setAlerts(enterpriseMonitoringService.getAlerts(undefined, alertLimit));
    return cleared;
  }, [alertLimit]);

  // Setup metric listener
  useEffect(() => {
    const handleMetric = (metric: MonitoringMetric) => {
      setMetrics(prev => [metric, ...prev.slice(0, metricLimit - 1)]);
    };

    enterpriseMonitoringService.addMetricListener(handleMetric);

    return () => {
      enterpriseMonitoringService.removeMetricListener(handleMetric);
    };
  }, [metricLimit]);

  // Setup alert listener
  useEffect(() => {
    const handleAlert = (alert: MonitoringAlert) => {
      setAlerts(prev => [alert, ...prev.slice(0, alertLimit - 1)]);
    };

    enterpriseMonitoringService.addAlertListener(handleAlert);

    return () => {
      enterpriseMonitoringService.removeAlertListener(handleAlert);
    };
  }, [alertLimit]);

  // Setup service listener
  useEffect(() => {
    const handleService = (service: MonitoringService) => {
      setServices(prev => prev.map(s => s.id === service.id ? service : s));
    };

    enterpriseMonitoringService.addServiceListener(handleService);

    return () => {
      enterpriseMonitoringService.removeServiceListener(handleService);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setMetrics(enterpriseMonitoringService.getMetrics(undefined, metricLimit));
      setAlerts(enterpriseMonitoringService.getAlerts(undefined, alertLimit));
      setDashboards(enterpriseMonitoringService.getDashboards());
      setServices(enterpriseMonitoringService.getServices());
    }
  }, [autoStart, metricLimit, alertLimit]);

  // Get stats
  const monitoringStats = enterpriseMonitoringService.getMonitoringStats();

  // Get health
  const monitoringHealth = enterpriseMonitoringService.getMonitoringHealth();

  return {
    metrics,
    alerts,
    dashboards,
    services,
    isLoading,
    hasError,
    error,
    recordMetric,
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    addService,
    updateServiceStatus,
    createDashboard,
    updateDashboard,
    getMetrics,
    getAlerts,
    getAlert,
    getService,
    getDashboard,
    refreshMetrics,
    refreshAlerts,
    refreshServices,
    refreshDashboards,
    clearOldMetrics,
    clearResolvedAlerts,
    monitoringStats,
    monitoringHealth
  };
};

export default useEnterpriseMonitoring;
