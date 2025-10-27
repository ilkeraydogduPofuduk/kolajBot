/**
 * Notification Service
 * Bildirim servisi
 */

import toast from 'react-hot-toast';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  style?: React.CSSProperties;
  className?: string;
  icon?: string;
  id?: string;
}

export interface NotificationService {
  success: (message: string, options?: NotificationOptions) => string;
  error: (message: string, options?: NotificationOptions) => string;
  warning: (message: string, options?: NotificationOptions) => string;
  info: (message: string, options?: NotificationOptions) => string;
  loading: (message: string, options?: NotificationOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: NotificationOptions
  ) => Promise<T>;
}

class NotificationServiceImpl implements NotificationService {
  private defaultOptions: NotificationOptions = {
    duration: 4000,
    position: 'top-right'
  };

  success(message: string, options?: NotificationOptions): string {
    return toast.success(message, {
      duration: options?.duration || this.defaultOptions.duration,
      position: options?.position || this.defaultOptions.position,
      style: options?.style,
      className: options?.className,
      id: options?.id
    });
  }

  error(message: string, options?: NotificationOptions): string {
    return toast.error(message, {
      duration: options?.duration || 6000, // Longer duration for errors
      position: options?.position || this.defaultOptions.position,
      style: options?.style,
      className: options?.className,
      id: options?.id
    });
  }

  warning(message: string, options?: NotificationOptions): string {
    return toast(message, {
      duration: options?.duration || this.defaultOptions.duration,
      position: options?.position || this.defaultOptions.position,
      icon: options?.icon || '⚠️',
      style: options?.style || {
        background: '#f59e0b',
        color: '#fff'
      },
      className: options?.className,
      id: options?.id
    });
  }

  info(message: string, options?: NotificationOptions): string {
    return toast(message, {
      duration: options?.duration || this.defaultOptions.duration,
      position: options?.position || this.defaultOptions.position,
      icon: options?.icon || 'ℹ️',
      style: options?.style || {
        background: '#3b82f6',
        color: '#fff'
      },
      className: options?.className,
      id: options?.id
    });
  }

  loading(message: string, options?: NotificationOptions): string {
    return toast.loading(message, {
      duration: options?.duration || Infinity, // Loading toasts don't auto-dismiss
      position: options?.position || this.defaultOptions.position,
      style: options?.style,
      className: options?.className,
      id: options?.id
    });
  }

  dismiss(id: string): void {
    toast.dismiss(id);
  }

  dismissAll(): void {
    toast.dismiss();
  }

  custom(message: string, type: string, duration?: number): string {
    return toast(message, {
      duration: duration || this.defaultOptions.duration,
      position: this.defaultOptions.position,
      style: {
        background: type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6',
        color: '#fff'
      }
    });
  }

  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: NotificationOptions
  ): Promise<T> {
    return toast.promise(promise, messages, {
      duration: options?.duration || this.defaultOptions.duration,
      position: options?.position || this.defaultOptions.position,
      style: options?.style,
      className: options?.className
    });
  }
}

// Singleton instance
export const notificationService = new NotificationServiceImpl();

// Convenience functions
export const showSuccess = (message: string, options?: NotificationOptions) => 
  notificationService.success(message, options);

export const showError = (message: string, options?: NotificationOptions) => 
  notificationService.error(message, options);

export const showWarning = (message: string, options?: NotificationOptions) => 
  notificationService.warning(message, options);

export const showInfo = (message: string, options?: NotificationOptions) => 
  notificationService.info(message, options);

export const showLoading = (message: string, options?: NotificationOptions) => 
  notificationService.loading(message, options);

export const dismissNotification = (id: string) => 
  notificationService.dismiss(id);

export const dismissAllNotifications = () => 
  notificationService.dismissAll();

export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
  options?: NotificationOptions
) => notificationService.promise(promise, messages, options);
