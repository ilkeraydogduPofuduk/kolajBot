/**
 * MonitoringDashboard Component
 * Comprehensive monitoring management and visualization dashboard
 */

import React, { useState } from 'react';
import { useEnterpriseMonitoring } from '../../hooks/useEnterpriseMonitoring';

interface MonitoringDashboardProps {
  className?: string;
  showStats?: boolean;
  showAlerts?: boolean;
  showServices?: boolean;
  showDashboards?: boolean;
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  className = '',
  showStats = true,
  showAlerts = true,
  showServices = true,
  showDashboards = true
}) => {
  const {
    metrics,
    alerts,
    dashboards,
    services,
    isLoading,
    hasError,
    error,
    acknowledgeAlert,
    resolveAlert,
    updateServiceStatus,
    refreshMetrics,
    refreshAlerts,
    refreshServices,
    refreshDashboards,
    clearOldMetrics,
    clearResolvedAlerts,
    monitoringStats,
    monitoringHealth
  } = useEnterpriseMonitoring();

  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'services' | 'dashboards'>('overview');

  if (isLoading) {
    return (
      <div className={`monitoring-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`monitoring-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Monitoring Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={refreshMetrics}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Metrics
            </button>
            <button
              onClick={refreshAlerts}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Alerts
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

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'down': return 'text-red-600 bg-red-50';
      case 'maintenance': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600 bg-red-50';
      case 'acknowledged': return 'text-yellow-600 bg-yellow-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
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

  const getServiceTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return '🔌';
      case 'database': return '🗄️';
      case 'cache': return '⚡';
      case 'queue': return '📨';
      case 'storage': return '💾';
      case 'external': return '🌐';
      default: return '🔧';
    }
  };

  return (
    <div className={`monitoring-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Monitoring Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(monitoringHealth.status)}`}>
            {monitoringHealth.status.toUpperCase()}
          </div>
          <button
            onClick={refreshMetrics}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh monitoring data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Issues */}
      {monitoringHealth.issues.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">Monitoring Health Issues</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {monitoringHealth.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            {monitoringHealth.recommendations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-yellow-800 font-medium text-sm">Recommendations:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {monitoringHealth.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Total Metrics</div>
            <div className="text-2xl font-bold text-gray-900">{monitoringStats.total_metrics.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Active Alerts</div>
            <div className="text-2xl font-bold text-red-600">{monitoringStats.active_alerts}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Healthy Services</div>
            <div className="text-2xl font-bold text-green-600">{monitoringStats.healthy_services}/{monitoringStats.total_services}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">System Uptime</div>
            <div className="text-2xl font-bold text-gray-900">{monitoringStats.system_uptime.toFixed(1)}%</div>
          </div>
        </div>
      )}

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
        <button
          onClick={() => setActiveTab('metrics')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'metrics'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Metrics ({metrics.length})
        </button>
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
        {showServices && (
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'services'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Services ({services.length})
          </button>
        )}
        {showDashboards && (
          <button
            onClick={() => setActiveTab('dashboards')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'dashboards'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dashboards ({dashboards.length})
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Recent Metrics */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Metrics</h3>
            <div className="space-y-2">
              {metrics.slice(0, 5).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(metric.timestamp).toLocaleString()} | {metric.category}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {metric.value} {metric.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Status */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {services.slice(0, 6).map((service) => (
                <div key={service.id} className="text-center">
                  <div className={`px-3 py-2 rounded-lg ${getServiceStatusColor(service.status)}`}>
                    <div className="text-lg mb-1">{getServiceTypeIcon(service.type || 'api')}</div>
                    <div className="text-sm font-medium">{service.name}</div>
                    <div className="text-xs">{service.status.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Metrics</h3>
            <button
              onClick={() => clearOldMetrics(30)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Old
            </button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {metrics.length > 0 ? (
                metrics.slice(0, 20).map((metric) => (
                  <div key={metric.id} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{metric.name}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(metric.timestamp).toLocaleString()} | {metric.category}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {metric.value} {metric.unit}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-sm">No metrics available</div>
                  <div className="text-xs mt-1">Metrics will appear here</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && showAlerts && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Monitoring Alerts</h3>
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
                <div key={alert.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity || 'medium')}`}>
                          {(alert.severity || 'medium').toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getAlertStatusColor(alert.status || 'active')}`}>
                          {(alert.status || 'active').toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                      <div className="text-xs text-gray-500">
                        {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : 'N/A'}
                        {alert.acknowledged_by && ` | Acknowledged by: ${alert.acknowledged_by}`}
                        {alert.resolved_by && ` | Resolved by: ${alert.resolved_by}`}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id, 'current_user')}
                          className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                        >
                          Ack
                        </button>
                      )}
                      {(alert.status === 'active' || alert.status === 'acknowledged') && (
                        <button
                          onClick={() => resolveAlert(alert.id, 'current_user')}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
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

      {/* Services Tab */}
      {activeTab === 'services' && showServices && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Services</h3>
          <div className="space-y-3">
            {services.length > 0 ? (
              services.map((service) => (
                <div key={service.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getServiceTypeIcon(service.type || 'api')}</span>
                        <h4 className="text-sm font-medium text-gray-900">{service.name}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceStatusColor(service.status)}`}>
                          {service.status.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{service.type} service</p>
                      <div className="text-xs text-gray-500">
                        Uptime: {(service.uptime || 0).toFixed(1)}% | Response Time: {service.response_time || 0}ms | Error Rate: {(service.error_rate || 0).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Last Check: {service.last_check ? new Date(service.last_check).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateServiceStatus(service.id, 'healthy', 100)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Healthy
                      </button>
                      <button
                        onClick={() => updateServiceStatus(service.id, 'degraded', 500)}
                        className="px-2 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        Degraded
                      </button>
                      <button
                        onClick={() => updateServiceStatus(service.id, 'down', 0, true)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Down
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">🔧</div>
                <div className="text-sm">No services configured</div>
                <div className="text-xs mt-1">Add services to monitor</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboards Tab */}
      {activeTab === 'dashboards' && showDashboards && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Dashboards</h3>
          <div className="space-y-3">
            {dashboards.length > 0 ? (
              dashboards.map((dashboard) => (
                <div key={dashboard.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{dashboard.name}</h4>
                        {dashboard.is_public && (
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            PUBLIC
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{dashboard.description}</p>
                      <div className="text-xs text-gray-500">
                        Widgets: {dashboard.widgets?.length || 0} | Created: {dashboard.created_at ? new Date(dashboard.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(dashboard.tags || []).map((tag: any, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      View
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <div className="text-sm">No dashboards available</div>
                <div className="text-xs mt-1">Create dashboards to visualize metrics</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
