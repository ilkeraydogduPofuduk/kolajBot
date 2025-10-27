// @ts-nocheck
/**
 * useEnterprisePerformance Hook
 * Custom hook for enterprise performance monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterprisePerformanceService
} from '../services/enterprisePerformanceService';
import { 
  PerformanceMetrics, 
  PerformanceAlert 
} from '../types/enterprise';

interface UseEnterprisePerformanceOptions {
  autoStart?: boolean;
  updateInterval?: number;
}

interface UseEnterprisePerformanceReturn {
  metrics: PerformanceMetrics | null;
  alerts: PerformanceAlert[];
  performanceScore: number;
  performanceStatus: 'excellent' | 'good' | 'warning' | 'critical';
  recommendations: string[];
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  resolveAlert: (alertId: string) => boolean;
  clearResolvedAlerts: () => void;
  refreshMetrics: () => Promise<void>;
}

export const useEnterprisePerformance = (
  options: UseEnterprisePerformanceOptions = {}
): UseEnterprisePerformanceReturn => {
  const {
    autoStart = true,
    updateInterval = 30000
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    enterprisePerformanceService.startMonitoring();
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    enterprisePerformanceService.stopMonitoring();
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string): boolean => {
    const resolved = enterprisePerformanceService.resolveAlert(alertId);
    if (resolved) {
      setAlerts(enterprisePerformanceService.getAlerts());
    }
    return resolved;
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    enterprisePerformanceService.clearResolvedAlerts();
    setAlerts(enterprisePerformanceService.getAlerts());
  }, []);

  // Refresh metrics manually
  const refreshMetrics = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      // Force update metrics
      await (enterprisePerformanceService as any).updateMetrics();
      setMetrics(enterprisePerformanceService.getMetrics());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh metrics';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Setup metrics listener
  useEffect(() => {
    const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
      setHasError(false);
      setError(null);
    };

    enterprisePerformanceService.addMetricsListener(handleMetricsUpdate);

    return () => {
      enterprisePerformanceService.removeMetricsListener(handleMetricsUpdate);
    };
  }, []);

  // Setup alerts listener
  useEffect(() => {
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    enterprisePerformanceService.addAlertListener(handleAlert);

    return () => {
      enterprisePerformanceService.removeAlertListener(handleAlert);
    };
  }, []);

  // Initial load
  useEffect(() => {
    setMetrics(enterprisePerformanceService.getMetrics());
    setAlerts(enterprisePerformanceService.getAlerts());
  }, []);

  // Auto start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (autoStart) {
        stopMonitoring();
      }
    };
  }, [autoStart, startMonitoring, stopMonitoring]);

  // Get performance score
  const performanceScore = enterprisePerformanceService.getPerformanceScore();

  // Get performance status
  const performanceStatus = enterprisePerformanceService.getPerformanceStatus();

  // Get recommendations
  const recommendations = enterprisePerformanceService.getPerformanceRecommendations();

  return {
    metrics,
    alerts,
    performanceScore,
    performanceStatus,
    recommendations,
    isLoading,
    hasError,
    error,
    startMonitoring,
    stopMonitoring,
    resolveAlert,
    clearResolvedAlerts,
    refreshMetrics
  };
};

export default useEnterprisePerformance;
