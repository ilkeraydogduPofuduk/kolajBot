/**
 * Enterprise Performance Service
 * Real-time performance monitoring and optimization
 */

interface PerformanceMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: {
    connections: number;
    max_connections: number;
    slow_queries: number;
    avg_query_time: number;
  };
  cache: {
    hit_rate: number;
    miss_rate: number;
    size: number;
  };
  uploads: {
    active: number;
    completed: number;
    failed: number;
    avg_time: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

class EnterprisePerformanceService {
  private metrics: PerformanceMetrics | null = null;
  private alerts: PerformanceAlert[] = [];
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];
  private alertListeners: Array<(alert: PerformanceAlert) => void> = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds
  private readonly ALERT_THRESHOLDS = {
    cpu: 80,
    memory: 85,
    disk: 90,
    network: 70,
    database_connections: 80,
    slow_queries: 10,
    avg_query_time: 1000,
    cache_hit_rate: 70,
    upload_failure_rate: 10
  };

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, this.UPDATE_INTERVAL);

    // Initial update
    this.updateMetrics();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update performance metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const response = await fetch(`${apiUrl}/api/performance/metrics`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const newMetrics: PerformanceMetrics = await response.json();
      this.metrics = newMetrics;
      
      // Check for alerts
      this.checkAlerts(newMetrics);
      
      // Notify listeners
      this.listeners.forEach(listener => listener(newMetrics));
    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    const alerts: PerformanceAlert[] = [];

    // CPU alert
    if (metrics.cpu > this.ALERT_THRESHOLDS.cpu) {
      alerts.push({
        id: 'cpu_high',
        type: metrics.cpu > 95 ? 'critical' : 'warning',
        message: `High CPU usage: ${metrics.cpu}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Memory alert
    if (metrics.memory > this.ALERT_THRESHOLDS.memory) {
      alerts.push({
        id: 'memory_high',
        type: metrics.memory > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${metrics.memory}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Disk alert
    if (metrics.disk > this.ALERT_THRESHOLDS.disk) {
      alerts.push({
        id: 'disk_high',
        type: 'critical',
        message: `High disk usage: ${metrics.disk}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Database connection alert
    if (metrics.database.connections > this.ALERT_THRESHOLDS.database_connections) {
      alerts.push({
        id: 'db_connections_high',
        type: 'warning',
        message: `High database connections: ${metrics.database.connections}/${metrics.database.max_connections}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Slow queries alert
    if (metrics.database.slow_queries > this.ALERT_THRESHOLDS.slow_queries) {
      alerts.push({
        id: 'slow_queries_high',
        type: 'warning',
        message: `High number of slow queries: ${metrics.database.slow_queries}`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Cache hit rate alert
    if (metrics.cache.hit_rate < this.ALERT_THRESHOLDS.cache_hit_rate) {
      alerts.push({
        id: 'cache_hit_rate_low',
        type: 'warning',
        message: `Low cache hit rate: ${metrics.cache.hit_rate}%`,
        timestamp: new Date(),
        resolved: false
      });
    }

    // Upload failure rate alert
    const totalUploads = metrics.uploads.completed + metrics.uploads.failed;
    const failureRate = totalUploads > 0 ? (metrics.uploads.failed / totalUploads) * 100 : 0;
    
    if (failureRate > this.ALERT_THRESHOLDS.upload_failure_rate) {
      alerts.push({
        id: 'upload_failure_rate_high',
        type: 'warning',
        message: `High upload failure rate: ${failureRate.toFixed(1)}%`,
        timestamp: new Date(),
        resolved: false
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
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Get alerts
   */
  getAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): PerformanceAlert[] {
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
   * Add metrics listener
   */
  addMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove metrics listener
   */
  removeMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: PerformanceAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    if (!this.metrics) return 0;

    const { cpu, memory, disk, database, cache } = this.metrics;
    
    // Calculate score based on various metrics
    const cpuScore = Math.max(0, 100 - cpu);
    const memoryScore = Math.max(0, 100 - memory);
    const diskScore = Math.max(0, 100 - disk);
    const dbScore = Math.max(0, 100 - (database.connections / database.max_connections) * 100);
    const cacheScore = cache.hit_rate;
    
    // Weighted average
    return Math.round(
      (cpuScore * 0.25) +
      (memoryScore * 0.25) +
      (diskScore * 0.15) +
      (dbScore * 0.15) +
      (cacheScore * 0.20)
    );
  }

  /**
   * Get performance status
   */
  getPerformanceStatus(): 'excellent' | 'good' | 'warning' | 'critical' {
    const score = this.getPerformanceScore();
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    if (!this.metrics) return [];

    const recommendations: string[] = [];

    if (this.metrics.cpu > 80) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }

    if (this.metrics.memory > 85) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }

    if (this.metrics.disk > 90) {
      recommendations.push('Consider cleaning up disk space or expanding storage');
    }

    if (this.metrics.database.slow_queries > 10) {
      recommendations.push('Review and optimize slow database queries');
    }

    if (this.metrics.cache.hit_rate < 70) {
      recommendations.push('Consider increasing cache size or improving cache strategy');
    }

    return recommendations;
  }
}

// Export singleton instance
export const enterprisePerformanceService = new EnterprisePerformanceService();

export default enterprisePerformanceService;
