/**
 * LoggingDashboard Component
 * Comprehensive logging management and monitoring dashboard
 */

import React, { useState } from 'react';
import { useEnterpriseLogging } from '../../hooks/useEnterpriseLogging';

interface LoggingDashboardProps {
  className?: string;
  showStats?: boolean;
  showAlerts?: boolean;
  showFilters?: boolean;
}

const LoggingDashboard: React.FC<LoggingDashboardProps> = ({
  className = '',
  showStats = true,
  showAlerts = true,
  showFilters = true
}) => {
  const {
    logs,
    alerts,
    stats,
    isLoading,
    hasError,
    error,
    getLogs,
    resolveAlert,
    clearResolvedAlerts,
    refreshLogs,
    refreshAlerts,
    clearOldLogs,
    exportLogs,
    loggingHealth
  } = useEnterpriseLogging();

  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'alerts'>('overview');
  const [logFilter, setLogFilter] = useState({
    level: [] as string[],
    source: [] as string[],
    category: [] as string[],
    search: ''
  });
  const [filteredLogs, setFilteredLogs] = useState(logs);

  if (isLoading) {
    return (
      <div className={`logging-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading logging data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`logging-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Logging Error</h3>
              <p className="text-red-600 text-sm mt-1">Failed to load logging data</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={refreshLogs}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Logs
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-600 bg-gray-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'warn': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'fatal': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error_spike': return 'border-red-500 bg-red-50';
      case 'performance_degradation': return 'border-yellow-500 bg-yellow-50';
      case 'security_incident': return 'border-orange-500 bg-orange-50';
      case 'system_failure': return 'border-red-600 bg-red-100';
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

  const handleFilterChange = (newFilter: typeof logFilter) => {
    setLogFilter(newFilter);
    const filtered = getLogs({
      level: newFilter.level.length > 0 ? newFilter.level.join(',') : undefined,
      source: newFilter.source.length > 0 ? newFilter.source.join(',') : undefined,
      search: newFilter.search || undefined
    } as any);
    setFilteredLogs(filtered);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportLogs({
      level: logFilter.level.length > 0 ? logFilter.level.join(',') : undefined,
      source: logFilter.source.length > 0 ? logFilter.source.join(',') : undefined,
      search: logFilter.search || undefined
    } as any, format);
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`logging-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Logging Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(loggingHealth.status)}`}>
            {loggingHealth.status.toUpperCase()}
          </div>
          <button
            onClick={refreshLogs}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh logs"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Issues */}
      {loggingHealth.issues.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">Logging Health Issues</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {loggingHealth.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            {loggingHealth.recommendations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-yellow-800 font-medium text-sm">Recommendations:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {loggingHealth.recommendations.map((rec, index) => (
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
            <div className="text-sm text-gray-500 mb-1">Total Logs</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalLogs.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Error Rate</div>
            <div className="text-2xl font-bold text-red-600">{(stats.error_rate || 0).toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold text-gray-900">{(stats.avg_response_time || 0).toFixed(0)}ms</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Unique Users</div>
            <div className="text-2xl font-bold text-blue-600">{stats.unique_users || 0}</div>
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
          onClick={() => setActiveTab('logs')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'logs'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Logs ({filteredLogs.length})
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
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Log Levels */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Log Levels</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.logsByLevel || {}).map(([level, count]) => (
                <div key={level} className="text-center">
                  <div className={`px-3 py-2 rounded-lg ${getLevelColor(level)}`}>
                    <div className="text-sm font-medium">{level.toUpperCase()}</div>
                    <div className="text-lg font-bold">{(count as number).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Log Sources */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Log Sources</h3>
            <div className="space-y-2">
              {Object.entries(stats.logsBySource || {}).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{source}</span>
                  <span className="text-sm font-medium text-gray-900">{(count as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Log Categories */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Log Categories</h3>
            <div className="space-y-2">
              {Object.entries(stats.by_category || {}).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{category.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{(count as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    multiple
                    value={logFilter.level}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange({ ...logFilter, level: values });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                    <option value="fatal">Fatal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                  <select
                    multiple
                    value={logFilter.source}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange({ ...logFilter, source: values });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {Object.keys(stats.logsBySource || {}).map(source => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    multiple
                    value={logFilter.category}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange({ ...logFilter, category: values });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {Object.keys(stats.by_category || {}).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    value={logFilter.search}
                    onChange={(e) => handleFilterChange({ ...logFilter, search: e.target.value })}
                    placeholder="Search logs..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              {filteredLogs.length} logs
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleExport('json')}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Export CSV
              </button>
              <button
                onClick={() => clearOldLogs(7)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Old
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {filteredLogs.length > 0 ? (
                filteredLogs.slice(0, 100).map((log) => (
                  <div key={log.id} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-500">{log.source}</span>
                          <span className="text-xs text-gray-500">{log.category || 'N/A'}</span>
                        </div>
                        <div className="text-sm text-gray-900 mb-1">{log.message}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                          {(log as any).user_id && ` | User: ${(log as any).user_id}`}
                          {(log as any).session_id && ` | Session: ${(log as any).session_id}`}
                          {(log as any).duration && ` | Duration: ${(log as any).duration}ms`}
                        </div>
                        {(log as any).stack_trace && (
                          <div className="text-xs text-red-600 mt-1 font-mono">
                            {(log as any).stack_trace}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <div className="text-sm">No logs found</div>
                  <div className="text-xs mt-1">Try adjusting your filters</div>
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
            <h3 className="text-lg font-semibold text-gray-800">Log Alerts</h3>
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
                  className={`border-l-4 p-4 rounded-r-lg ${getAlertColor((alert as any).type || 'info')}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{(alert as any).message || 'Alert'}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor((alert as any).severity || 'info')}`}>
                          {((alert as any).severity || 'info').toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{((alert as any).type || 'info').replace('_', ' ')}</p>
                      <div className="text-xs text-gray-500">
                        {new Date((alert as any).timestamp || Date.now()).toLocaleString()}
                        {(alert as any).affected_users > 0 && ` | Users: ${(alert as any).affected_users}`}
                        {(alert as any).affected_sessions > 0 && ` | Sessions: ${(alert as any).affected_sessions}`}
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
    </div>
  );
};

export default LoggingDashboard;
