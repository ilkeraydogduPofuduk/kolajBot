/**
 * IntegrationDashboard Component
 * Comprehensive integration management and monitoring dashboard
 */

import React, { useState } from 'react';
import { useEnterpriseIntegration } from '../../hooks/useEnterpriseIntegration';

interface IntegrationDashboardProps {
  className?: string;
  showStats?: boolean;
  showEvents?: boolean;
  showHealth?: boolean;
}

const IntegrationDashboard: React.FC<IntegrationDashboardProps> = ({
  className = '',
  showStats = true,
  showEvents = true,
  showHealth = true
}) => {
  const {
    integrations,
    events,
    health,
    isLoading,
    hasError,
    error,
    testIntegration,
    refreshIntegrations,
    refreshEvents,
    refreshHealth,
    clearOldEvents,
    integrationStats,
    healthSummary
  } = useEnterpriseIntegration();

  const [activeTab, setActiveTab] = useState<'overview' | 'integrations' | 'events' | 'health'>('overview');
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={`integration-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading integration data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`integration-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Integration Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={refreshIntegrations}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Integrations
            </button>
            <button
              onClick={refreshEvents}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Events
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

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'maintenance': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
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
      case 'api': return '🔌';
      case 'webhook': return '🪝';
      case 'database': return '🗄️';
      case 'file': return '📁';
      case 'message_queue': return '📨';
      case 'cloud_service': return '☁️';
      default: return '🔗';
    }
  };

  const handleTestIntegration = async (id: string) => {
    setTestingIntegration(id);
    try {
      await testIntegration(id);
      refreshHealth();
    } catch (error) {
      console.error('Integration test failed:', error);
    } finally {
      setTestingIntegration(null);
    }
  };

  return (
    <div className={`integration-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Integration Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.overall_status || 'unknown')}`}>
            {(health.overall_status || 'unknown').toUpperCase()}
          </div>
          <button
            onClick={refreshIntegrations}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh integrations"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Total Integrations</div>
          <div className="text-2xl font-bold text-gray-900">{healthSummary.total}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Active</div>
          <div className="text-2xl font-bold text-green-600">{healthSummary.active}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-600">{healthSummary.failed}</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-500 mb-1">Error Rate</div>
          <div className="text-2xl font-bold text-gray-900">{healthSummary.error_rate.toFixed(1)}%</div>
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
        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'integrations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Integrations ({integrations.length})
        </button>
        {showEvents && (
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'events'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Events ({events.length})
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
          {/* Statistics */}
          {showStats && (
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Integration Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Total Requests</div>
                  <div className="text-lg font-semibold text-gray-900">{integrationStats.total_requests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Successful</div>
                  <div className="text-lg font-semibold text-green-600">{integrationStats.successful_requests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Failed</div>
                  <div className="text-lg font-semibold text-red-600">{integrationStats.failed_requests.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Avg Response Time</div>
                  <div className="text-lg font-semibold text-gray-900">{integrationStats.avg_response_time.toFixed(0)}ms</div>
                </div>
              </div>
            </div>
          )}

          {/* By Type */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">By Type</h4>
            <div className="space-y-2">
              {Object.entries(integrationStats.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(type)}</span>
                    <span className="text-sm text-gray-700 capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* By Status */}
          <div className="bg-white rounded-lg border p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">By Status</h4>
            <div className="space-y-2">
              {Object.entries(integrationStats.by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'active' ? 'bg-green-500' :
                      status === 'error' ? 'bg-red-500' :
                      status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm text-gray-700 capitalize">{status}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Integrations</h3>
          <div className="space-y-3">
            {integrations.length > 0 ? (
              integrations.map((integration) => (
                <div key={integration.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getTypeIcon(integration.type)}</span>
                        <h4 className="text-sm font-medium text-gray-900">{integration.name}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getIntegrationStatusColor(integration.status)}`}>
                          {integration.status.toUpperCase()}
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(integration.health.status)}`}>
                          {integration.health.status.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{integration.endpoint}</p>
                      <div className="text-xs text-gray-500">
                        Type: {integration.type} | Last Request: {new Date(integration.metrics.last_request).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestIntegration(integration.id)}
                      disabled={testingIntegration === integration.id}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {testingIntegration === integration.id ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">🔗</div>
                <div className="text-sm">No integrations configured</div>
                <div className="text-xs mt-1">Add integrations to get started</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && showEvents && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Integration Events</h3>
            <button
              onClick={() => clearOldEvents(24)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Old
            </button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {events.length > 0 ? (
                events.slice(0, 20).map((event) => (
                  <div key={event.id} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{event.type}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()} | Duration: {event.duration}ms
                        </div>
                        {event.error_message && (
                          <div className="text-xs text-red-600 mt-1">{event.error_message}</div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'success' ? 'bg-green-100 text-green-800' :
                        event.status === 'failure' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(event.status || 'unknown').toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <div className="text-4xl mb-2">📨</div>
                  <div className="text-sm">No events</div>
                  <div className="text-xs mt-1">Integration events will appear here</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && showHealth && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Integration Health</h3>
          
          {/* Health Score */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Health</span>
              <span className="text-lg font-bold text-gray-900">{(health.overall_status || 'unknown').toUpperCase()}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  health.overall_status === 'healthy' ? 'bg-green-500' :
                  health.overall_status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${health.overall_status === 'healthy' ? 100 : health.overall_status === 'warning' ? 60 : 20}%` }}
              />
            </div>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Avg Response Time</div>
              <div className="text-lg font-semibold text-gray-900">{(health.avg_response_time || 0).toFixed(0)}ms</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Error Rate</div>
              <div className="text-lg font-semibold text-gray-900">{(health.error_rate || 0).toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Uptime</div>
              <div className="text-lg font-semibold text-gray-900">{(health.uptime || 0).toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm text-gray-500 mb-1">Last Check</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(health.last_check || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationDashboard;
