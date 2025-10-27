/**
 * Enterprise Notification Service
 * Advanced notification system with real-time updates and persistence
 */

import { toast } from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  metadata?: Record<string, any>;
}

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  email: boolean;
  sms: boolean;
  categories: {
    system: boolean;
    security: boolean;
    performance: boolean;
    user: boolean;
    business: boolean;
  };
}

interface NotificationStats {
  total: number;
  by_type: Record<string, number>;
  by_category: Record<string, number>;
  success_rate: number;
  read_rate: number;
  response_rate: number;
}

class EnterpriseNotificationService {
  private notifications: Notification[] = [];
  private settings: NotificationSettings = {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    sms: false,
    categories: {
      system: true,
      security: true,
      performance: true,
      user: true,
      business: true
    }
  };
  private listeners: Array<(notification: Notification) => void> = [];
  private readonly MAX_NOTIFICATIONS = 1000;
  private readonly DEFAULT_DURATION = 5000;

  /**
   * Show notification
   */
  show(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    if (!this.settings.enabled) return '';

    const fullNotification: Notification = {
      ...notification,
      id: this.generateNotificationId(),
      timestamp: new Date()
    };

    // Add to notifications
    this.notifications.unshift(fullNotification);
    
    // Limit notifications
    if (this.notifications.length > this.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, this.MAX_NOTIFICATIONS);
    }

    // Show toast
    this.showToast(fullNotification);

    // Notify listeners
    this.listeners.forEach(listener => listener(fullNotification));

    return fullNotification.id;
  }

  /**
   * Show success notification
   */
  success(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'success',
      title,
      message,
      ...options
    });
  }

  /**
   * Show error notification
   */
  error(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 8000,
      ...options
    });
  }

  /**
   * Show warning notification
   */
  warning(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'warning',
      title,
      message,
      ...options
    });
  }

  /**
   * Show info notification
   */
  info(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'info',
      title,
      message,
      ...options
    });
  }

  /**
   * Show loading notification
   */
  loading(title: string, message: string, options?: Partial<Notification>): string {
    return this.show({
      type: 'loading',
      title,
      message,
      persistent: true,
      ...options
    });
  }

  /**
   * Show toast notification
   */
  private showToast(notification: Notification): void {
    const toastOptions = {
      duration: notification.duration || this.DEFAULT_DURATION,
      position: 'top-right' as const,
      style: {
        background: this.getToastBackground(notification.type),
        color: this.getToastColor(notification.type),
        border: `1px solid ${this.getToastBorder(notification.type)}`,
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }
    };

    switch (notification.type) {
      case 'success':
        toast.success(`${notification.title}: ${notification.message}`, toastOptions);
        break;
      case 'error':
        toast.error(`${notification.title}: ${notification.message}`, toastOptions);
        break;
      case 'warning':
        toast(`${notification.title}: ${notification.message}`, {
          ...toastOptions,
          icon: '⚠️'
        });
        break;
      case 'info':
        toast(`${notification.title}: ${notification.message}`, {
          ...toastOptions,
          icon: 'ℹ️'
        });
        break;
      case 'loading':
        toast.loading(`${notification.title}: ${notification.message}`, toastOptions);
        break;
    }
  }

  /**
   * Get toast background color
   */
  private getToastBackground(type: string): string {
    switch (type) {
      case 'success': return '#f0f9ff';
      case 'error': return '#fef2f2';
      case 'warning': return '#fffbeb';
      case 'info': return '#f0f9ff';
      case 'loading': return '#f9fafb';
      default: return '#ffffff';
    }
  }

  /**
   * Get toast text color
   */
  private getToastColor(type: string): string {
    switch (type) {
      case 'success': return '#065f46';
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      case 'info': return '#1e40af';
      case 'loading': return '#374151';
      default: return '#111827';
    }
  }

  /**
   * Get toast border color
   */
  private getToastBorder(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'loading': return '#6b7280';
      default: return '#e5e7eb';
    }
  }

  /**
   * Dismiss notification
   */
  dismiss(notificationId: string): boolean {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
      this.notifications.splice(index, 1);
      toast.dismiss(notificationId);
      return true;
    }
    return false;
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.notifications = [];
    toast.dismiss();
  }

  /**
   * Get notifications
   */
  getNotifications(limit: number = 50): Notification[] {
    return this.notifications.slice(0, limit);
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | null {
    return this.notifications.find(n => n.id === id) || null;
  }

  /**
   * Update notification
   */
  updateNotification(id: string, updates: Partial<Notification>): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index > -1) {
      this.notifications[index] = { ...this.notifications[index], ...updates };
      return true;
    }
    return false;
  }

  /**
   * Get notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Update notification settings
   */
  updateSettings(updates: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const total = this.notifications.length;
    const byType = this.notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCategory = this.notifications.reduce((acc, n) => {
      const category = n.metadata?.category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successCount = byType.success || 0;
    const successRate = total > 0 ? (successCount / total) * 100 : 0;

    return {
      total,
      by_type: byType,
      by_category: byCategory,
      success_rate: successRate,
      read_rate: 0, // Would need to track read status
      response_rate: 0 // Would need to track response status
    };
  }

  /**
   * Add notification listener
   */
  addListener(listener: (notification: Notification) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove notification listener
   */
  removeListener(listener: (notification: Notification) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Generate notification ID
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show system notification
   */
  system(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): string {
    return this.show({
      type,
      title: 'System',
      message,
      metadata: { category: 'system' }
    });
  }

  /**
   * Show security notification
   */
  security(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'warning'): string {
    return this.show({
      type,
      title: 'Security',
      message,
      metadata: { category: 'security' }
    });
  }

  /**
   * Show performance notification
   */
  performance(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): string {
    return this.show({
      type,
      title: 'Performance',
      message,
      metadata: { category: 'performance' }
    });
  }

  /**
   * Show user notification
   */
  user(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): string {
    return this.show({
      type,
      title: 'User',
      message,
      metadata: { category: 'user' }
    });
  }

  /**
   * Show business notification
   */
  business(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): string {
    return this.show({
      type,
      title: 'Business',
      message,
      metadata: { category: 'business' }
    });
  }

  /**
   * Clear old notifications
   */
  clearOld(olderThanHours: number = 24): number {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.notifications.length;
    
    this.notifications = this.notifications.filter(n => n.timestamp > cutoff);
    
    return initialLength - this.notifications.length;
  }

  /**
   * Get notification health
   */
  getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check notification volume
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = this.notifications.filter(n => n.timestamp > last24h);
    
    if (recentNotifications.length > 100) {
      issues.push('High notification volume');
      recommendations.push('Consider reducing notification frequency');
    }

    // Check error rate
    const errorNotifications = recentNotifications.filter(n => n.type === 'error');
    const errorRate = recentNotifications.length > 0 ? (errorNotifications.length / recentNotifications.length) * 100 : 0;
    
    if (errorRate > 20) {
      issues.push('High error notification rate');
      recommendations.push('Investigate and fix underlying issues');
    }

    // Check settings
    if (!this.settings.enabled) {
      issues.push('Notifications disabled');
      recommendations.push('Enable notifications for better user experience');
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
export const enterpriseNotificationService = new EnterpriseNotificationService();

export default enterpriseNotificationService;
