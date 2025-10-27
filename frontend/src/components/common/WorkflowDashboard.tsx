/**
 * WorkflowDashboard Component
 * Comprehensive workflow management and monitoring dashboard
 */

import React, { useState } from 'react';
import { useEnterpriseWorkflow } from '../../hooks/useEnterpriseWorkflow';

interface WorkflowDashboardProps {
  className?: string;
  showStats?: boolean;
  showExecutions?: boolean;
  showTemplates?: boolean;
}

const WorkflowDashboard: React.FC<WorkflowDashboardProps> = ({
  className = '',
  showStats = true,
  showExecutions = true,
  showTemplates = true
}) => {
  const {
    workflows,
    executions,
    templates,
    isLoading,
    hasError,
    error,
    executeWorkflow,
    cancelExecution,
    refreshWorkflows,
    refreshExecutions,
    refreshTemplates,
    clearOldExecutions,
    workflowStats,
    workflowHealth
  } = useEnterpriseWorkflow();

  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'executions' | 'templates'>('overview');
  const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={`workflow-dashboard ${className}`}>
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading workflow data...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`workflow-dashboard ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Workflow Error</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-3 flex space-x-2">
            <button
              onClick={refreshWorkflows}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Workflows
            </button>
            <button
              onClick={refreshExecutions}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry Executions
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

  const getWorkflowStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'draft': return 'text-blue-600 bg-blue-50';
      case 'archived': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'cancelled': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'action': return '⚡';
      case 'condition': return '❓';
      case 'loop': return '🔄';
      case 'delay': return '⏱️';
      case 'webhook': return '🪝';
      case 'script': return '📝';
      default: return '🔧';
    }
  };

  const handleExecuteWorkflow = async (id: string) => {
    setExecutingWorkflow(id);
    try {
      await executeWorkflow(id);
      refreshExecutions();
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setExecutingWorkflow(null);
    }
  };

  return (
    <div className={`workflow-dashboard ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Workflow Dashboard</h2>
        <div className="flex items-center space-x-2">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflowHealth.status)}`}>
            {workflowHealth.status.toUpperCase()}
          </div>
          <button
            onClick={refreshWorkflows}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Refresh workflows"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Health Issues */}
      {workflowHealth.issues.length > 0 && (
        <div className="mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-yellow-800 font-medium mb-2">Workflow Health Issues</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              {workflowHealth.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
            {workflowHealth.recommendations.length > 0 && (
              <div className="mt-3">
                <h4 className="text-yellow-800 font-medium text-sm">Recommendations:</h4>
                <ul className="text-yellow-700 text-sm space-y-1">
                  {workflowHealth.recommendations.map((rec, index) => (
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
            <div className="text-sm text-gray-500 mb-1">Total Workflows</div>
            <div className="text-2xl font-bold text-gray-900">{workflowStats.total_workflows}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Active Workflows</div>
            <div className="text-2xl font-bold text-green-600">{workflowStats.active_workflows}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Total Executions</div>
            <div className="text-2xl font-bold text-gray-900">{workflowStats.total_executions}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border">
            <div className="text-sm text-gray-500 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-gray-900">{workflowStats.success_rate.toFixed(1)}%</div>
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
          onClick={() => setActiveTab('workflows')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'workflows'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Workflows ({workflows.length})
        </button>
        {showExecutions && (
          <button
            onClick={() => setActiveTab('executions')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'executions'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Executions ({executions.length})
          </button>
        )}
        {showTemplates && (
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'templates'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Templates ({templates.length})
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Recent Executions */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Executions</h3>
            <div className="space-y-2">
              {executions.slice(0, 5).map((execution) => (
                <div key={execution.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{execution.workflow_id}</div>
                    <div className="text-xs text-gray-500">
                      {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'N/A'} | Duration: {execution.duration || 0}ms
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getExecutionStatusColor(execution.status)}`}>
                    {execution.status.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow Performance */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflow Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Avg Execution Time</div>
                <div className="text-lg font-semibold text-gray-900">{workflowStats.avg_execution_time.toFixed(0)}ms</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Failed Executions</div>
                <div className="text-lg font-semibold text-red-600">{workflowStats.failed_executions}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflows Tab */}
      {activeTab === 'workflows' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflows</h3>
          <div className="space-y-3">
            {workflows.length > 0 ? (
              workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{workflow.name}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkflowStatusColor(workflow.status)}`}>
                          {workflow.status.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">v{workflow.version}</div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                      <div className="text-xs text-gray-500">
                        Steps: {workflow.steps?.length || 0} | Executions: {workflow.execution_count || 0} | Success Rate: {(workflow.success_rate || 0).toFixed(1)}%
                      </div>
                      {workflow.last_executed && (
                        <div className="text-xs text-gray-500">
                          Last Executed: {new Date(workflow.last_executed).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      disabled={executingWorkflow === workflow.id || workflow.status !== 'active'}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {executingWorkflow === workflow.id ? 'Executing...' : 'Execute'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">⚡</div>
                <div className="text-sm">No workflows configured</div>
                <div className="text-xs mt-1">Create workflows to get started</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && showExecutions && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Workflow Executions</h3>
            <button
              onClick={() => clearOldExecutions(30)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear Old
            </button>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {executions.length > 0 ? (
                executions.slice(0, 20).map((execution) => (
                  <div key={execution.id} className="border-b border-gray-200 p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{execution.workflow_id}</div>
                        <div className="text-xs text-gray-500">
                          {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'N/A'} | Duration: {execution.duration || 0}ms | Progress: {execution.progress}%
                        </div>
                        {execution.error_message && (
                          <div className="text-xs text-red-600 mt-1">{execution.error_message}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getExecutionStatusColor(execution.status)}`}>
                          {execution.status.toUpperCase()}
                        </div>
                        {execution.status === 'running' && (
                          <button
                            onClick={() => cancelExecution(execution.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-gray-500">
                  <div className="text-4xl mb-2">⚡</div>
                  <div className="text-sm">No executions</div>
                  <div className="text-xs mt-1">Workflow executions will appear here</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && showTemplates && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Workflow Templates</h3>
          <div className="space-y-3">
            {templates.length > 0 ? (
              templates.map((template) => (
                <div key={template.id} className="bg-white rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{template.name}</h4>
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.category.toUpperCase()}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="text-xs text-gray-500">
                        Steps: {template.steps?.length || 0} | Usage: {template.usage_count || 0} | Rating: {template.rating || 0}/5
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(template.tags || []).map((tag: any, index: number) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                      Use Template
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <div className="text-sm">No templates available</div>
                <div className="text-xs mt-1">Create templates to reuse workflows</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowDashboard;
