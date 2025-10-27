/**
 * useEnterpriseAnalytics Hook
 * Custom hook for enterprise analytics and reporting
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseAnalyticsService
} from '../services/enterpriseAnalyticsService';
import { 
  AnalyticsEvent, 
  AnalyticsMetric, 
  AnalyticsReport, 
  AnalyticsInsight 
} from '../types/enterprise';

interface UseEnterpriseAnalyticsOptions {
  autoStart?: boolean;
  eventLimit?: number;
  metricLimit?: number;
}

interface UseEnterpriseAnalyticsReturn {
  events: AnalyticsEvent[];
  metrics: AnalyticsMetric[];
  insights: AnalyticsInsight[];
  report: AnalyticsReport | null;
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  trackEvent: (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => void;
  recordMetric: (metric: Omit<AnalyticsMetric, 'id' | 'timestamp'>) => void;
  generateReport: (period?: string) => AnalyticsReport;
  refreshData: () => void;
  analyticsHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseAnalytics = (
  options: UseEnterpriseAnalyticsOptions = {}
): UseEnterpriseAnalyticsReturn => {
  const {
    autoStart = true,
    eventLimit = 100,
    metricLimit = 100
  } = options;

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track analytics event
  const trackEvent = useCallback((event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
    enterpriseAnalyticsService.trackEvent(event);
  }, []);

  // Record analytics metric
  const recordMetric = useCallback((metric: Omit<AnalyticsMetric, 'id' | 'timestamp'>) => {
    enterpriseAnalyticsService.recordMetric(metric);
  }, []);

  // Generate analytics report
  const generateReport = useCallback((period: string = '7d'): AnalyticsReport => {
    const newReport = enterpriseAnalyticsService.generateReport(period);
    setReport(newReport);
    return newReport;
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    setEvents(enterpriseAnalyticsService.getEvents(eventLimit));
    setMetrics(enterpriseAnalyticsService.getMetrics(metricLimit));
    setInsights(enterpriseAnalyticsService.getInsights());
    setReport(enterpriseAnalyticsService.generateReport('7d'));
  }, [eventLimit, metricLimit]);

  // Setup event listener
  useEffect(() => {
    const handleEvent = (event: AnalyticsEvent) => {
      setEvents(prev => [event, ...prev.slice(0, eventLimit - 1)]);
    };

    enterpriseAnalyticsService.addEventListener(handleEvent);

    return () => {
      enterpriseAnalyticsService.removeEventListener(handleEvent);
    };
  }, [eventLimit]);

  // Setup insight listener
  useEffect(() => {
    const handleInsight = (insight: AnalyticsInsight) => {
      setInsights(prev => [insight, ...prev]);
    };

    enterpriseAnalyticsService.addInsightListener(handleInsight);

    return () => {
      enterpriseAnalyticsService.removeInsightListener(handleInsight);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      refreshData();
    }
  }, [autoStart, refreshData]);

  // Get analytics health
  const analyticsHealth = enterpriseAnalyticsService.getAnalyticsHealth();

  return {
    events,
    metrics,
    insights,
    report,
    isLoading,
    hasError,
    error,
    trackEvent,
    recordMetric,
    generateReport,
    refreshData,
    analyticsHealth
  };
};

export default useEnterpriseAnalytics;
