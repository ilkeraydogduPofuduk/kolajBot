/**
 * SystemDashboard Component
 * Comprehensive system monitoring and management dashboard
 */

import React, { useState } from 'react';
import { useEnterpriseSystem } from '../../hooks/useEnterpriseSystem';

interface SystemDashboardProps {
  className?: string;
  showInfo?: boolean;
  showHealth?: boolean;
  showMetrics?: boolean;
  showAlerts?: boolean;
  showTrends?: boolean;
}

const SystemDashboard: React.FC<SystemDashboardProps> = ({
  className = '',
  showInfo = true,
  showHealth = true,
  showMetrics = true,
  showAlerts = true,
  showTrends = true
}) => {
  const {
    systemInfo,
    systemHealth,
    metrics,
    alerts,
    performanceScore,
    systemStatus,
    recommendations,
    healthSummary,
    trends,
    isLoading,
    hasError,
    error,
    refreshSystemInfo,
    refreshSystemHealth,
    refreshMetrics,
    resolveAlert,
    clearResolvedAlerts
  } = useEnterpriseSystem();

  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'health'>('overview');

  if (isLoading) {
    return (
      <div className={`system-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading system data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`system-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">System Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={refreshSystemInfo}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Info
            </button>
            <button
              onClick={refreshMetrics}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Metrics
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-red-600';
      case 'down': return 'text-green-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`system-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">System Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus)}`}>
            {systemStatus.toUpperCase()}
          </div>
          <button
            onClick={refreshMetrics}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh metrics"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Performance Score</div>
          <div className="text-2xl font-bold text-gray-900">{performanceScore}/100</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Active Alerts</div>
          <div className="text-2xl font-bold text-red-600">{healthSummary.alerts}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Recommendations</div>
          <div className="text-2xl font-bold text-yellow-600">{healthSummary.recommendations}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Uptime</div>
          <div className="text-2xl font-bold text-gray-900">{healthSummary.uptime}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'overview'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        {showMetrics && (
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'metrics'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Metrics
          </button>
        )}
        {showAlerts && (
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'alerts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Alerts ({alerts.length})
          </button>
        )}
        {showHealth && (
          <button
            onClick={() => setActiveTab('health')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'health'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Health
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* System Info */}
          {showInfo && systemInfo && (
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">System Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Version</div>
                  <div className="text-sm font-medium text-gray-900">{systemInfo.version}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Environment</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{systemInfo.environment}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Platform</div>
                  <div className="text-sm font-medium text-gray-900">{systemInfo.platform}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Architecture</div>
                  <div className="text-sm font-medium text-gray-900">{systemInfo.arch}</div>
                </div>
              </div>
            </div>
          )}

          {/* Current Metrics */}
          {showMetrics && metrics.length > 0 && (
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">CPU Usage</div>
                  <div className="text-lg font-semibold text-gray-900">{metrics[0].cpu_usage}%</div>
                  <div className={`text-xs ${getTrendColor(trends.cpu_trend)}`}>
                    {getTrendIcon(trends.cpu_trend)} {trends.cpu_trend}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Memory Usage</div>
                  <div className="text-lg font-semibold text-gray-900">{metrics[0].memory_usage}%</div>
                  <div className={`text-xs ${getTrendColor(trends.memory_trend)}`}>
                    {getTrendIcon(trends.memory_trend)} {trends.memory_trend}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Disk Usage</div>
                  <div className="text-lg font-semibold text-gray-900">{metrics[0].disk_usage}%</div>
                  <div className={`text-xs ${getTrendColor(trends.disk_trend)}`}>
                    {getTrendIcon(trends.disk_trend)} {trends.disk_trend}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Response Time</div>
                  <div className="text-lg font-semibold text-gray-900">{metrics[0].response_time}ms</div>
                  <div className={`text-xs ${getTrendColor(trends.response_trend)}`}>
                    {getTrendIcon(trends.response_trend)} {trends.response_trend}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recommendations</h3>
              <div className="space-y-2">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && showMetrics && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Metrics</h3>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {metrics.slice(0, 20).map((metric, index) => (
                <div key={index} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {metric.timestamp ? new Date(metric.timestamp).toLocaleString() : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        CPU: {metric.cpu_usage}% | Memory: {metric.memory_usage}% | Disk: {metric.disk_usage}%
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {metric.response_time}ms
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && showAlerts && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">System Alerts</h3>
            <button
              onClick={clearResolvedAlerts}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Resolved
            </button>
          </div>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-r-lg ${getAlertColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
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
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <div className="text-sm">No active alerts</div>
                <div className="text-xs mt-1">System is running smoothly</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && showHealth && systemHealth && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health</h3>
          
          {/* Health Score */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Health Score</span>
              <span className="text-lg font-bold text-gray-900">{systemHealth.score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (systemHealth.score || 0) >= 80 ? 'bg-green-500' :
                  (systemHealth.score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${systemHealth.score || 0}%` }}
              />
            </div>
          </div>

          {/* Health Checks */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Health Checks</h4>
            <div className="space-y-2">
              {systemHealth.checks.map((check: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      check.status === 'pass' ? 'bg-green-500' :
                      check.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-700">{check.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    check.status === 'pass' ? 'bg-green-100 text-green-800' :
                    check.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {check.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemDashboard;
