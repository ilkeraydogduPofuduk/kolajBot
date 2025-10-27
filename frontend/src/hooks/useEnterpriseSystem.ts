// @ts-nocheck
/**
 * useEnterpriseSystem Hook
 * Custom hook for enterprise system monitoring and management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseSystemService
} from '../services/enterpriseSystemService';
import { 
  SystemInfo, 
  SystemHealth, 
  SystemMetrics, 
  SystemAlert 
} from '../types/enterprise';

interface UseEnterpriseSystemOptions {
  autoStart?: boolean;
  updateInterval?: number;
}

interface UseEnterpriseSystemReturn {
  systemInfo: SystemInfo | null;
  systemHealth: SystemHealth | null;
  metrics: SystemMetrics[];
  alerts: SystemAlert[];
  performanceScore: number;
  systemStatus: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
  healthSummary: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    alerts: number;
    recommendations: number;
    uptime: string;
  };
  trends: {
    cpu_trend: 'up' | 'down' | 'stable';
    memory_trend: 'up' | 'down' | 'stable';
    disk_trend: 'up' | 'down' | 'stable';
    response_trend: 'up' | 'down' | 'stable';
  };
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  refreshSystemInfo: () => Promise<void>;
  refreshSystemHealth: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  resolveAlert: (alertId: string) => boolean;
  clearResolvedAlerts: () => void;
}

export const useEnterpriseSystem = (
  options: UseEnterpriseSystemOptions = {}
): UseEnterpriseSystemReturn => {
  const {
    autoStart = true,
    updateInterval = 30000 // 30 seconds
  } = options;

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh system info
  const refreshSystemInfo = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const info = await enterpriseSystemService.getSystemInfo();
      setSystemInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system info';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh system health
  const refreshSystemHealth = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const health = await enterpriseSystemService.getSystemHealth();
      setSystemHealth(health);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system health';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh metrics
  const refreshMetrics = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const newMetrics = await enterpriseSystemService.getSystemMetrics();
      setMetrics(newMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get system metrics';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string): boolean => {
    const resolved = enterpriseSystemService.resolveAlert(alertId);
    if (resolved) {
      setAlerts(enterpriseSystemService.getAlerts());
    }
    return resolved;
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    enterpriseSystemService.clearResolvedAlerts();
    setAlerts(enterpriseSystemService.getAlerts());
  }, []);

  // Setup metrics listener
  useEffect(() => {
    const handleMetrics = (newMetrics: SystemMetrics) => {
      setMetrics(prev => [newMetrics, ...prev.slice(0, 99)]); // Keep last 100
    };

    enterpriseSystemService.addMetricsListener(handleMetrics);

    return () => {
      enterpriseSystemService.removeMetricsListener(handleMetrics);
    };
  }, []);

  // Setup alert listener
  useEffect(() => {
    const handleAlert = (alert: SystemAlert) => {
      setAlerts(prev => [alert, ...prev]);
    };

    enterpriseSystemService.addAlertListener(handleAlert);

    return () => {
      enterpriseSystemService.removeAlertListener(handleAlert);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      refreshSystemInfo();
      refreshSystemHealth();
      refreshMetrics();
      setAlerts(enterpriseSystemService.getAlerts());
    }
  }, [autoStart, refreshSystemInfo, refreshSystemHealth, refreshMetrics]);

  // Auto refresh
  useEffect(() => {
    if (!autoStart) return;

    const interval = setInterval(() => {
      refreshMetrics();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [autoStart, updateInterval, refreshMetrics]);

  // Get derived values
  const performanceScore = enterpriseSystemService.getPerformanceScore();
  const systemStatus = enterpriseSystemService.getSystemStatus();
  const recommendations = enterpriseSystemService.getSystemRecommendations();
  const healthSummary = enterpriseSystemService.getSystemHealthSummary();
  const trends = enterpriseSystemService.getSystemTrends();

  return {
    systemInfo,
    systemHealth,
    metrics,
    alerts,
    performanceScore,
    systemStatus,
    recommendations,
    healthSummary,
    trends,
    isLoading,
    hasError,
    error,
    refreshSystemInfo,
    refreshSystemHealth,
    refreshMetrics,
    resolveAlert,
    clearResolvedAlerts
  };
};

export default useEnterpriseSystem;
