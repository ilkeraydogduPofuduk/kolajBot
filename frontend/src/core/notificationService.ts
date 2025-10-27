/**
 * Merkezi Bildirim Sistemi
 * Tüm bildirimler tek yerden yönetilir
 */

import toast, { ToastOptions } from 'react-hot-toast';
import { logger } from './logger';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationOptions extends ToastOptions {
  type?: NotificationType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  closable?: boolean;
}

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  description?: string;
  timestamp: number;
  duration?: number;
  persistent?: boolean;
  closable?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationService {
  private notifications: NotificationMessage[] = [];
  private maxNotifications = 50;
  private defaultDuration = 4000;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('unhandledrejection', (event) => {
      this.showError('Unhandled Promise Rejection', event.reason?.message || 'Unknown error');
    });

    window.addEventListener('error', (event) => {
      this.showError('JavaScript Error', (event as any).message);
    });
  }

  private createNotification(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): NotificationMessage {
    const notification: NotificationMessage = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: options.title,
      message,
      description: options.description,
      timestamp: Date.now(),
      duration: options.duration || this.defaultDuration,
      persistent: options.persistent || false,
      closable: options.closable !== false,
      action: options.action,
    };

    // Add to internal list
    this.notifications.push(notification);

    // Maintain max notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }

    // Log notification
    logger.info('Notification shown', {
      type,
      message,
      title: options.title,
      component: 'NotificationService',
    });

    return notification;
  }

  private showToast(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): string {
    const toastOptions: ToastOptions = {
      duration: options.persistent ? Infinity : (options.duration || this.defaultDuration),
      position: 'top-right',
      style: {
        background: this.getBackgroundColor(type),
        color: this.getTextColor(type),
        border: `1px solid ${this.getBorderColor(type)}`,
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      icon: this.getIcon(type),
      iconTheme: {
        primary: this.getIconColor(type),
        secondary: '#fff',
      },
    };

    switch (type) {
      case 'success':
        return toast.success(message, toastOptions);
      case 'error':
        return toast.error(message, toastOptions);
      case 'warning':
        return toast(message, { ...toastOptions, icon: '⚠️' });
      case 'info':
        return toast(message, { ...toastOptions, icon: 'ℹ️' });
      case 'loading':
        return toast.loading(message, toastOptions);
      default:
        return toast(message, toastOptions);
    }
  }

  private getBackgroundColor(type: NotificationType): string {
    switch (type) {
      case 'success': return '#f0f9ff';
      case 'error': return '#fef2f2';
      case 'warning': return '#fffbeb';
      case 'info': return '#f0f9ff';
      case 'loading': return '#f8fafc';
      default: return '#f8fafc';
    }
  }

  private getTextColor(type: NotificationType): string {
    switch (type) {
      case 'success': return '#065f46';
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      case 'info': return '#1e40af';
      case 'loading': return '#374151';
      default: return '#374151';
    }
  }

  private getBorderColor(type: NotificationType): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'loading': return '#6b7280';
      default: return '#6b7280';
    }
  }

  private getIcon(type: NotificationType): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'loading': return '⏳';
      default: return 'ℹ️';
    }
  }

  private getIconColor(type: NotificationType): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'loading': return '#6b7280';
      default: return '#6b7280';
    }
  }

  public showSuccess(message: string, options: NotificationOptions = {}): string {
    const notification = this.createNotification('success', message, options);
    return this.showToast('success', message, options);
  }

  public showError(message: string, options: NotificationOptions = {}): string {
    const notification = this.createNotification('error', message, options);
    return this.showToast('error', message, options);
  }

  public showWarning(message: string, options: NotificationOptions = {}): string {
    const notification = this.createNotification('warning', message, options);
    return this.showToast('warning', message, options);
  }

  public showInfo(message: string, options: NotificationOptions = {}): string {
    const notification = this.createNotification('info', message, options);
    return this.showToast('info', message, options);
  }

  public showLoading(message: string, options: NotificationOptions = {}): string {
    const notification = this.createNotification('loading', message, options);
    return this.showToast('loading', message, options);
  }

  public showNotification(
    type: NotificationType,
    message: string,
    options: NotificationOptions = {}
  ): string {
    switch (type) {
      case 'success':
        return this.showSuccess(message, options);
      case 'error':
        return this.showError(message, options);
      case 'warning':
        return this.showWarning(message, options);
      case 'info':
        return this.showInfo(message, options);
      case 'loading':
        return this.showLoading(message, options);
      default:
        return this.showInfo(message, options);
    }
  }

  public dismiss(toastId: string): void {
    toast.dismiss(toastId);
  }

  public dismissAll(): void {
    toast.dismiss();
  }

  public getNotifications(): NotificationMessage[] {
    return [...this.notifications];
  }

  public getNotificationsByType(type: NotificationType): NotificationMessage[] {
    return this.notifications.filter(notification => notification.type === type);
  }

  public getRecentNotifications(count: number = 10): NotificationMessage[] {
    return this.notifications.slice(-count);
  }

  public clearNotifications(): void {
    this.notifications = [];
  }

  public getNotificationStats(): {
    total: number;
    byType: Record<NotificationType, number>;
    recent: number;
  } {
    const byType: Record<NotificationType, number> = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0,
      loading: 0,
    };

    this.notifications.forEach(notification => {
      byType[notification.type]++;
    });

    const recent = this.notifications.filter(
      notification => Date.now() - notification.timestamp < 60000 // Last minute
    ).length;

    return {
      total: this.notifications.length,
      byType,
      recent,
    };
  }

  public showPromise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> {
    const loadingId = this.showLoading(messages.loading, { persistent: true });

    return promise
      .then(result => {
        this.dismiss(loadingId);
        this.showSuccess(messages.success);
        return result;
      })
      .catch(error => {
        this.dismiss(loadingId);
        this.showError(messages.error, {
          description: error.message,
        });
        throw error;
      });
  }

  public showConfirmation(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): void {
    const confirmId = this.showInfo(message, {
      persistent: true,
      action: {
        label: 'Confirm',
        onClick: () => {
          this.dismiss(confirmId);
          onConfirm();
        },
      },
    });

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      this.dismiss(confirmId);
      if (onCancel) {
        onCancel();
      }
    }, 10000);
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Export commonly used methods
export const {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  showNotification,
  dismiss,
  dismissAll,
  getNotifications,
  clearNotifications,
  getNotificationStats,
  showPromise,
  showConfirmation,
} = notificationService;

export default notificationService;
