// @ts-nocheck
/**
 * useEnterpriseIntegration Hook
 * Custom hook for enterprise integration management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseIntegrationService
} from '../services/enterpriseIntegrationService';
import { 
  Integration, 
  IntegrationEvent, 
  IntegrationHealth 
} from '../types/enterprise';

interface UseEnterpriseIntegrationOptions {
  autoStart?: boolean;
  eventLimit?: number;
}

interface UseEnterpriseIntegrationReturn {
  integrations: Integration[];
  events: IntegrationEvent[];
  health: IntegrationHealth;
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  addIntegration: (integration: Omit<Integration, 'id' | 'created_at' | 'updated_at'>) => string;
  updateIntegration: (id: string, updates: Partial<Integration>) => boolean;
  removeIntegration: (id: string) => boolean;
  getIntegration: (id: string) => Integration | null;
  testIntegration: (id: string) => Promise<{
    success: boolean;
    response_time: number;
    error?: string;
    data?: any;
  }>;
  refreshIntegrations: () => void;
  refreshEvents: () => void;
  refreshHealth: () => void;
  clearOldEvents: (olderThanHours?: number) => number;
  integrationStats: {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    by_health: Record<string, number>;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time: number;
  };
  healthSummary: {
    status: 'healthy' | 'warning' | 'critical';
    total: number;
    active: number;
    failed: number;
    error_rate: number;
    avg_response_time: number;
  };
}

export const useEnterpriseIntegration = (
  options: UseEnterpriseIntegrationOptions = {}
): UseEnterpriseIntegrationReturn => {
  const {
    autoStart = true,
    eventLimit = 100
  } = options;

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [health, setHealth] = useState<IntegrationHealth>({
    overall_status: 'healthy',
    total_integrations: 0,
    active_integrations: 0,
    failed_integrations: 0,
    avg_response_time: 0,
    error_rate: 0,
    uptime: 0,
    last_check: new Date()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add integration
  const addIntegration = useCallback((integration: Omit<Integration, 'id' | 'created_at' | 'updated_at'>): string => {
    const id = enterpriseIntegrationService.addIntegration(integration);
    setIntegrations(enterpriseIntegrationService.getIntegrations());
    return id;
  }, []);

  // Update integration
  const updateIntegration = useCallback((id: string, updates: Partial<Integration>): boolean => {
    const updated = enterpriseIntegrationService.updateIntegration(id, updates);
    if (updated) {
      setIntegrations(enterpriseIntegrationService.getIntegrations());
    }
    return updated;
  }, []);

  // Remove integration
  const removeIntegration = useCallback((id: string): boolean => {
    const removed = enterpriseIntegrationService.removeIntegration(id);
    if (removed) {
      setIntegrations(enterpriseIntegrationService.getIntegrations());
    }
    return removed;
  }, []);

  // Get integration
  const getIntegration = useCallback((id: string): Integration | null => {
    return enterpriseIntegrationService.getIntegration(id);
  }, []);

  // Test integration
  const testIntegration = useCallback(async (id: string) => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const result = await enterpriseIntegrationService.testIntegration(id);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Integration test failed';
      setError(errorMessage);
      setHasError(true);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh integrations
  const refreshIntegrations = useCallback(() => {
    setIntegrations(enterpriseIntegrationService.getIntegrations());
  }, []);

  // Refresh events
  const refreshEvents = useCallback(() => {
    setEvents(enterpriseIntegrationService.getEvents(undefined, eventLimit));
  }, [eventLimit]);

  // Refresh health
  const refreshHealth = useCallback(() => {
    setHealth(enterpriseIntegrationService.getIntegrationHealth());
  }, []);

  // Clear old events
  const clearOldEvents = useCallback((olderThanHours: number = 24): number => {
    const cleared = enterpriseIntegrationService.clearOldEvents(olderThanHours);
    setEvents(enterpriseIntegrationService.getEvents(undefined, eventLimit));
    return cleared;
  }, [eventLimit]);

  // Setup event listener
  useEffect(() => {
    const handleEvent = (event: IntegrationEvent) => {
      setEvents(prev => [event, ...prev.slice(0, eventLimit - 1)]);
    };

    enterpriseIntegrationService.addEventListener(handleEvent);

    return () => {
      enterpriseIntegrationService.removeEventListener(handleEvent);
    };
  }, [eventLimit]);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setIntegrations(enterpriseIntegrationService.getIntegrations());
      setEvents(enterpriseIntegrationService.getEvents(undefined, eventLimit));
      setHealth(enterpriseIntegrationService.getIntegrationHealth());
    }
  }, [autoStart, eventLimit]);

  // Get stats
  const integrationStats = enterpriseIntegrationService.getIntegrationStats();

  // Get health summary
  const healthSummary = enterpriseIntegrationService.getHealthSummary();

  return {
    integrations,
    events,
    health,
    isLoading,
    hasError,
    error,
    addIntegration,
    updateIntegration,
    removeIntegration,
    getIntegration,
    testIntegration,
    refreshIntegrations,
    refreshEvents,
    refreshHealth,
    clearOldEvents,
    integrationStats,
    healthSummary
  };
};

export default useEnterpriseIntegration;
