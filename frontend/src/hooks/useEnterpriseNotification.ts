// @ts-nocheck
/**
 * useEnterpriseNotification Hook
 * Custom hook for enterprise notification management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseNotificationService
} from '../services/enterpriseNotificationService';
import { 
  Notification, 
  NotificationSettings, 
  NotificationStats 
} from '../types/enterprise';

interface UseEnterpriseNotificationOptions {
  autoStart?: boolean;
  limit?: number;
}

interface UseEnterpriseNotificationReturn {
  notifications: Notification[];
  settings: NotificationSettings;
  stats: NotificationStats;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string | null;
  show: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  success: (title: string, message: string, options?: Partial<Notification>) => string;
  error: (title: string, message: string, options?: Partial<Notification>) => string;
  warning: (title: string, message: string, options?: Partial<Notification>) => string;
  info: (title: string, message: string, options?: Partial<Notification>) => string;
  loading: (title: string, message: string, options?: Partial<Notification>) => string;
  dismiss: (notificationId: string) => boolean;
  dismissAll: () => void;
  updateSettings: (updates: Partial<NotificationSettings>) => void;
  refreshNotifications: () => void;
  clearOld: (olderThanHours?: number) => number;
  notificationHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseNotification = (
  options: UseEnterpriseNotificationOptions = {}
): UseEnterpriseNotificationReturn => {
  const {
    autoStart = true,
    limit = 50
  } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
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
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Show notification
  const show = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>): string => {
    return enterpriseNotificationService.show(notification);
  }, []);

  // Show success notification
  const success = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return enterpriseNotificationService.success(title, message, options);
  }, []);

  // Show error notification
  const showError = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return enterpriseNotificationService.error(title, message, options);
  }, []);

  // Show warning notification
  const warning = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return enterpriseNotificationService.warning(title, message, options);
  }, []);

  // Show info notification
  const info = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return enterpriseNotificationService.info(title, message, options);
  }, []);

  // Show loading notification
  const loading = useCallback((title: string, message: string, options?: Partial<Notification>): string => {
    return enterpriseNotificationService.loading(title, message, options);
  }, []);

  // Dismiss notification
  const dismiss = useCallback((notificationId: string): boolean => {
    const dismissed = enterpriseNotificationService.dismiss(notificationId);
    if (dismissed) {
      setNotifications(enterpriseNotificationService.getNotifications(limit));
    }
    return dismissed;
  }, [limit]);

  // Dismiss all notifications
  const dismissAll = useCallback(() => {
    enterpriseNotificationService.dismissAll();
    setNotifications([]);
  }, []);

  // Update settings
  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    enterpriseNotificationService.updateSettings(updates);
    setSettings(enterpriseNotificationService.getSettings());
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    setNotifications(enterpriseNotificationService.getNotifications(limit));
  }, [limit]);

  // Clear old notifications
  const clearOld = useCallback((olderThanHours: number = 24): number => {
    const cleared = enterpriseNotificationService.clearOld(olderThanHours);
    setNotifications(enterpriseNotificationService.getNotifications(limit));
    return cleared;
  }, [limit]);

  // Setup notification listener
  useEffect(() => {
    const handleNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev.slice(0, limit - 1)]);
    };

    enterpriseNotificationService.addListener(handleNotification);

    return () => {
      enterpriseNotificationService.removeListener(handleNotification);
    };
  }, [limit]);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setNotifications(enterpriseNotificationService.getNotifications(limit));
      setSettings(enterpriseNotificationService.getSettings());
    }
  }, [autoStart, limit]);

  // Get stats
  const stats = enterpriseNotificationService.getStats();

  // Get notification health
  const notificationHealth = enterpriseNotificationService.getHealth();

  return {
    notifications,
    settings,
    stats,
    isLoading,
    hasError,
    errorMessage,
    show,
    success,
    error: showError,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    updateSettings,
    refreshNotifications,
    clearOld,
    notificationHealth
  };
};

export default useEnterpriseNotification;
