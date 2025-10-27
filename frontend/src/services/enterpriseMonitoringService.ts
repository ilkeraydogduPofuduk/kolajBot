/**
 * Enterprise Monitoring Service
 * Comprehensive system monitoring with real-time alerts and metrics
 */

interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'system' | 'application' | 'business' | 'security';
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

interface MonitoringAlert {
  id: string;
  metric_id: string;
  type: 'threshold' | 'anomaly' | 'trend' | 'availability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: Date;
  resolved_at?: Date;
  acknowledged_by?: string;
  resolved_by?: string;
  threshold?: {
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    value: number;
  };
  conditions: Record<string, any>;
  affected_services: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: MonitoringWidget[];
  layout: {
    columns: number;
    rows: number;
  };
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_public: boolean;
  tags: string[];
}

interface MonitoringWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refresh_interval: number;
  data_source: string;
}

interface MonitoringService {
  id: string;
  name: string;
  type: 'api' | 'database' | 'cache' | 'queue' | 'storage' | 'external';
  status: 'healthy' | 'degraded' | 'down' | 'maintenance';
  endpoint?: string;
  health_check: {
    url: string;
    method: 'GET' | 'POST';
    timeout: number;
    expected_status: number;
    expected_response?: string;
  };
  metrics: string[];
  alerts: string[];
  last_check: Date;
  uptime: number;
  response_time: number;
  error_rate: number;
}

class EnterpriseMonitoringService {
  private metrics: MonitoringMetric[] = [];
  private alerts: MonitoringAlert[] = [];
  private dashboards: MonitoringDashboard[] = [];
  private services: MonitoringService[] = [];
  private listeners: Array<(metric: MonitoringMetric) => void> = [];
  private alertListeners: Array<(alert: MonitoringAlert) => void> = [];
  private serviceListeners: Array<(service: MonitoringService) => void> = [];
  private readonly MAX_METRICS = 100000;
  private readonly MAX_ALERTS = 10000;
  private readonly MAX_DASHBOARDS = 1000;
  private readonly MAX_SERVICES = 1000;

  /**
   * Record metric
   */
  recordMetric(metric: Omit<MonitoringMetric, 'id' | 'timestamp'>): void {
    const monitoringMetric: MonitoringMetric = {
      ...metric,
      id: this.generateMetricId(),
      timestamp: new Date()
    };

    // Add to metrics
    this.metrics.unshift(monitoringMetric);
    
    // Limit metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(0, this.MAX_METRICS);
    }

    // Check for alerts
    this.checkAlerts(monitoringMetric);

    // Notify listeners
    this.listeners.forEach(listener => listener(monitoringMetric));
  }

  /**
   * Check for alerts
   */
  private checkAlerts(metric: MonitoringMetric): void {
    // Find relevant alerts for this metric
    const relevantAlerts = this.alerts.filter(alert => 
      alert.metric_id === metric.id && 
      alert.status === 'active'
    );

    relevantAlerts.forEach(alert => {
      if (alert.type === 'threshold' && alert.threshold) {
        const { operator, value } = alert.threshold;
        let triggered = false;

        switch (operator) {
          case '>':
            triggered = metric.value > value;
            break;
          case '<':
            triggered = metric.value < value;
            break;
          case '>=':
            triggered = metric.value >= value;
            break;
          case '<=':
            triggered = metric.value <= value;
            break;
          case '=':
            triggered = metric.value === value;
            break;
          case '!=':
            triggered = metric.value !== value;
            break;
        }

        if (triggered) {
          this.createAlert({
            metric_id: metric.id,
            type: 'threshold',
            severity: alert.severity,
            title: alert.title,
            message: `${metric.name} ${operator} ${value} (current: ${metric.value})`,
            status: 'active',
            timestamp: new Date(),
            threshold: alert.threshold,
            conditions: alert.conditions,
            affected_services: alert.affected_services,
            impact: alert.impact
          });
        }
      }
    });
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<MonitoringAlert, 'id'>): void {
    const monitoringAlert: MonitoringAlert = {
      ...alert,
      id: this.generateAlertId()
    };

    // Add to alerts
    this.alerts.unshift(monitoringAlert);
    
    // Limit alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // Notify listeners
    this.alertListeners.forEach(listener => listener(monitoringAlert));
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledged_by = acknowledgedBy;
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && (alert.status === 'active' || alert.status === 'acknowledged')) {
      alert.status = 'resolved';
      alert.resolved_at = new Date();
      alert.resolved_by = resolvedBy;
      return true;
    }
    return false;
  }

  /**
   * Get metrics
   */
  getMetrics(filter?: {
    category?: MonitoringMetric['category'];
    name?: string;
    tags?: Record<string, string>;
    date_range?: { start: Date; end: Date };
  }, limit: number = 1000): MonitoringMetric[] {
    let filteredMetrics = this.metrics;

    if (filter) {
      if (filter.category) {
        filteredMetrics = filteredMetrics.filter(m => m.category === filter.category);
      }
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === filter.name);
      }
      if (filter.tags) {
        filteredMetrics = filteredMetrics.filter(m => 
          Object.entries(filter.tags!).every(([key, value]) => m.tags[key] === value)
        );
      }
      if (filter.date_range) {
        filteredMetrics = filteredMetrics.filter(m => 
          m.timestamp >= filter.date_range!.start && 
          m.timestamp <= filter.date_range!.end
        );
      }
    }

    return filteredMetrics.slice(0, limit);
  }

  /**
   * Get alerts
   */
  getAlerts(status?: MonitoringAlert['status'], limit: number = 100): MonitoringAlert[] {
    let filteredAlerts = this.alerts;
    
    if (status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === status);
    }
    
    return filteredAlerts.slice(0, limit);
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): MonitoringAlert | null {
    return this.alerts.find(a => a.id === id) || null;
  }

  /**
   * Add service
   */
  addService(service: Omit<MonitoringService, 'id' | 'last_check' | 'uptime' | 'response_time' | 'error_rate'>): string {
    const monitoringService: MonitoringService = {
      ...service,
      id: this.generateServiceId(),
      last_check: new Date(),
      uptime: 100,
      response_time: 0,
      error_rate: 0
    };

    this.services.push(monitoringService);
    return monitoringService.id;
  }

  /**
   * Update service status
   */
  updateServiceStatus(id: string, status: MonitoringService['status'], responseTime: number = 0, error: boolean = false): boolean {
    const service = this.services.find(s => s.id === id);
    if (service) {
      service.status = status;
      service.last_check = new Date();
      service.response_time = responseTime;
      
      if (error) {
        service.error_rate = Math.min(100, service.error_rate + 1);
      } else {
        service.error_rate = Math.max(0, service.error_rate - 0.1);
      }

      // Update uptime
      if (status === 'healthy') {
        service.uptime = Math.min(100, service.uptime + 0.1);
      } else {
        service.uptime = Math.max(0, service.uptime - 1);
      }

      // Notify listeners
      this.serviceListeners.forEach(listener => listener(service));

      return true;
    }
    return false;
  }

  /**
   * Get services
   */
  getServices(): MonitoringService[] {
    return this.services;
  }

  /**
   * Get service by ID
   */
  getService(id: string): MonitoringService | null {
    return this.services.find(s => s.id === id) || null;
  }

  /**
   * Create dashboard
   */
  createDashboard(dashboard: Omit<MonitoringDashboard, 'id' | 'created_at' | 'updated_at'>): string {
    const monitoringDashboard: MonitoringDashboard = {
      ...dashboard,
      id: this.generateDashboardId(),
      created_at: new Date(),
      updated_at: new Date()
    };

    this.dashboards.push(monitoringDashboard);
    return monitoringDashboard.id;
  }

  /**
   * Update dashboard
   */
  updateDashboard(id: string, updates: Partial<MonitoringDashboard>): boolean {
    const index = this.dashboards.findIndex(d => d.id === id);
    if (index > -1) {
      this.dashboards[index] = {
        ...this.dashboards[index],
        ...updates,
        updated_at: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Get dashboards
   */
  getDashboards(): MonitoringDashboard[] {
    return this.dashboards;
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(id: string): MonitoringDashboard | null {
    return this.dashboards.find(d => d.id === id) || null;
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    total_metrics: number;
    total_alerts: number;
    active_alerts: number;
    total_services: number;
    healthy_services: number;
    total_dashboards: number;
    avg_response_time: number;
    system_uptime: number;
  } {
    const totalMetrics = this.metrics.length;
    const totalAlerts = this.alerts.length;
    const activeAlerts = this.alerts.filter(a => a.status === 'active').length;
    const totalServices = this.services.length;
    const healthyServices = this.services.filter(s => s.status === 'healthy').length;
    const totalDashboards = this.dashboards.length;
    
    const avgResponseTime = this.services.length > 0 
      ? this.services.reduce((sum, s) => sum + s.response_time, 0) / this.services.length 
      : 0;
    
    const systemUptime = this.services.length > 0 
      ? this.services.reduce((sum, s) => sum + s.uptime, 0) / this.services.length 
      : 100;

    return {
      total_metrics: totalMetrics,
      total_alerts: totalAlerts,
      active_alerts: activeAlerts,
      total_services: totalServices,
      healthy_services: healthyServices,
      total_dashboards: totalDashboards,
      avg_response_time: avgResponseTime,
      system_uptime: systemUptime
    };
  }

  /**
   * Add metric listener
   */
  addMetricListener(listener: (metric: MonitoringMetric) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove metric listener
   */
  removeMetricListener(listener: (metric: MonitoringMetric) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: MonitoringAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: MonitoringAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Add service listener
   */
  addServiceListener(listener: (service: MonitoringService) => void): void {
    this.serviceListeners.push(listener);
  }

  /**
   * Remove service listener
   */
  removeServiceListener(listener: (service: MonitoringService) => void): void {
    const index = this.serviceListeners.indexOf(listener);
    if (index > -1) {
      this.serviceListeners.splice(index, 1);
    }
  }

  /**
   * Generate metric ID
   */
  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate service ID
   */
  private generateServiceId(): string {
    return `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate dashboard ID
   */
  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanDays: number = 30): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    return initialLength - this.metrics.length;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): number {
    const initialLength = this.alerts.length;
    
    this.alerts = this.alerts.filter(a => a.status !== 'resolved');
    
    return initialLength - this.alerts.length;
  }

  /**
   * Get monitoring health
   */
  getMonitoringHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const stats = this.getMonitoringStats();
    
    // Check active alerts
    if (stats.active_alerts > 10) {
      issues.push('High number of active alerts');
      recommendations.push('Review and resolve alerts');
    }

    // Check service health
    if (stats.healthy_services < stats.total_services * 0.8) {
      issues.push('Low service health');
      recommendations.push('Investigate failing services');
    }

    // Check system uptime
    if (stats.system_uptime < 95) {
      issues.push('Low system uptime');
      recommendations.push('Improve service reliability');
    }

    // Check response time
    if (stats.avg_response_time > 1000) {
      issues.push('High response time');
      recommendations.push('Optimize service performance');
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
export const enterpriseMonitoringService = new EnterpriseMonitoringService();

export default enterpriseMonitoringService;
