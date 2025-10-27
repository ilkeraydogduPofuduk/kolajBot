/**
 * PerformanceMonitor Component
 * Real-time performance monitoring dashboard
 */

import React from 'react';
import { useEnterprisePerformance } from '../../hooks/useEnterprisePerformance';

interface PerformanceMonitorProps {
  className?: string;
  showAlerts?: boolean;
  showRecommendations?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  showAlerts = true,
  showRecommendations = true
}) => {
  const {
    metrics,
    alerts,
    performanceScore,
    performanceStatus,
    recommendations,
    isLoading,
    hasError,
    error,
    resolveAlert,
    clearResolvedAlerts,
    refreshMetrics
  } = useEnterprisePerformance();

  if (isLoading && !metrics) {
    return (
      <div className={`performance-monitor ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`performance-monitor ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Performance Monitoring Error</h3>
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

  if (!metrics) {
    return (
      <div className={`performance-monitor ${className}`}>
        <div className="text-center p-4 text-gray-500">
          No performance data available
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'error': return 'border-red-400 bg-red-25';
      case 'warning': return 'border-yellow-400 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className={`performance-monitor ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">System Performance</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(performanceStatus)}`}>
            {performanceStatus.toUpperCase()}
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

      {/* Performance Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Score</span>
          <span className="text-lg font-bold text-gray-900">{performanceScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              performanceScore >= 90 ? 'bg-green-500' :
              performanceScore >= 75 ? 'bg-blue-500' :
              performanceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${performanceScore}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* CPU */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-500 mb-1">CPU Usage</div>
          <div className="text-lg font-semibold text-gray-900">{metrics.cpu}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${
                (metrics.cpu || 0) > 80 ? 'bg-red-500' : (metrics.cpu || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${metrics.cpu || 0}%` }}
            />
          </div>
        </div>

        {/* Memory */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-500 mb-1">Memory Usage</div>
          <div className="text-lg font-semibold text-gray-900">{metrics.memory}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${
                (metrics.memory || 0) > 85 ? 'bg-red-500' : (metrics.memory || 0) > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${metrics.memory || 0}%` }}
            />
          </div>
        </div>

        {/* Disk */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-500 mb-1">Disk Usage</div>
          <div className="text-lg font-semibold text-gray-900">{metrics.disk}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${
                (metrics.disk || 0) > 90 ? 'bg-red-500' : (metrics.disk || 0) > 80 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${metrics.disk || 0}%` }}
            />
          </div>
        </div>

        {/* Network */}
        <div className="bg-white rounded-lg p-3 border">
          <div className="text-xs text-gray-500 mb-1">Network</div>
          <div className="text-lg font-semibold text-gray-900">{metrics.network}%</div>
          <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
            <div
              className={`h-1 rounded-full ${
                (metrics.network || 0) > 70 ? 'bg-red-500' : (metrics.network || 0) > 50 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${metrics.network || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Database Metrics */}
      <div className="bg-white rounded-lg p-4 border mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Database Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500">Connections</div>
            <div className="text-sm font-medium text-gray-900">
              {(metrics.database as any)?.connections || 0}/{(metrics.database as any)?.max_connections || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Slow Queries</div>
            <div className="text-sm font-medium text-gray-900">{(metrics.database as any)?.slow_queries || 0}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Avg Query Time</div>
            <div className="text-sm font-medium text-gray-900">{(metrics.database as any)?.avg_query_time || 0}ms</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Cache Hit Rate</div>
            <div className="text-sm font-medium text-gray-900">{(metrics.cache as any)?.hit_rate || 0}%</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {showAlerts && alerts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Active Alerts</h3>
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
                className={`border-l-4 p-3 rounded-r-lg ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
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

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recommendations</h3>
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
  );
};

export default PerformanceMonitor;
