/**
 * ReportingDashboard Component
 * Enterprise reporting dashboard with real-time execution monitoring
 */

import React, { useState, useEffect } from 'react';
import { 
  enterpriseReportingService
} from '../../services/enterpriseReportingService';

// Type definitions
interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ReportExecution {
  id: string;
  report_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  error?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: any[];
}

interface ReportDashboard {
  id: string;
  name: string;
  description: string;
  widgets: any[];
  layout: any;
}

type ReportExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
import { useEnterpriseReporting } from '../../hooks/useEnterpriseReporting';
import { useEnterpriseNotification } from '../../hooks/useEnterpriseNotification';
import { useEnterprisePerformance } from '../../hooks/useEnterprisePerformance';

interface ReportingDashboardProps {
  className?: string;
  showStats?: boolean;
  showExecutions?: boolean;
  showTemplates?: boolean;
  showDashboards?: boolean;
  executionLimit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ReportingDashboard: React.FC<ReportingDashboardProps> = ({
  className = '',
  showStats = true,
  showExecutions = true,
  showTemplates = true,
  showDashboards = true,
  executionLimit = 50,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const {
    reports,
    executions,
    templates,
    dashboards,
    isLoading,
    hasError,
    error,
    executeReport,
    cancelExecution,
    deleteReport,
    createReportFromTemplate,
    refreshReports,
    refreshExecutions,
    refreshTemplates,
    refreshDashboards,
    clearOldExecutions,
    reportingStats,
    reportingHealth
  } = useEnterpriseReporting({
    autoStart: true,
    executionLimit
  });

  const { show } = useEnterpriseNotification();
  const { performanceScore } = useEnterprisePerformance();

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ReportExecution | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<ReportDashboard | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshReports();
      refreshExecutions();
      refreshTemplates();
      refreshDashboards();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshReports, refreshExecutions, refreshTemplates, refreshDashboards]);

  // Handle report execution
  const handleExecuteReport = async (reportId: string) => {
    setIsExecuting(true);
    try {
      await executeReport(reportId, 'dashboard', 'manual');
      show({ type: 'success', title: 'Success', message: 'Report execution started', read: false } as any);
    } catch (err) {
      show({ type: 'error', title: 'Error', message: 'Report execution failed', read: false } as any);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle execution cancellation
  const handleCancelExecution = (executionId: string) => {
    const cancelled = cancelExecution(executionId);
    if (cancelled) {
      show({ type: 'success', title: 'Success', message: 'Execution cancelled', read: false } as any);
    } else {
      show({ type: 'error', title: 'Error', message: 'Execution cancel failed', read: false } as any);
    }
  };

  // Handle report deletion
  const handleDeleteReport = (reportId: string) => {
    const deleted = deleteReport(reportId);
    if (deleted) {
      show({ type: 'success', title: 'Success', message: 'Report deleted', read: false } as any);
    } else {
      show({ type: 'error', title: 'Error', message: 'Report delete failed', read: false } as any);
    }
  };

  // Handle template usage
  const handleCreateFromTemplate = (templateId: string) => {
    const name = prompt('Enter report name:');
    if (name) {
      const reportId = createReportFromTemplate(templateId, name, 'dashboard_user');
      show({ type: 'success', title: 'Success', message: 'Report created from template', read: false } as any);
    }
  };

  // Handle clear old executions
  const handleClearOldExecutions = () => {
    const cleared = clearOldExecutions(90);
    show({ type: 'success', title: 'Success', message: 'Old executions cleared', read: false } as any);
  };

  // Get status color
  const getStatusColor = (status: ReportExecutionStatus): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get health color
  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (hasError) {
    return (
      <div className={`reporting-dashboard-error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Reporting Dashboard Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`reporting-dashboard ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">
              Enterprise reporting system with real-time execution monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Performance Score: <span className="font-semibold">{performanceScore}%</span>
            </div>
            <div className={`text-sm font-medium ${getHealthColor(reportingHealth.status)}`}>
              Status: {reportingHealth.status.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {showStats && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{reportingStats.total_reports}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportingStats.active_reports}</div>
              <div className="text-sm text-gray-600">Active Reports</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{reportingStats.total_executions}</div>
              <div className="text-sm text-gray-600">Total Executions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{reportingStats.successful_executions}</div>
              <div className="text-sm text-gray-600">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{reportingStats.failed_executions}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{reportingStats.total_templates}</div>
              <div className="text-sm text-gray-600">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">{reportingStats.total_dashboards}</div>
              <div className="text-sm text-gray-600">Dashboards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{reportingStats.success_rate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Health Issues */}
      {reportingHealth.issues.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Reporting System Issues
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {reportingHealth.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Reports Panel */}
          <div className="w-1/3 border-r border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={refreshReports}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)' }}>
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedReport?.id === report.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => setSelectedReport(report as any)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {report.name}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {report.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {report.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {report.generation_count} executions
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExecuteReport(report.id);
                        }}
                        disabled={isExecuting}
                        className="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        title="Execute Report"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(report.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Report"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Executions Panel */}
          {showExecutions && (
            <div className="w-1/3 border-r border-gray-200 bg-white">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Executions</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleClearOldExecutions}
                      className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Clear Old
                    </button>
                    <button
                      onClick={refreshExecutions}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)' }}>
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedExecution?.id === execution.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedExecution(execution as any)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(execution.status as any)}`}>
                            {execution.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {execution.triggered_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 mt-1 truncate">
                          Report: {execution.report_id}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Started: {execution.started_at ? new Date(execution.started_at).toLocaleString() : 'N/A'}
                        </p>
                        {execution.completed_at && (
                          <p className="text-xs text-gray-600">
                            Completed: {new Date(execution.completed_at).toLocaleString()}
                          </p>
                        )}
                        {execution.execution_time && (
                          <p className="text-xs text-gray-600">
                            Duration: {execution.execution_time.toFixed(2)}s
                          </p>
                        )}
                      </div>
                      {execution.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelExecution(execution.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Cancel Execution"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Templates & Dashboards Panel */}
          <div className="w-1/3 bg-white">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Templates & Dashboards</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    New Template
                  </button>
                  <button
                    onClick={refreshTemplates}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)' }}>
              {/* Templates */}
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Templates</h3>
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-2 border border-gray-200 rounded mb-2 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template as any)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {template.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {template.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.usage_count} uses
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateFromTemplate(template.id);
                        }}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Create Report from Template"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dashboards */}
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Dashboards</h3>
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className={`p-2 border border-gray-200 rounded mb-2 cursor-pointer hover:bg-gray-50 ${
                      selectedDashboard?.id === dashboard.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedDashboard(dashboard as any)}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {dashboard.name}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {dashboard.description}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {dashboard.layout}
                        </span>
                        <span className="text-xs text-gray-500">
                          {dashboard.reports?.length || 0} reports
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-900">Executing report...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingDashboard;
