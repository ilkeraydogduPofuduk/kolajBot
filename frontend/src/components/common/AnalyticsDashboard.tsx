/**
 * AnalyticsDashboard Component
 * Comprehensive analytics dashboard with real-time insights
 */

import React, { useState } from 'react';
import { useEnterpriseAnalytics } from '../../hooks/useEnterpriseAnalytics';

interface AnalyticsDashboardProps {
  className?: string;
  showEvents?: boolean;
  showMetrics?: boolean;
  showInsights?: boolean;
  showReport?: boolean;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
  showEvents = true,
  showMetrics = true,
  showInsights = true,
  showReport = true
}) => {
  const {
    events,
    metrics,
    insights,
    report,
    isLoading,
    hasError,
    error,
    trackEvent,
    recordMetric,
    generateReport,
    refreshData,
    analyticsHealth
  } = useEnterpriseAnalytics();

  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  if (isLoading) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading analytics data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`analytics-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Analytics Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={refreshData}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend': return 'border-blue-500 bg-blue-50';
      case 'anomaly': return 'border-orange-500 bg-orange-50';
      case 'recommendation': return 'border-green-500 bg-green-50';
      case 'alert': return 'border-red-500 bg-red-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    generateReport(period);
  };

  return (
    <div className={`analytics-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Analytics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(analyticsHealth.status)}`}>
            {analyticsHealth.status.toUpperCase()}
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={refreshData}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Issues */}
      {analyticsHealth.issues.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">Analytics Health Issues</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {analyticsHealth.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            {analyticsHealth.recommendations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-yellow-800 font-medium text-sm">Recommendations:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {analyticsHealth.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report */}
      {showReport && report && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Analytics Report</h3>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Total Events</div>
              <div className="text-2xl font-bold text-gray-900">{report.metrics.total_events.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Unique Users</div>
              <div className="text-2xl font-bold text-gray-900">{report.metrics.unique_users.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Sessions</div>
              <div className="text-2xl font-bold text-gray-900">{report.metrics.sessions.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Page Views</div>
              <div className="text-2xl font-bold text-gray-900">{report.metrics.page_views.toLocaleString()}</div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white rounded-lg p-4 border mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Pages</h4>
            <div className="space-y-2">
              {report.top_pages?.slice(0, 5).map((page: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="text-sm text-gray-900">{page.page}</div>
                  <div className="text-sm text-gray-500">{page.views} views</div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance */}
          <div className="bg-white rounded-lg p-4 border">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Avg Load Time</div>
                <div className="text-lg font-semibold text-gray-900">{report.performance.avg_load_time.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Error Rate</div>
                <div className="text-lg font-semibold text-gray-900">{report.performance.error_rate.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {showInsights && insights.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Insights</h3>
          <div className="space-y-3">
            {insights.slice(0, 5).map((insight) => (
              <div
                key={insight.id}
                className={`border-l-4 p-4 rounded-r-lg ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(insight.severity || 'info')}`}>
                        {(insight.severity || 'info').toUpperCase()}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                    <div className="text-xs text-gray-500">
                      {new Date(insight.timestamp || Date.now()).toLocaleString()} • Confidence: {Math.round(insight.confidence * 100)}%
                    </div>
                  </div>
                </div>
                {insight.actions && insight.actions.length > 0 && (
                  <div className="mt-3 flex space-x-2">
                    {insight.actions.map((action: any, index: number) => (
                      <button
                        key={index}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {showEvents && events.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Events</h3>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {events.slice(0, 20).map((event) => (
                <div key={event.id} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{event.action}</div>
                      <div className="text-xs text-gray-500">
                        {event.type} • {event.category} • {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {event.value && (
                      <div className="text-sm text-gray-600">{event.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {showMetrics && metrics.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Metrics</h3>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {metrics.slice(0, 20).map((metric, index) => (
                <div key={index} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                      <div className="text-xs text-gray-500">
                        {metric.category} • {new Date(metric.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {metric.value} {metric.unit}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No data state */}
      {events.length === 0 && metrics.length === 0 && insights.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div className="text-sm">No analytics data available</div>
          <div className="text-xs mt-1">Start tracking events to see analytics</div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
