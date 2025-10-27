/**
 * Enterprise Security Service
 * Advanced security monitoring and threat detection
 */

interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'upload' | 'download' | 'api_call' | 'suspicious' | 'blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
}

interface SecurityMetrics {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  blocked_attempts: number;
  suspicious_activities: number;
  last_24h_events: number;
  top_threats: Array<{
    type: string;
    count: number;
    last_seen: Date;
  }>;
}

interface SecurityAlert {
  id: string;
  type: 'brute_force' | 'suspicious_upload' | 'api_abuse' | 'unusual_access' | 'data_breach';
  severity: 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  details: Record<string, any>;
}

class EnterpriseSecurityService {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private listeners: Array<(event: SecurityEvent) => void> = [];
  private alertListeners: Array<(alert: SecurityAlert) => void> = [];
  private readonly MAX_EVENTS = 1000;
  private readonly MAX_ALERTS = 100;
  private readonly THREAT_THRESHOLDS = {
    brute_force_attempts: 5,
    suspicious_uploads: 3,
    api_calls_per_minute: 100,
    unusual_access_patterns: 3,
    failed_logins: 10
  };

  /**
   * Log security event
   */
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Add to events
    this.events.unshift(securityEvent);
    
    // Limit events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Check for threats
    this.checkThreats(securityEvent);

    // Notify listeners
    this.listeners.forEach(listener => listener(securityEvent));
  }

  /**
   * Check for security threats
   */
  private checkThreats(event: SecurityEvent): void {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last5min = new Date(now.getTime() - 5 * 60 * 1000);

    // Brute force detection
    if (event.type === 'login' && event.severity === 'high') {
      const recentFailedLogins = this.events.filter(e => 
        e.type === 'login' && 
        e.severity === 'high' && 
        e.timestamp > last5min &&
        e.ip_address === event.ip_address
      );

      if (recentFailedLogins.length >= this.THREAT_THRESHOLDS.brute_force_attempts) {
        this.createAlert({
          type: 'brute_force',
          severity: 'high',
          message: `Brute force attack detected from IP: ${event.ip_address}`,
          details: {
            ip_address: event.ip_address,
            attempts: recentFailedLogins.length,
            time_window: '5 minutes'
          }
        });
      }
    }

    // Suspicious upload detection
    if (event.type === 'upload') {
      const recentUploads = this.events.filter(e => 
        e.type === 'upload' && 
        e.timestamp > last5min &&
        e.user_id === event.user_id
      );

      if (recentUploads.length >= this.THREAT_THRESHOLDS.suspicious_uploads) {
        this.createAlert({
          type: 'suspicious_upload',
          severity: 'medium',
          message: `Suspicious upload activity detected for user: ${event.user_id}`,
          details: {
            user_id: event.user_id,
            uploads: recentUploads.length,
            time_window: '5 minutes'
          }
        });
      }
    }

    // API abuse detection
    if (event.type === 'api_call') {
      const recentApiCalls = this.events.filter(e => 
        e.type === 'api_call' && 
        e.timestamp > last5min &&
        e.ip_address === event.ip_address
      );

      if (recentApiCalls.length >= this.THREAT_THRESHOLDS.api_calls_per_minute) {
        this.createAlert({
          type: 'api_abuse',
          severity: 'medium',
          message: `API abuse detected from IP: ${event.ip_address}`,
          details: {
            ip_address: event.ip_address,
            api_calls: recentApiCalls.length,
            time_window: '5 minutes'
          }
        });
      }
    }

    // Unusual access pattern detection
    if (event.type === 'login' && event.severity === 'low') {
      const userLogins = this.events.filter(e => 
        e.type === 'login' && 
        e.user_id === event.user_id &&
        e.timestamp > last24h
      );

      if (userLogins.length >= this.THREAT_THRESHOLDS.unusual_access_patterns) {
        this.createAlert({
          type: 'unusual_access',
          severity: 'medium',
          message: `Unusual access pattern detected for user: ${event.user_id}`,
          details: {
            user_id: event.user_id,
            logins: userLogins.length,
            time_window: '24 hours'
          }
        });
      }
    }
  }

  /**
   * Create security alert
   */
  private createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const securityAlert: SecurityAlert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false
    };

    // Add to alerts
    this.alerts.unshift(securityAlert);
    
    // Limit alerts
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }

    // Notify listeners
    this.alertListeners.forEach(listener => listener(securityAlert));
  }

  /**
   * Get security events
   */
  getEvents(limit: number = 50): SecurityEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Get security alerts
   */
  getAlerts(): SecurityAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts (including resolved)
   */
  getAllAlerts(): SecurityAlert[] {
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
   * Get security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = this.events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const last24hEvents = this.events.filter(e => e.timestamp > last24h).length;
    const blockedAttempts = this.events.filter(e => e.type === 'blocked').length;
    const suspiciousActivities = this.events.filter(e => e.type === 'suspicious').length;

    const topThreats = Object.entries(eventsByType)
      .filter(([type]) => ['blocked', 'suspicious', 'api_call'].includes(type))
      .map(([type, count]) => ({
        type,
        count,
        last_seen: this.events.find(e => e.type === type)?.timestamp || new Date()
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_events: this.events.length,
      events_by_type: eventsByType,
      events_by_severity: eventsBySeverity,
      blocked_attempts: blockedAttempts,
      suspicious_activities: suspiciousActivities,
      last_24h_events: last24hEvents,
      top_threats: topThreats
    };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: SecurityEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: SecurityEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: SecurityAlert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: SecurityAlert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get security score (0-100)
   */
  getSecurityScore(): number {
    const metrics = this.getSecurityMetrics();
    const totalEvents = metrics.total_events;
    const blockedAttempts = metrics.blocked_attempts;
    const suspiciousActivities = metrics.suspicious_activities;
    const last24hEvents = metrics.last_24h_events;

    if (totalEvents === 0) return 100;

    // Calculate score based on threat levels
    const threatScore = Math.max(0, 100 - (blockedAttempts * 10) - (suspiciousActivities * 5));
    const activityScore = Math.max(0, 100 - (last24hEvents / 10));
    
    return Math.round((threatScore + activityScore) / 2);
  }

  /**
   * Get security status
   */
  getSecurityStatus(): 'secure' | 'warning' | 'critical' {
    const score = this.getSecurityScore();
    
    if (score >= 80) return 'secure';
    if (score >= 50) return 'warning';
    return 'critical';
  }
}

// Export singleton instance
export const enterpriseSecurityService = new EnterpriseSecurityService();

export default enterpriseSecurityService;
