/**
 * SecurityMonitor Component
 * Real-time security monitoring dashboard
 */

import React from 'react';
import { useEnterpriseSecurity } from '../../hooks/useEnterpriseSecurity';

interface SecurityMonitorProps {
  className?: string;
  showEvents?: boolean;
  showAlerts?: boolean;
  showMetrics?: boolean;
}

const SecurityMonitor: React.FC<SecurityMonitorProps> = ({
  className = '',
  showEvents = true,
  showAlerts = true,
  showMetrics = true
}) => {
  const {
    events,
    alerts,
    metrics,
    securityScore,
    securityStatus,
    isLoading,
    hasError,
    error,
    logEvent,
    resolveAlert,
    clearResolvedAlerts,
    refreshMetrics
  } = useEnterpriseSecurity();

  if (isLoading) {
    return (
      <div className={`security-monitor ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <span className="ml-2 text-gray-600">Loading security data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`security-monitor ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Security Monitoring Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={refreshMetrics}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'brute_force': return 'border-red-500 bg-red-50';
      case 'suspicious_upload': return 'border-yellow-500 bg-yellow-50';
      case 'api_abuse': return 'border-orange-500 bg-orange-50';
      case 'unusual_access': return 'border-blue-500 bg-blue-50';
      case 'data_breach': return 'border-red-600 bg-red-100';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`security-monitor ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Security Monitor</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(securityStatus)}`}>
            {securityStatus.toUpperCase()}
          </div>
          <button
            onClick={refreshMetrics}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Refresh metrics"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Security Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Security Score</span>
          <span className="text-lg font-bold text-gray-900">{securityScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              securityScore >= 80 ? 'bg-green-500' :
              securityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${securityScore}%` }}
          />
        </div>
      </div>

      {/* Metrics */}
      {showMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-500 mb-1">Total Events</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.total_events}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-500 mb-1">Blocked Attempts</div>
            <div className="text-lg font-semibold text-red-600">{metrics.blocked_attempts}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-500 mb-1">Suspicious Activities</div>
            <div className="text-lg font-semibold text-yellow-600">{metrics.suspicious_activities}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <div className="text-xs text-gray-500 mb-1">Last 24h Events</div>
            <div className="text-lg font-semibold text-gray-900">{metrics.last_24h_events}</div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {showAlerts && alerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Security Alerts</h3>
            <button
              onClick={clearResolvedAlerts}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear Resolved
            </button>
          </div>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border-l-4 p-3 rounded-r-lg ${getAlertColor(alert.type || 'suspicious')}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500">
                      {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                    title="Mark as resolved"
                  >
                    ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {showEvents && events.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Security Events</h3>
          <div className="space-y-2">
            {events.slice(0, 10).map((event) => (
              <div
                key={event.id}
                className={`border rounded-lg p-3 ${getSeverityColor(event.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{event.message}</div>
                    <div className="text-xs text-gray-500">
                      {event.type} • {event.severity} • {new Date(event.timestamp).toLocaleString()}
                    </div>
                    {event.ip_address && (
                      <div className="text-xs text-gray-500">IP: {event.ip_address}</div>
                    )}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                    {event.severity.toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No data state */}
      {events.length === 0 && alerts.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          <div className="text-4xl mb-2">🔒</div>
          <div className="text-sm">No security events or alerts</div>
          <div className="text-xs mt-1">System is secure</div>
        </div>
      )}
    </div>
  );
};

export default SecurityMonitor;
