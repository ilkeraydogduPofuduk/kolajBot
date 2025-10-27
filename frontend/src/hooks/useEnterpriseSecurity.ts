// @ts-nocheck
/**
 * useEnterpriseSecurity Hook
 * Custom hook for enterprise security monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseSecurityService
} from '../services/enterpriseSecurityService';
import { 
  SecurityEvent, 
  SecurityAlert, 
  SecurityMetrics 
} from '../types/enterprise';

interface UseEnterpriseSecurityOptions {
  autoStart?: boolean;
  eventLimit?: number;
}

interface UseEnterpriseSecurityReturn {
  events: SecurityEvent[];
  alerts: SecurityAlert[];
  metrics: SecurityMetrics;
  securityScore: number;
  securityStatus: 'secure' | 'warning' | 'critical';
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  logEvent: (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => void;
  resolveAlert: (alertId: string) => boolean;
  clearResolvedAlerts: () => void;
  refreshMetrics: () => void;
}

export const useEnterpriseSecurity = (
  options: UseEnterpriseSecurityOptions = {}
): UseEnterpriseSecurityReturn => {
  const {
    autoStart = true,
    eventLimit = 50
  } = options;

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    total_events: 0,
    events_by_type: {},
    events_by_severity: {},
    blocked_attempts: 0,
    suspicious_activities: 0,
    last_24h_events: 0,
    top_threats: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Log security event
  const logEvent = useCallback((event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
    enterpriseSecurityService.logEvent(event);
  }, []);

  // Resolve alert
  const resolveAlert = useCallback((alertId: string): boolean => {
    const resolved = enterpriseSecurityService.resolveAlert(alertId);
    if (resolved) {
      setAlerts(enterpriseSecurityService.getAlerts());
    }
    return resolved;
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    enterpriseSecurityService.clearResolvedAlerts();
    setAlerts(enterpriseSecurityService.getAlerts());
  }, []);

  // Refresh metrics
  const refreshMetrics = useCallback(() => {
    setMetrics(enterpriseSecurityService.getSecurityMetrics());
  }, []);

  // Setup event listener
  useEffect(() => {
    const handleEvent = (event: SecurityEvent) => {
      setEvents(prev => [event, ...prev.slice(0, eventLimit - 1)]);
      setMetrics(enterpriseSecurityService.getSecurityMetrics());
    };

    enterpriseSecurityService.addEventListener(handleEvent);

    return () => {
      enterpriseSecurityService.removeEventListener(handleEvent);
    };
  }, [eventLimit]);

  // Setup alert listener
  useEffect(() => {
    const handleAlert = (alert: SecurityAlert) => {
      setAlerts(prev => [alert, ...prev]);
    };

    enterpriseSecurityService.addAlertListener(handleAlert);

    return () => {
      enterpriseSecurityService.removeAlertListener(handleAlert);
    };
  }, []);

  // Initial load
  useEffect(() => {
    setEvents(enterpriseSecurityService.getEvents(eventLimit));
    setAlerts(enterpriseSecurityService.getAlerts());
    setMetrics(enterpriseSecurityService.getSecurityMetrics());
  }, [eventLimit]);

  // Get security score
  const securityScore = enterpriseSecurityService.getSecurityScore();

  // Get security status
  const securityStatus = enterpriseSecurityService.getSecurityStatus();

  return {
    events,
    alerts,
    metrics,
    securityScore,
    securityStatus,
    isLoading,
    hasError,
    error,
    logEvent,
    resolveAlert,
    clearResolvedAlerts,
    refreshMetrics
  };
};

export default useEnterpriseSecurity;
