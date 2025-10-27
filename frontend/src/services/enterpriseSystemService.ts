/**
 * Enterprise System Service
 * Comprehensive system management and monitoring
 */

interface SystemInfo {
  version: string;
  build: string;
  environment: 'development' | 'staging' | 'production';
  uptime: number;
  start_time: Date;
  last_restart: Date;
  node_version: string;
  platform: string;
  arch: string;
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  network: {
    interfaces: Array<{
      name: string;
      address: string;
      family: string;
    }>;
    connections: number;
  };
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    details?: any;
  }>;
  recommendations: string[];
  last_check: Date;
}

interface SystemMetrics {
  timestamp: Date;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: {
    bytes_sent: number;
    bytes_received: number;
  };
  active_connections: number;
  response_time: number;
  error_rate: number;
  throughput: number;
}

interface SystemAlert {
  id: string;
  type: 'performance' | 'security' | 'availability' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  details?: Record<string, any>;
}

class EnterpriseSystemService {
  private metrics: SystemMetrics[] = [];
  private alerts: SystemAlert[] = [];
  private listeners: Array<(metrics: SystemMetrics) => void> = [];
  private alertListeners: Array<(alert: SystemAlert) => void> = [];
  private readonly MAX_METRICS = 1000;
  private readonly MAX_ALERTS = 100;
  private readonly THRESHOLDS = {
    cpu: 80,
    memory: 85,
    disk: 90,
    response_time: 1000,
    error_rate: 5,
    connections: 1000
  };

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const response = await fetch(`${apiUrl}/api/system/info`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const response = await fetch(`${apiUrl}/api/system/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get system health:', error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics[]> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const response = await fetch(`${apiUrl}/api/system/metrics`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const metrics = await response.json();
      
      // Store metrics
      this.metrics = metrics.slice(0, this.MAX_METRICS);
      
      // Check for alerts
      this.checkAlerts(metrics[0]);
      
      return metrics;
    } catch (error) {
      console.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  /**
   * Check for system alerts
   */
  private checkAlerts(metrics: SystemMetrics): void {
    const alerts: SystemAlert[] = [];

    // CPU alert
    if (metrics.cpu_usage > this.THRESHOLDS.cpu) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: metrics.cpu_usage > 95 ? 'critical' : 'high',
        title: 'High CPU Usage',
        message: `CPU usage is at ${metrics.cpu_usage}%`,
        timestamp: new Date(),
        resolved: false,
        details: { cpu_usage: metrics.cpu_usage }
      });
    }

    // Memory alert
    if (metrics.memory_usage > this.THRESHOLDS.memory) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: metrics.memory_usage > 95 ? 'critical' : 'high',
        title: 'High Memory Usage',
        message: `Memory usage is at ${metrics.memory_usage}%`,
        timestamp: new Date(),
        resolved: false,
        details: { memory_usage: metrics.memory_usage }
      });
    }

    // Disk alert
    if (metrics.disk_usage > this.THRESHOLDS.disk) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'capacity',
        severity: 'critical',
        title: 'High Disk Usage',
        message: `Disk usage is at ${metrics.disk_usage}%`,
        timestamp: new Date(),
        resolved: false,
        details: { disk_usage: metrics.disk_usage }
      });
    }

    // Response time alert
    if (metrics.response_time > this.THRESHOLDS.response_time) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'performance',
        severity: 'medium',
        title: 'Slow Response Time',
        message: `Average response time is ${metrics.response_time}ms`,
        timestamp: new Date(),
        resolved: false,
        details: { response_time: metrics.response_time }
      });
    }

    // Error rate alert
    if (metrics.error_rate > this.THRESHOLDS.error_rate) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'availability',
        severity: 'high',
        title: 'High Error Rate',
        message: `Error rate is at ${metrics.error_rate}%`,
        timestamp: new Date(),
        resolved: false,
        details: { error_rate: metrics.error_rate }
      });
    }

    // Connection alert
    if (metrics.active_connections > this.THRESHOLDS.connections) {
      alerts.push({
        id: this.generateAlertId(),
        type: 'capacity',
        severity: 'medium',
        title: 'High Connection Count',
        message: `${metrics.active_connections} active connections`,
        timestamp: new Date(),
        resolved: false,
        details: { active_connections: metrics.active_connections }
      });
    }

    // Add new alerts
    alerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => a.id === alert.id && !a.resolved);
      if (!existingAlert) {
        this.alerts.push(alert);
        this.alertListeners.forEach(listener => listener(alert));
      }
    });
  }

  /**
   * Get system alerts
   */
  getAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): SystemAlert[] {
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
   * Get system performance score
   */
  getPerformanceScore(): number {
    if (this.metrics.length === 0) return 0;

    const latest = this.metrics[0];
    const cpuScore = Math.max(0, 100 - latest.cpu_usage);
    const memoryScore = Math.max(0, 100 - latest.memory_usage);
    const diskScore = Math.max(0, 100 - latest.disk_usage);
    const responseScore = Math.max(0, 100 - (latest.response_time / 10));
    const errorScore = Math.max(0, 100 - (latest.error_rate * 10));

    return Math.round(
      (cpuScore * 0.25) +
      (memoryScore * 0.25) +
      (diskScore * 0.20) +
      (responseScore * 0.15) +
      (errorScore * 0.15)
    );
  }

  /**
   * Get system status
   */
  getSystemStatus(): 'healthy' | 'warning' | 'critical' {
    const score = this.getPerformanceScore();
    
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Get system recommendations
   */
  getSystemRecommendations(): string[] {
    if (this.metrics.length === 0) return [];

    const latest = this.metrics[0];
    const recommendations: string[] = [];

    if (latest.cpu_usage > 80) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }

    if (latest.memory_usage > 85) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }

    if (latest.disk_usage > 90) {
      recommendations.push('Consider cleaning up disk space or expanding storage');
    }

    if (latest.response_time > 1000) {
      recommendations.push('Investigate and optimize slow response times');
    }

    if (latest.error_rate > 5) {
      recommendations.push('Review and fix error-causing issues');
    }

    if (latest.active_connections > 1000) {
      recommendations.push('Consider load balancing or connection pooling');
    }

    return recommendations;
  }

  /**
   * Add metrics listener
   */
  addMetricsListener(listener: (metrics: SystemMetrics) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove metrics listener
   */
  removeMetricsListener(listener: (metrics: SystemMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: SystemAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: SystemAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get system health summary
   */
  getSystemHealthSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    alerts: number;
    recommendations: number;
    uptime: string;
  } {
    const status = this.getSystemStatus();
    const score = this.getPerformanceScore();
    const alerts = this.getAlerts().length;
    const recommendations = this.getSystemRecommendations().length;
    
    // Calculate uptime (simplified)
    const uptime = this.metrics.length > 0 
      ? this.calculateUptime(this.metrics[0].timestamp)
      : 'Unknown';

    return {
      status,
      score,
      alerts,
      recommendations,
      uptime
    };
  }

  /**
   * Calculate uptime
   */
  private calculateUptime(lastUpdate: Date): string {
    const now = new Date();
    const diff = now.getTime() - lastUpdate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Get system trends
   */
  getSystemTrends(): {
    cpu_trend: 'up' | 'down' | 'stable';
    memory_trend: 'up' | 'down' | 'stable';
    disk_trend: 'up' | 'down' | 'stable';
    response_trend: 'up' | 'down' | 'stable';
  } {
    if (this.metrics.length < 2) {
      return {
        cpu_trend: 'stable',
        memory_trend: 'stable',
        disk_trend: 'stable',
        response_trend: 'stable'
      };
    }

    const latest = this.metrics[0];
    const previous = this.metrics[1];

    const getTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
      const diff = current - previous;
      if (Math.abs(diff) < 1) return 'stable';
      return diff > 0 ? 'up' : 'down';
    };

    return {
      cpu_trend: getTrend(latest.cpu_usage, previous.cpu_usage),
      memory_trend: getTrend(latest.memory_usage, previous.memory_usage),
      disk_trend: getTrend(latest.disk_usage, previous.disk_usage),
      response_trend: getTrend(latest.response_time, previous.response_time)
    };
  }
}

// Export singleton instance
export const enterpriseSystemService = new EnterpriseSystemService();

export default enterpriseSystemService;
