/**
 * NotificationCenter Component
 * Comprehensive notification management center
 */

import React, { useState } from 'react';
import { useEnterpriseNotification } from '../../hooks/useEnterpriseNotification';

interface NotificationCenterProps {
  className?: string;
  showSettings?: boolean;
  showStats?: boolean;
  showHealth?: boolean;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  showSettings = true,
  showStats = true,
  showHealth = true
}) => {
  const {
    notifications,
    settings,
    stats,
    isLoading,
    hasError,
    error,
    dismiss,
    dismissAll,
    updateSettings,
    refreshNotifications,
    clearOld,
    notificationHealth
  } = useEnterpriseNotification();

  const [activeTab, setActiveTab] = useState<'notifications' | 'settings' | 'stats'>('notifications');

  if (isLoading) {
    return (
      <div className={`notification-center ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading notifications...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`notification-center ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Notification Error</h3>
              <p className="text-red-600 text-sm mt-1">Failed to load notifications</p>
            </div>
          </div>
          <button
            onClick={refreshNotifications}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'loading': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'loading': return '⏳';
      default: return '📢';
    }
  };

  return (
    <div className={`notification-center ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Notification Center</h2>
        <div className="flex items-center space-x-2">
          {showHealth && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(notificationHealth.status)}`}>
              {notificationHealth.status.toUpperCase()}
            </div>
          )}
          <button
            onClick={refreshNotifications}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh notifications"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'notifications'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Notifications ({notifications.length})
        </button>
        {showSettings && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Settings
          </button>
        )}
        {showStats && (
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'stats'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Statistics
          </button>
        )}
      </div>

      {/* Health Issues */}
      {showHealth && notificationHealth.issues.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">Notification Health Issues</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {notificationHealth.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            {notificationHealth.recommendations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-yellow-800 font-medium text-sm">Recommendations:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {notificationHealth.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div>
          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {notifications.length} notifications
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => clearOld(24)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Old
              </button>
              <button
                onClick={dismissAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Dismiss All
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${getTypeColor(notification.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getTypeIcon(notification.type)}</span>
                        <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                      <div className="text-xs text-gray-500">
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                      {notification.metadata?.category && (
                        <div className="text-xs text-gray-500 mt-1">
                          Category: {notification.metadata.category}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => dismiss(notification.id)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="mt-3 flex space-x-2">
                      {notification.actions.map((action: any, index: number) => (
                        <button
                          key={index}
                          onClick={action.action}
                          className={`px-3 py-1 text-xs rounded ${
                            action.style === 'danger'
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : action.style === 'primary'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">📢</div>
                <div className="text-sm">No notifications</div>
                <div className="text-xs mt-1">You're all caught up!</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && showSettings && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Settings</h3>
          
          {/* General Settings */}
          <div className="bg-white rounded-lg border p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">General</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => updateSettings({ enabled: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Enable notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.sound}
                  onChange={(e) => updateSettings({ sound: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Sound notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.desktop}
                  onChange={(e) => updateSettings({ desktop: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Desktop notifications</span>
              </label>
            </div>
          </div>

          {/* Category Settings */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Categories</h4>
            <div className="space-y-3">
              {Object.entries(settings.categories).map(([category, enabled]) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabled as boolean}
                    onChange={(e) => updateSettings({
                      categories: {
                        ...settings.categories,
                        [category]: e.target.checked
                      }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 capitalize">{category}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && showStats && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Statistics</h3>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-green-600">{(stats.success_rate || 0).toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Read Rate</div>
              <div className="text-2xl font-bold text-blue-600">{(stats.read_rate || 0).toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Response Rate</div>
              <div className="text-2xl font-bold text-purple-600">{(stats.response_rate || 0).toFixed(1)}%</div>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-lg border p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">By Type</h4>
            <div className="space-y-2">
              {Object.entries(stats.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{type}</span>
                  <span className="text-sm font-medium text-gray-900">{count as React.ReactNode}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Category */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">By Category</h4>
            <div className="space-y-2">
              {Object.entries(stats.by_category || {}).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{category}</span>
                  <span className="text-sm font-medium text-gray-900">{count as React.ReactNode}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
