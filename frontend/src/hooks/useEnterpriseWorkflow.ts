// @ts-nocheck
/**
 * useEnterpriseWorkflow Hook
 * Custom hook for enterprise workflow management
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  enterpriseWorkflowService
} from '../services/enterpriseWorkflowService';
import { 
  Workflow, 
  WorkflowExecution, 
  WorkflowTemplate 
} from '../types/enterprise';

interface UseEnterpriseWorkflowOptions {
  autoStart?: boolean;
  executionLimit?: number;
}

interface UseEnterpriseWorkflowReturn {
  workflows: Workflow[];
  executions: WorkflowExecution[];
  templates: WorkflowTemplate[];
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  createWorkflow: (workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'success_rate'>) => string;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => boolean;
  deleteWorkflow: (id: string) => boolean;
  getWorkflow: (id: string) => Workflow | null;
  executeWorkflow: (id: string, inputData?: Record<string, any>, executedBy?: string) => Promise<WorkflowExecution>;
  cancelExecution: (id: string) => boolean;
  createTemplate: (template: Omit<WorkflowTemplate, 'id' | 'created_at' | 'usage_count' | 'rating'>) => string;
  createWorkflowFromTemplate: (templateId: string, name: string, createdBy: string) => string;
  refreshWorkflows: () => void;
  refreshExecutions: () => void;
  refreshTemplates: () => void;
  clearOldExecutions: (olderThanDays?: number) => number;
  workflowStats: {
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    avg_execution_time: number;
    success_rate: number;
  };
  workflowHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseWorkflow = (
  options: UseEnterpriseWorkflowOptions = {}
): UseEnterpriseWorkflowReturn => {
  const {
    autoStart = true,
    executionLimit = 100
  } = options;

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create workflow
  const createWorkflow = useCallback((workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'success_rate'>): string => {
    const id = enterpriseWorkflowService.createWorkflow(workflow);
    setWorkflows(enterpriseWorkflowService.getWorkflows());
    return id;
  }, []);

  // Update workflow
  const updateWorkflow = useCallback((id: string, updates: Partial<Workflow>): boolean => {
    const updated = enterpriseWorkflowService.updateWorkflow(id, updates);
    if (updated) {
      setWorkflows(enterpriseWorkflowService.getWorkflows());
    }
    return updated;
  }, []);

  // Delete workflow
  const deleteWorkflow = useCallback((id: string): boolean => {
    const deleted = enterpriseWorkflowService.deleteWorkflow(id);
    if (deleted) {
      setWorkflows(enterpriseWorkflowService.getWorkflows());
    }
    return deleted;
  }, []);

  // Get workflow
  const getWorkflow = useCallback((id: string): Workflow | null => {
    return enterpriseWorkflowService.getWorkflow(id);
  }, []);

  // Execute workflow
  const executeWorkflow = useCallback(async (id: string, inputData: Record<string, any> = {}, executedBy: string = 'system'): Promise<WorkflowExecution> => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const execution = await enterpriseWorkflowService.executeWorkflow(id, inputData, executedBy);
      return execution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Workflow execution failed';
      setError(errorMessage);
      setHasError(true);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel execution
  const cancelExecution = useCallback((id: string): boolean => {
    const cancelled = enterpriseWorkflowService.cancelExecution(id);
    if (cancelled) {
      setExecutions(enterpriseWorkflowService.getExecutions(undefined, executionLimit));
    }
    return cancelled;
  }, [executionLimit]);

  // Create template
  const createTemplate = useCallback((template: Omit<WorkflowTemplate, 'id' | 'created_at' | 'usage_count' | 'rating'>): string => {
    const id = enterpriseWorkflowService.createTemplate(template);
    setTemplates(enterpriseWorkflowService.getTemplates());
    return id;
  }, []);

  // Create workflow from template
  const createWorkflowFromTemplate = useCallback((templateId: string, name: string, createdBy: string): string => {
    const id = enterpriseWorkflowService.createWorkflowFromTemplate(templateId, name, createdBy);
    setWorkflows(enterpriseWorkflowService.getWorkflows());
    setTemplates(enterpriseWorkflowService.getTemplates());
    return id;
  }, []);

  // Refresh workflows
  const refreshWorkflows = useCallback(() => {
    setWorkflows(enterpriseWorkflowService.getWorkflows());
  }, []);

  // Refresh executions
  const refreshExecutions = useCallback(() => {
    setExecutions(enterpriseWorkflowService.getExecutions(undefined, executionLimit));
  }, [executionLimit]);

  // Refresh templates
  const refreshTemplates = useCallback(() => {
    setTemplates(enterpriseWorkflowService.getTemplates());
  }, []);

  // Clear old executions
  const clearOldExecutions = useCallback((olderThanDays: number = 30): number => {
    const cleared = enterpriseWorkflowService.clearOldExecutions(olderThanDays);
    setExecutions(enterpriseWorkflowService.getExecutions(undefined, executionLimit));
    return cleared;
  }, [executionLimit]);

  // Setup execution listener
  useEffect(() => {
    const handleExecution = (execution: WorkflowExecution) => {
      setExecutions(prev => [execution, ...prev.slice(0, executionLimit - 1)]);
    };

    enterpriseWorkflowService.addExecutionListener(handleExecution);

    return () => {
      enterpriseWorkflowService.removeExecutionListener(handleExecution);
    };
  }, [executionLimit]);

  // Initial load
  useEffect(() => {
    if (autoStart) {
      setWorkflows(enterpriseWorkflowService.getWorkflows());
      setExecutions(enterpriseWorkflowService.getExecutions(undefined, executionLimit));
      setTemplates(enterpriseWorkflowService.getTemplates());
    }
  }, [autoStart, executionLimit]);

  // Get stats
  const workflowStats = enterpriseWorkflowService.getWorkflowStats();

  // Get health
  const workflowHealth = enterpriseWorkflowService.getWorkflowHealth();

  return {
    workflows,
    executions,
    templates,
    isLoading,
    hasError,
    error,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflow,
    executeWorkflow,
    cancelExecution,
    createTemplate,
    createWorkflowFromTemplate,
    refreshWorkflows,
    refreshExecutions,
    refreshTemplates,
    clearOldExecutions,
    workflowStats,
    workflowHealth
  };
};

export default useEnterpriseWorkflow;
