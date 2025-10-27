// @ts-nocheck
/**
 * Enterprise Integration Service
 * Comprehensive integration management and monitoring
 */

import { Integration, IntegrationEvent, IntegrationHealth } from '../types/enterprise';

// Extended interfaces for service-specific needs
interface ExtendedIntegration extends Integration {
  endpoint?: string;
  credentials?: {
    type: 'api_key' | 'oauth' | 'basic' | 'bearer' | 'custom';
    encrypted: boolean;
  };
  configuration?: Record<string, any>;
  health?: {
    status: 'healthy' | 'warning' | 'critical';
    last_check: Date;
    response_time: number;
    error_rate: number;
    uptime: number;
  };
  metrics?: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time: number;
    last_request: Date;
  };
  created_at?: Date;
  updated_at?: Date;
}

interface ExtendedIntegrationEvent extends IntegrationEvent {
  integration_id?: string;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  error_message?: string;
  retry_count?: number;
}

interface ExtendedIntegrationHealth extends IntegrationHealth {
  overall_status?: 'healthy' | 'warning' | 'critical';
  total_integrations?: number;
  active_integrations: number;
  failed_integrations: number;
  avg_response_time: number;
  error_rate: number;
  uptime: number;
  last_check: Date;
}

class EnterpriseIntegrationService {
  private integrations: ExtendedIntegration[] = [];
  private events: ExtendedIntegrationEvent[] = [];
  private listeners: Array<(event: ExtendedIntegrationEvent) => void> = [];
  private healthListeners: Array<(health: ExtendedIntegrationHealth) => void> = [];
  private readonly MAX_EVENTS = 10000;
  private readonly MAX_INTEGRATIONS = 1000;

  /**
   * Add integration
   */
  addIntegration(integration: Omit<ExtendedIntegration, 'id' | 'created_at' | 'updated_at'>): string {
    const newIntegration: ExtendedIntegration = {
      ...integration,
      id: this.generateIntegrationId(),
      created_at: new Date(),
      updated_at: new Date()
    };

    this.integrations.push(newIntegration);
    return newIntegration.id;
  }

  /**
   * Update integration
   */
  updateIntegration(id: string, updates: Partial<ExtendedIntegration>): boolean {
    const index = this.integrations.findIndex(i => i.id === id);
    if (index > -1) {
      this.integrations[index] = {
        ...this.integrations[index],
        ...updates,
        updated_at: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Remove integration
   */
  removeIntegration(id: string): boolean {
    const index = this.integrations.findIndex(i => i.id === id);
    if (index > -1) {
      this.integrations.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get integration
   */
  getIntegration(id: string): ExtendedIntegration | null {
    return this.integrations.find(i => i.id === id) || null;
  }

  /**
   * Get all integrations
   */
  getIntegrations(): ExtendedIntegration[] {
    return this.integrations;
  }

  /**
   * Get integrations by type
   */
  getIntegrationsByType(type: string): ExtendedIntegration[] {
    return this.integrations.filter(i => i.type === type);
  }

  /**
   * Get integrations by status
   */
  getIntegrationsByStatus(status: string): ExtendedIntegration[] {
    return this.integrations.filter(i => i.status === status);
  }

  /**
   * Test integration
   */
  async testIntegration(id: string): Promise<{
    success: boolean;
    response_time: number;
    error?: string;
    data?: any;
  }> {
    const integration = this.getIntegration(id);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const startTime = Date.now();
    
    try {
      const response = await fetch(integration.endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(integration)
        },
        signal: AbortSignal.timeout(10000)
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Log event
      this.logEvent({
        integration_id: id,
        type: 'response',
        status: 'success',
        timestamp: new Date(),
        duration: responseTime,
        response_data: data,
        retry_count: 0
      });

      // Update metrics
      this.updateIntegrationMetrics(id, true, responseTime);

      return {
        success: true,
        response_time: responseTime,
        data
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log event
      this.logEvent({
        integration_id: id,
        type: 'error',
        status: 'failure',
        timestamp: new Date(),
        duration: responseTime,
        error_message: errorMessage,
        retry_count: 0
      });

      // Update metrics
      this.updateIntegrationMetrics(id, false, responseTime);

      return {
        success: false,
        response_time: responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders(integration: ExtendedIntegration): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (integration.credentials?.type) {
      case 'api_key':
        headers['X-API-Key'] = '***';
        break;
      case 'bearer':
        headers['Authorization'] = 'Bearer ***';
        break;
      case 'basic':
        headers['Authorization'] = 'Basic ***';
        break;
      case 'oauth':
        headers['Authorization'] = 'OAuth ***';
        break;
    }

    return headers;
  }

  /**
   * Log integration event
   */
  logEvent(event: Omit<ExtendedIntegrationEvent, 'id' | 'timestamp'>): void {
    const integrationEvent: ExtendedIntegrationEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    this.events.unshift(integrationEvent);
    
    // Limit events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(integrationEvent));
  }

  /**
   * Update integration metrics
   */
  private updateIntegrationMetrics(id: string, success: boolean, responseTime: number): void {
    const integration = this.getIntegration(id);
    if (!integration) return;

    const metrics = integration.metrics;
    metrics.total_requests++;
    
    if (success) {
      metrics.successful_requests++;
    } else {
      metrics.failed_requests++;
    }

    // Update average response time
    metrics.avg_response_time = (metrics.avg_response_time + responseTime) / 2;
    metrics.last_request = new Date();

    // Update health
    integration.health.last_check = new Date();
    integration.health.response_time = responseTime;
    integration.health.error_rate = (metrics.failed_requests / metrics.total_requests) * 100;

    // Update status
    if (integration.health.error_rate > 10) {
      integration.status = 'error';
      integration.health.status = 'critical';
    } else if (integration.health.error_rate > 5) {
      integration.health.status = 'warning';
    } else {
      integration.health.status = 'healthy';
    }
  }

  /**
   * Get integration events
   */
  getEvents(integrationId?: string, limit: number = 100): ExtendedIntegrationEvent[] {
    let events = this.events;
    
    if (integrationId) {
      events = events.filter(e => e.integrationId === integrationId);
    }
    
    return events.slice(0, limit);
  }

  /**
   * Get integration health
   */
  getIntegrationHealth(): ExtendedIntegrationHealth {
    const total = this.integrations.length;
    const active = this.integrations.filter(i => i.status === 'active').length;
    const failed = this.integrations.filter(i => i.status === 'error').length;
    
    const avgResponseTime = this.integrations.reduce((sum, i) => sum + (i.health?.response_time || 0), 0) / total;
    const errorRate = this.integrations.reduce((sum, i) => sum + (i.health?.error_rate || 0), 0) / total;
    const uptime = this.integrations.reduce((sum, i) => sum + (i.health?.uptime || 0), 0) / total;

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (failed > total * 0.2) {
      overallStatus = 'critical';
    } else if (failed > total * 0.1) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      lastCheck: new Date().toISOString(),
      issues: failed > 0 ? [`${failed} integration(s) failed`] : [],
      overall_status: overallStatus,
      total_integrations: total,
      active_integrations: active,
      failed_integrations: failed,
      avg_response_time: avgResponseTime,
      error_rate: errorRate,
      uptime: uptime,
      last_check: new Date()
    };
  }

  /**
   * Get integration statistics
   */
  getIntegrationStats(): {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    by_health: Record<string, number>;
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    avg_response_time: number;
  } {
    const total = this.integrations.length;
    
    const byType = this.integrations.reduce((acc, i) => {
      acc[i.type] = (acc[i.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = this.integrations.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byHealth = this.integrations.reduce((acc, i) => {
      acc[i.health?.status || 'unknown'] = (acc[i.health?.status || 'unknown'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRequests = this.integrations.reduce((sum, i) => sum + (i.metrics?.total_requests || 0), 0);
    const successfulRequests = this.integrations.reduce((sum, i) => sum + (i.metrics?.successful_requests || 0), 0);
    const failedRequests = this.integrations.reduce((sum, i) => sum + (i.metrics?.failed_requests || 0), 0);
    const avgResponseTime = this.integrations.reduce((sum, i) => sum + (i.metrics?.avg_response_time || 0), 0) / total;

    return {
      total,
      by_type: byType,
      by_status: byStatus,
      by_health: byHealth,
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      avg_response_time: avgResponseTime
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ExtendedIntegrationEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: ExtendedIntegrationEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add health listener
   */
  addHealthListener(listener: (health: ExtendedIntegrationHealth) => void): void {
    this.healthListeners.push(listener);
  }

  /**
   * Remove health listener
   */
  removeHealthListener(listener: (health: ExtendedIntegrationHealth) => void): void {
    const index = this.healthListeners.indexOf(listener);
    if (index > -1) {
      this.healthListeners.splice(index, 1);
    }
  }

  /**
   * Generate integration ID
   */
  private generateIntegrationId(): string {
    return `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old events
   */
  clearOldEvents(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.events.length;
    
    this.events = this.events.filter(e => e.timestamp > cutoff);
    
    return initialLength - this.events.length;
  }

  /**
   * Get integration health summary
   */
  getHealthSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    total: number;
    active: number;
    failed: number;
    error_rate: number;
    avg_response_time: number;
  } {
    const health = this.getIntegrationHealth();
    
    return {
      status: health.overall_status,
      total: health.total_integrations,
      active: health.active_integrations,
      failed: health.failed_integrations,
      error_rate: health.error_rate,
      avg_response_time: health.avg_response_time
    };
  }
}

// Export singleton instance
export const enterpriseIntegrationService = new EnterpriseIntegrationService();

export default enterpriseIntegrationService;
