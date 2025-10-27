// @ts-nocheck
/**
 * Enterprise Analytics Service
 * Advanced analytics and reporting with real-time insights
 */

import { AnalyticsEvent, AnalyticsMetric, AnalyticsReport, AnalyticsInsight } from '../types/enterprise';

// Extended interfaces for service-specific needs
interface ExtendedAnalyticsEvent extends AnalyticsEvent {
  label?: string;
  user_id?: string;
  session_id?: string;
  properties?: Record<string, any>;
}

interface ExtendedAnalyticsMetric extends AnalyticsMetric {
  tags?: Record<string, string>;
}

interface ExtendedAnalyticsReport extends AnalyticsReport {
  period?: string;
  start_date?: Date;
  end_date?: Date;
  top_events?: Array<{
    event: string;
    count: number;
    unique_count: number;
  }>;
  user_behavior?: {
    new_users: number;
    returning_users: number;
    user_retention: number;
    avg_pages_per_session: number;
  };
}

interface ExtendedAnalyticsInsight extends AnalyticsInsight {
  actionable: boolean;
  actions?: Array<{
    label: string;
    action: string;
    url?: string;
  }>;
}

class EnterpriseAnalyticsService {
  private events: ExtendedAnalyticsEvent[] = [];
  private metrics: ExtendedAnalyticsMetric[] = [];
  private insights: ExtendedAnalyticsInsight[] = [];
  private listeners: Array<(event: ExtendedAnalyticsEvent) => void> = [];
  private insightListeners: Array<(insight: ExtendedAnalyticsInsight) => void> = [];
  private readonly MAX_EVENTS = 10000;
  private readonly MAX_METRICS = 5000;
  private readonly MAX_INSIGHTS = 1000;

  /**
   * Track analytics event
   */
  trackEvent(event: Omit<ExtendedAnalyticsEvent, 'id' | 'timestamp'>): void {
    const analyticsEvent: ExtendedAnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    // Add to events
    this.events.unshift(analyticsEvent);
    
    // Limit events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Generate insights
    this.generateInsights(analyticsEvent);

    // Notify listeners
    this.listeners.forEach(listener => listener(analyticsEvent));
  }

  /**
   * Record analytics metric
   */
  recordMetric(metric: Omit<ExtendedAnalyticsMetric, 'id' | 'timestamp'>): void {
    const analyticsMetric: ExtendedAnalyticsMetric = {
      ...metric,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    // Add to metrics
    this.metrics.unshift(analyticsMetric);
    
    // Limit metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(0, this.MAX_METRICS);
    }
  }

  /**
   * Generate insights from events
   */
  private generateInsights(event: ExtendedAnalyticsEvent): void {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Page view insights
    if (event.type === 'page_view') {
      const recentPageViews = this.events.filter(e => 
        e.type === 'page_view' && 
        new Date(e.timestamp) > last24h
      );

      if (recentPageViews.length > 1000) {
        this.createInsight({
          type: 'trend',
          title: 'High Page View Volume',
          description: `Page views have increased significantly in the last 24 hours: ${recentPageViews.length} views`,
          severity: 'medium',
          confidence: 0.8,
          actionable: true,
          actions: [{
            label: 'View Details',
            action: 'view_analytics',
            url: '/analytics/page-views'
          }]
        });
      }
    }

    // Error insights
    if (event.type === 'error') {
      const recentErrors = this.events.filter(e => 
        e.type === 'error' && 
        new Date(e.timestamp) > last24h
      );

      if (recentErrors.length > 50) {
        this.createInsight({
          type: 'alert',
          title: 'High Error Rate',
          description: `Error rate has increased significantly: ${recentErrors.length} errors in 24 hours`,
          severity: 'high',
          confidence: 0.9,
          actionable: true,
          actions: [{
            label: 'View Error Logs',
            action: 'view_errors',
            url: '/analytics/errors'
          }]
        });
      }
    }

    // User behavior insights
    if (event.type === 'user_action') {
      const userActions = this.events.filter(e => 
        e.user_id === event.user_id && 
        new Date(e.timestamp) > last7d
      );

      if (userActions.length > 100) {
        this.createInsight({
          type: 'recommendation',
          title: 'Power User Detected',
          description: `User ${event.user_id} has shown high engagement: ${userActions.length} actions in 7 days`,
          severity: 'low',
          confidence: 0.7,
          actionable: true,
          actions: [{
            label: 'View User Profile',
            action: 'view_user',
            url: `/users/${event.user_id}`
          }]
        });
      }
    }
  }

  /**
   * Create analytics insight
   */
  private createInsight(insight: Omit<ExtendedAnalyticsInsight, 'id' | 'timestamp'>): void {
    const analyticsInsight: ExtendedAnalyticsInsight = {
      ...insight,
      id: this.generateInsightId(),
      timestamp: new Date().toISOString()
    };

    // Add to insights
    this.insights.unshift(analyticsInsight);
    
    // Limit insights
    if (this.insights.length > this.MAX_INSIGHTS) {
      this.insights = this.insights.slice(0, this.MAX_INSIGHTS);
    }

    // Notify listeners
    this.insightListeners.forEach(listener => listener(analyticsInsight));
  }

  /**
   * Get analytics events
   */
  getEvents(limit: number = 100): ExtendedAnalyticsEvent[] {
    return this.events.slice(0, limit);
  }

  /**
   * Get analytics metrics
   */
  getMetrics(limit: number = 100): ExtendedAnalyticsMetric[] {
    return this.metrics.slice(0, limit);
  }

  /**
   * Get analytics insights
   */
  getInsights(): ExtendedAnalyticsInsight[] {
    return this.insights.filter(insight => insight.severity !== 'low');
  }

  /**
   * Get all insights
   */
  getAllInsights(): ExtendedAnalyticsInsight[] {
    return this.insights;
  }

  /**
   * Generate analytics report
   */
  generateReport(period: string = '7d'): ExtendedAnalyticsReport {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const periodEvents = this.events.filter(e => new Date(e.timestamp) >= startDate);
    const uniqueUsers = new Set(periodEvents.map(e => e.user_id).filter(Boolean)).size;
    const sessions = new Set(periodEvents.map(e => e.session_id).filter(Boolean)).size;
    const pageViews = periodEvents.filter(e => e.type === 'page_view').length;
    const conversions = periodEvents.filter(e => e.type === 'conversion').length;
    
    // Calculate bounce rate (simplified)
    const singlePageSessions = periodEvents.filter(e => e.type === 'page_view').length;
    const bounceRate = sessions > 0 ? (singlePageSessions / sessions) * 100 : 0;
    
    // Calculate average session duration (simplified)
    const sessionDurations = this.calculateSessionDurations(periodEvents);
    const avgSessionDuration = sessionDurations.length > 0 
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
      : 0;

    // Top pages
    const pageViewsByPage = periodEvents
      .filter(e => e.type === 'page_view')
      .reduce((acc, event) => {
        const page = event.properties?.page || 'unknown';
        if (!acc[page]) {
          acc[page] = { views: 0, unique_views: 0, bounces: 0 };
        }
        acc[page].views++;
        if (event.user_id) {
          acc[page].unique_views++;
        }
        return acc;
      }, {} as Record<string, { views: number; unique_views: number; bounces: number }>);

    const topPages = Object.entries(pageViewsByPage)
      .map(([page, data]) => ({
        page,
        views: data.views,
        unique_views: data.unique_views,
        bounce_rate: data.views > 0 ? (data.bounces / data.views) * 100 : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top events
    const eventsByType = periodEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEvents = Object.entries(eventsByType)
      .map(([event, count]) => ({
        event,
        count,
        unique_count: count // Simplified
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // User behavior
    const newUsers = periodEvents.filter(e => e.type === 'first_visit').length;
    const returningUsers = uniqueUsers - newUsers;
    const userRetention = uniqueUsers > 0 ? (returningUsers / uniqueUsers) * 100 : 0;
    const avgPagesPerSession = sessions > 0 ? pageViews / sessions : 0;

    // Performance metrics
    const performanceMetrics = this.metrics.filter(m => 
      m.category === 'performance' && new Date(m.timestamp) >= startDate
    );
    
    const avgLoadTime = performanceMetrics.length > 0
      ? performanceMetrics.reduce((sum, m) => sum + m.value, 0) / performanceMetrics.length
      : 0;

    const slowPages = performanceMetrics
      .filter(m => m.value > 3000) // > 3 seconds
      .reduce((acc, metric) => {
        const page = metric.tags?.page || 'unknown';
        if (!acc[page]) {
          acc[page] = { load_time: 0, occurrences: 0 };
        }
        acc[page].load_time += metric.value;
        acc[page].occurrences++;
        return acc;
      }, {} as Record<string, { load_time: number; occurrences: number }>);

    const slowPagesList = Object.entries(slowPages)
      .map(([page, data]) => ({
        page,
        load_time: data.load_time / data.occurrences,
        occurrences: data.occurrences
      }))
      .sort((a, b) => b.load_time - a.load_time)
      .slice(0, 10);

    const errorEvents = periodEvents.filter(e => e.type === 'error');
    const errorRate = periodEvents.length > 0 ? (errorEvents.length / periodEvents.length) * 100 : 0;

    const errorPages = errorEvents.reduce((acc, event) => {
      const page = event.properties?.page || 'unknown';
      acc[page] = (acc[page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorPagesList = Object.entries(errorPages)
      .map(([page, errors]) => ({
        page,
        errors,
        error_rate: pageViewsByPage[page] ? (errors / pageViewsByPage[page].views) * 100 : 0
      }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10);

    return {
      id: this.generateEventId(),
      name: `Analytics Report - ${period}`,
      type: 'analytics',
      data: {
        period,
        start_date: startDate,
        end_date: now,
        metrics: {
          total_events: periodEvents.length,
          unique_users: uniqueUsers,
          sessions,
          page_views: pageViews,
          conversions,
          bounce_rate: bounceRate,
          avg_session_duration: avgSessionDuration
        },
        top_pages: topPages,
        top_events: topEvents,
        user_behavior: {
          new_users: newUsers,
          returning_users: returningUsers,
          user_retention: userRetention,
          avg_pages_per_session: avgPagesPerSession
        },
        performance: {
          avg_load_time: avgLoadTime,
          slow_pages: slowPagesList,
          error_rate: errorRate,
          error_pages: errorPagesList
        }
      },
      created_at: new Date().toISOString(),
      metrics: {
        total_events: periodEvents.length,
        unique_users: uniqueUsers,
        sessions,
        page_views: pageViews,
        conversions,
        bounce_rate: bounceRate,
        avg_session_duration: avgSessionDuration
      },
      top_pages: topPages,
      performance: {
        avg_load_time: avgLoadTime,
        slow_pages: slowPagesList,
        error_rate: errorRate,
        error_pages: errorPagesList
      }
    };
  }

  /**
   * Calculate session durations
   */
  private calculateSessionDurations(events: ExtendedAnalyticsEvent[]): number[] {
    const sessions = new Map<string, { start: Date; end: Date }>();
    
    events.forEach(event => {
      if (event.session_id) {
        if (!sessions.has(event.session_id)) {
          const eventTime = new Date(event.timestamp);
          sessions.set(event.session_id, { start: eventTime, end: eventTime });
        } else {
          const session = sessions.get(event.session_id)!;
          const eventTime = new Date(event.timestamp);
          if (eventTime < session.start) {
            session.start = eventTime;
          }
          if (eventTime > session.end) {
            session.end = eventTime;
          }
        }
      }
    });
    
    return Array.from(sessions.values()).map(session => 
      session.end.getTime() - session.start.getTime()
    );
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ExtendedAnalyticsEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: ExtendedAnalyticsEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Add insight listener
   */
  addInsightListener(listener: (insight: ExtendedAnalyticsInsight) => void): void {
    this.insightListeners.push(listener);
  }

  /**
   * Remove insight listener
   */
  removeInsightListener(listener: (insight: ExtendedAnalyticsInsight) => void): void {
    const index = this.insightListeners.indexOf(listener);
    if (index > -1) {
      this.insightListeners.splice(index, 1);
    }
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate insight ID
   */
  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get analytics health
   */
  getAnalyticsHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check event volume
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => new Date(e.timestamp) > last24h);
    
    if (recentEvents.length < 10) {
      issues.push('Low event volume');
      recommendations.push('Check if analytics tracking is working properly');
    }

    // Check error rate
    const errorEvents = recentEvents.filter(e => e.type === 'error');
    const errorRate = recentEvents.length > 0 ? (errorEvents.length / recentEvents.length) * 100 : 0;
    
    if (errorRate > 10) {
      issues.push('High error rate');
      recommendations.push('Investigate and fix errors');
    }

    // Check insights
    const recentInsights = this.insights.filter(i => new Date(i.timestamp) > last24h);
    if (recentInsights.length === 0) {
      issues.push('No recent insights');
      recommendations.push('Review analytics configuration');
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
export const enterpriseAnalyticsService = new EnterpriseAnalyticsService();

export default enterpriseAnalyticsService;
