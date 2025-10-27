// @ts-nocheck
/**
 * useEnterpriseReporting Hook
 * Custom hook for enterprise reporting management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseReportingService
} from '../services/enterpriseReportingService';
import { 
  Report, 
  ReportExecution, 
  ReportTemplate, 
  ReportDashboard 
} from '../types/enterprise';

interface UseEnterpriseReportingOptions {
  autoStart?: boolean;
  executionLimit?: number;
}

interface UseEnterpriseReportingReturn {
  reports: Report[];
  executions: ReportExecution[];
  templates: ReportTemplate[];
  dashboards: ReportDashboard[];
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  createReport: (report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'generation_count'>) => string;
  updateReport: (id: string, updates: Partial<Report>) => boolean;
  deleteReport: (id: string) => boolean;
  getReport: (id: string) => Report | null;
  executeReport: (id: string, triggeredBy?: string, triggeredType?: ReportExecution['triggered_type']) => Promise<ReportExecution>;
  cancelExecution: (id: string) => boolean;
  getExecution: (id: string) => ReportExecution | null;
  getExecutions: (reportId?: string, limit?: number) => ReportExecution[];
  createTemplate: (template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => string;
  getTemplate: (id: string) => ReportTemplate | null;
  createReportFromTemplate: (templateId: string, name: string, createdBy: string) => string;
  createDashboard: (dashboard: Omit<ReportDashboard, 'id' | 'created_at' | 'updated_at'>) => string;
  getDashboard: (id: string) => ReportDashboard | null;
  refreshReports: () => void;
  refreshExecutions: () => void;
  refreshTemplates: () => void;
  refreshDashboards: () => void;
  clearOldExecutions: (olderThanDays?: number) => number;
  reportingStats: {
    total_reports: number;
    active_reports: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    total_templates: number;
    total_dashboards: number;
    avg_execution_time: number;
    success_rate: number;
  };
  reportingHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseReporting = (
  options: UseEnterpriseReportingOptions = {}
): UseEnterpriseReportingReturn => {
  const {
    autoStart = true,
    executionLimit = 100
  } = options;

  const [reports, setReports] = useState<Report[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [dashboards, setDashboards] = useState<ReportDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create report
  const createReport = useCallback((report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'generation_count'>): string => {
    const id = enterpriseReportingService.createReport(report);
    setReports(enterpriseReportingService.getReports());
    return id;
  }, []);

  // Update report
  const updateReport = useCallback((id: string, updates: Partial<Report>): boolean => {
    const updated = enterpriseReportingService.updateReport(id, updates);
    if (updated) {
      setReports(enterpriseReportingService.getReports());
    }
    return updated;
  }, []);

  // Delete report
  const deleteReport = useCallback((id: string): boolean => {
    const deleted = enterpriseReportingService.deleteReport(id);
    if (deleted) {
      setReports(enterpriseReportingService.getReports());
    }
    return deleted;
  }, []);

  // Get report
  const getReport = useCallback((id: string): Report | null => {
    return enterpriseReportingService.getReport(id);
  }, []);

  // Execute report
  const executeReport = useCallback(async (id: string, triggeredBy: string = 'system', triggeredType: ReportExecution['triggered_type'] = 'manual'): Promise<ReportExecution> => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const execution = await enterpriseReportingService.executeReport(id, triggeredBy, triggeredType);
      return execution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Report execution failed';
      setError(errorMessage);
      setHasError(true);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel execution
  const cancelExecution = useCallback((id: string): boolean => {
    const cancelled = enterpriseReportingService.cancelExecution(id);
    if (cancelled) {
      setExecutions(enterpriseReportingService.getExecutions(undefined, executionLimit));
    }
    return cancelled;
  }, [executionLimit]);

  // Get execution
  const getExecution = useCallback((id: string): ReportExecution | null => {
    return enterpriseReportingService.getExecution(id);
  }, []);

  // Get executions
  const getExecutions = useCallback((reportId?: string, limit: number = executionLimit): ReportExecution[] => {
    return enterpriseReportingService.getExecutions(reportId, limit);
  }, [executionLimit]);

  // Create template
  const createTemplate = useCallback((template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): string => {
    const id = enterpriseReportingService.createTemplate(template);
    setTemplates(enterpriseReportingService.getTemplates());
    return id;
  }, []);

  // Get template
  const getTemplate = useCallback((id: string): ReportTemplate | null => {
    return enterpriseReportingService.getTemplate(id);
  }, []);

  // Create report from template
  const createReportFromTemplate = useCallback((templateId: string, name: string, createdBy: string): string => {
    const id = enterpriseReportingService.createReportFromTemplate(templateId, name, createdBy);
    setReports(enterpriseReportingService.getReports());
    setTemplates(enterpriseReportingService.getTemplates());
    return id;
  }, []);

  // Create dashboard
  const createDashboard = useCallback((dashboard: Omit<ReportDashboard, 'id' | 'created_at' | 'updated_at'>): string => {
    const id = enterpriseReportingService.createDashboard(dashboard);
    setDashboards(enterpriseReportingService.getDashboards());
    return id;
  }, []);

  // Get dashboard
  const getDashboard = useCallback((id: string): ReportDashboard | null => {
    return enterpriseReportingService.getDashboard(id);
  }, []);

  // Refresh reports
  const refreshReports = useCallback(() => {
    setReports(enterpriseReportingService.getReports());
  }, []);

  // Refresh executions
  const refreshExecutions = useCallback(() => {
    setExecutions(enterpriseReportingService.getExecutions(undefined, executionLimit));
  }, [executionLimit]);

  // Refresh templates
  const refreshTemplates = useCallback(() => {
    setTemplates(enterpriseReportingService.getTemplates());
  }, []);

  // Refresh dashboards
  const refreshDashboards = useCallback(() => {
    setDashboards(enterpriseReportingService.getDashboards());
  }, []);

  // Clear old executions
  const clearOldExecutions = useCallback((olderThanDays: number = 90): number => {
    const cleared = enterpriseReportingService.clearOldExecutions(olderThanDays);
    setExecutions(enterpriseReportingService.getExecutions(undefined, executionLimit));
    return cleared;
  }, [executionLimit]);

  // Setup execution listener
  useEffect(() => {
    const handleExecution = (execution: ReportExecution) => {
      setExecutions(prev => [execution, ...prev.slice(0, executionLimit - 1)]);
    };

    enterpriseReportingService.addExecutionListener(handleExecution);

    return () => {
      enterpriseReportingService.removeExecutionListener(handleExecution);
    };
  }, [executionLimit]);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setReports(enterpriseReportingService.getReports());
      setExecutions(enterpriseReportingService.getExecutions(undefined, executionLimit));
      setTemplates(enterpriseReportingService.getTemplates());
      setDashboards(enterpriseReportingService.getDashboards());
    }
  }, [autoStart, executionLimit]);

  // Get stats
  const reportingStats = enterpriseReportingService.getReportingStats();

  // Get health
  const reportingHealth = enterpriseReportingService.getReportingHealth();

  return {
    reports,
    executions,
    templates,
    dashboards,
    isLoading,
    hasError,
    error,
    createReport,
    updateReport,
    deleteReport,
    getReport,
    executeReport,
    cancelExecution,
    getExecution,
    getExecutions,
    createTemplate,
    getTemplate,
    createReportFromTemplate,
    createDashboard,
    getDashboard,
    refreshReports,
    refreshExecutions,
    refreshTemplates,
    refreshDashboards,
    clearOldExecutions,
    reportingStats,
    reportingHealth
  };
};

export default useEnterpriseReporting;
