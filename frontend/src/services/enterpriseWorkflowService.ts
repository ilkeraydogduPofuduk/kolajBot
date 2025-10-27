/**
 * Enterprise Workflow Service
 * Advanced workflow management and automation
 */

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft' | 'archived';
  version: number;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  last_executed?: Date;
  execution_count: number;
  success_rate: number;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'delay' | 'webhook' | 'script';
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
  };
  connections: string[];
  timeout?: number;
  retry_count?: number;
  error_handling?: 'stop' | 'continue' | 'retry';
}

interface WorkflowTrigger {
  id: string;
  type: 'schedule' | 'webhook' | 'event' | 'manual';
  config: Record<string, any>;
  enabled: boolean;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  duration?: number;
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  executed_by: string;
  steps_executed: string[];
  current_step?: string;
  progress: number;
  condition_results?: Record<string, boolean>;
  loop_results?: Record<string, { iterations: number }>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  steps: WorkflowStep[];
  variables: Record<string, any>;
  created_at: Date;
  usage_count: number;
  rating: number;
}

class EnterpriseWorkflowService {
  private workflows: Workflow[] = [];
  private executions: WorkflowExecution[] = [];
  private templates: WorkflowTemplate[] = [];
  private listeners: Array<(execution: WorkflowExecution) => void> = [];
  private readonly MAX_EXECUTIONS = 10000;
  private readonly MAX_WORKFLOWS = 1000;

  /**
   * Create workflow
   */
  createWorkflow(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'success_rate'>): string {
    const newWorkflow: Workflow = {
      ...workflow,
      id: this.generateWorkflowId(),
      created_at: new Date(),
      updated_at: new Date(),
      execution_count: 0,
      success_rate: 0
    };

    this.workflows.push(newWorkflow);
    return newWorkflow.id;
  }

  /**
   * Update workflow
   */
  updateWorkflow(id: string, updates: Partial<Workflow>): boolean {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index > -1) {
      this.workflows[index] = {
        ...this.workflows[index],
        ...updates,
        updated_at: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Delete workflow
   */
  deleteWorkflow(id: string): boolean {
    const index = this.workflows.findIndex(w => w.id === id);
    if (index > -1) {
      this.workflows.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get workflow
   */
  getWorkflow(id: string): Workflow | null {
    return this.workflows.find(w => w.id === id) || null;
  }

  /**
   * Get all workflows
   */
  getWorkflows(): Workflow[] {
    return this.workflows;
  }

  /**
   * Get workflows by status
   */
  getWorkflowsByStatus(status: Workflow['status']): Workflow[] {
    return this.workflows.filter(w => w.status === status);
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(
    id: string, 
    inputData: Record<string, any> = {}, 
    executedBy: string = 'system'
  ): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(id);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status !== 'active') {
      throw new Error('Workflow is not active');
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflow_id: id,
      status: 'running',
      started_at: new Date(),
      input_data: inputData,
      executed_by: executedBy,
      steps_executed: [],
      progress: 0
    };

    this.executions.unshift(execution);
    
    // Limit executions
    if (this.executions.length > this.MAX_EXECUTIONS) {
      this.executions = this.executions.slice(0, this.MAX_EXECUTIONS);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(execution));

    try {
      // Execute workflow steps
      await this.executeSteps(workflow, execution);
      
      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      execution.progress = 100;

      // Update workflow metrics
      this.updateWorkflowMetrics(id, true);

    } catch (error) {
      execution.status = 'failed';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';

      // Update workflow metrics
      this.updateWorkflowMetrics(id, false);
    }

    return execution;
  }

  /**
   * Execute workflow steps
   */
  private async executeSteps(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    const totalSteps = workflow.steps.length;
    let currentStepIndex = 0;

    while (currentStepIndex < totalSteps) {
      const step = workflow.steps[currentStepIndex];
      execution.current_step = step.id;
      execution.progress = (currentStepIndex / totalSteps) * 100;

      try {
        await this.executeStep(step, execution);
        execution.steps_executed.push(step.id);
        currentStepIndex++;
      } catch (error) {
        if (step.error_handling === 'stop') {
          throw error;
        } else if (step.error_handling === 'retry' && step.retry_count) {
          // Retry logic would go here
          currentStepIndex++;
        } else {
          // Continue to next step
          currentStepIndex++;
        }
      }
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    switch (step.type) {
      case 'action':
        await this.executeActionStep(step, execution);
        break;
      case 'condition':
        await this.executeConditionStep(step, execution);
        break;
      case 'loop':
        await this.executeLoopStep(step, execution);
        break;
      case 'delay':
        await this.executeDelayStep(step, execution);
        break;
      case 'webhook':
        await this.executeWebhookStep(step, execution);
        break;
      case 'script':
        await this.executeScriptStep(step, execution);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute action step
   */
  private async executeActionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { action_type, config } = step.config;
    
    switch (action_type) {
      case 'send_email':
        await this.executeEmailAction(step, execution);
        break;
      case 'create_task':
        await this.executeTaskAction(step, execution);
        break;
      case 'update_data':
        await this.executeDataAction(step, execution);
        break;
      case 'call_api':
        await this.executeApiAction(step, execution);
        break;
      case 'generate_report':
        await this.executeReportAction(step, execution);
        break;
      default:
        throw new Error(`Unknown action type: ${action_type}`);
    }
  }

  /**
   * Execute condition step
   */
  private async executeConditionStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { condition_type, field, operator, value } = step.config;
    
    let result = false;
    
    switch (condition_type) {
      case 'field_comparison':
        result = await this.evaluateFieldCondition(field, operator, value, execution);
        break;
      case 'data_exists':
        result = await this.evaluateDataExistsCondition(field, execution);
        break;
      case 'time_based':
        result = await this.evaluateTimeCondition(step.config, execution);
        break;
      case 'custom_script':
        result = await this.evaluateCustomScript(step.config.script, execution);
        break;
      default:
        throw new Error(`Unknown condition type: ${condition_type}`);
    }
    
    // Store condition result for next steps
    execution.condition_results = execution.condition_results || {};
    execution.condition_results[step.id] = result;
  }

  /**
   * Execute loop step
   */
  private async executeLoopStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { loop_type, max_iterations, condition } = step.config;
    let iterationCount = 0;
    const maxIterations = max_iterations || 100; // Safety limit
    
    switch (loop_type) {
      case 'for_loop':
        for (let i = 0; i < maxIterations; i++) {
          await this.executeLoopIteration(step, execution, i);
          iterationCount++;
        }
        break;
      case 'while_loop':
        while (iterationCount < maxIterations && await this.evaluateLoopCondition(condition, execution)) {
          await this.executeLoopIteration(step, execution, iterationCount);
          iterationCount++;
        }
        break;
      case 'foreach_loop':
        const items = await this.getLoopItems(step.config.items_source, execution);
        for (const item of items) {
          if (iterationCount >= maxIterations) break;
          await this.executeLoopIteration(step, execution, iterationCount, item);
          iterationCount++;
        }
        break;
      default:
        throw new Error(`Unknown loop type: ${loop_type}`);
    }
    
    // Store loop results
    execution.loop_results = execution.loop_results || {};
    execution.loop_results[step.id] = { iterations: iterationCount };
  }

  /**
   * Execute delay step
   */
  private async executeDelayStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const delay = step.config.delay || 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Helper methods for action steps
  private async executeEmailAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { to, subject, body, template } = step.config;
    // Email sending logic would go here
    console.log(`Sending email to ${to}: ${subject}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async executeTaskAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { title, description, assignee, priority } = step.config;
    // Task creation logic would go here
    console.log(`Creating task: ${title}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async executeDataAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { table, operation, data } = step.config;
    // Data update logic would go here
    console.log(`Updating data in ${table}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async executeApiAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { url, method, headers, body } = step.config;
    // API call logic would go here
    console.log(`Calling API: ${method} ${url}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async executeReportAction(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { report_type, parameters } = step.config;
    // Report generation logic would go here
    console.log(`Generating report: ${report_type}`);
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Helper methods for condition steps
  private async evaluateFieldCondition(field: string, operator: string, value: any, execution: WorkflowExecution): Promise<boolean> {
    // Field comparison logic would go here
    return true; // Placeholder
  }

  private async evaluateDataExistsCondition(field: string, execution: WorkflowExecution): Promise<boolean> {
    // Data existence check logic would go here
    return true; // Placeholder
  }

  private async evaluateTimeCondition(config: any, execution: WorkflowExecution): Promise<boolean> {
    // Time-based condition logic would go here
    return true; // Placeholder
  }

  private async evaluateCustomScript(script: string, execution: WorkflowExecution): Promise<boolean> {
    // Custom script evaluation logic would go here
    return true; // Placeholder
  }

  // Helper methods for loop steps
  private async executeLoopIteration(step: WorkflowStep, execution: WorkflowExecution, iteration: number, item?: any): Promise<void> {
    // Loop iteration logic would go here
    console.log(`Executing loop iteration ${iteration} for step ${step.name}`);
  }

  private async evaluateLoopCondition(condition: any, execution: WorkflowExecution): Promise<boolean> {
    // Loop condition evaluation logic would go here
    return true; // Placeholder
  }

  private async getLoopItems(itemsSource: string, execution: WorkflowExecution): Promise<any[]> {
    // Get items for foreach loop logic would go here
    return []; // Placeholder
  }

  /**
   * Execute webhook step
   */
  private async executeWebhookStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { url, method = 'POST', headers = {}, body } = step.config;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Execute script step
   */
  private async executeScriptStep(step: WorkflowStep, execution: WorkflowExecution): Promise<void> {
    const { script } = step.config;
    
    try {
      // Execute script (simplified)
      eval(script);
    } catch (error) {
      throw new Error(`Script execution failed: ${error}`);
    }
  }

  /**
   * Update workflow metrics
   */
  private updateWorkflowMetrics(workflowId: string, success: boolean): void {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) return;

    workflow.execution_count++;
    workflow.last_executed = new Date();

    // Calculate success rate
    const executions = this.executions.filter(e => e.workflow_id === workflowId);
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    workflow.success_rate = executions.length > 0 ? (successfulExecutions / executions.length) * 100 : 0;
  }

  /**
   * Get workflow execution
   */
  getExecution(id: string): WorkflowExecution | null {
    return this.executions.find(e => e.id === id) || null;
  }

  /**
   * Get workflow executions
   */
  getExecutions(workflowId?: string, limit: number = 100): WorkflowExecution[] {
    let executions = this.executions;
    
    if (workflowId) {
      executions = executions.filter(e => e.workflow_id === workflowId);
    }
    
    return executions.slice(0, limit);
  }

  /**
   * Cancel workflow execution
   */
  cancelExecution(id: string): boolean {
    const execution = this.getExecution(id);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      return true;
    }
    return false;
  }

  /**
   * Create workflow template
   */
  createTemplate(template: Omit<WorkflowTemplate, 'id' | 'created_at' | 'usage_count' | 'rating'>): string {
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: this.generateTemplateId(),
      created_at: new Date(),
      usage_count: 0,
      rating: 0
    };

    this.templates.push(newTemplate);
    return newTemplate.id;
  }

  /**
   * Get workflow templates
   */
  getTemplates(): WorkflowTemplate[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): WorkflowTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  /**
   * Create workflow from template
   */
  createWorkflowFromTemplate(templateId: string, name: string, createdBy: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at' | 'execution_count' | 'success_rate'> = {
      name,
      description: template.description,
      status: 'draft',
      version: 1,
      steps: template.steps,
      triggers: [],
      variables: template.variables,
      created_by: createdBy
    };

    const workflowId = this.createWorkflow(workflow);
    
    // Update template usage count
    template.usage_count++;

    return workflowId;
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats(): {
    total_workflows: number;
    active_workflows: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    avg_execution_time: number;
    success_rate: number;
  } {
    const totalWorkflows = this.workflows.length;
    const activeWorkflows = this.workflows.filter(w => w.status === 'active').length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter(e => e.status === 'completed').length;
    const failedExecutions = this.executions.filter(e => e.status === 'failed').length;
    
    const avgExecutionTime = this.executions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      total_workflows: totalWorkflows,
      active_workflows: activeWorkflows,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      avg_execution_time: avgExecutionTime,
      success_rate: successRate
    };
  }

  /**
   * Add execution listener
   */
  addExecutionListener(listener: (execution: WorkflowExecution) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove execution listener
   */
  removeExecutionListener(listener: (execution: WorkflowExecution) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Generate workflow ID
   */
  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate execution ID
   */
  private generateExecutionId(): string {
    return `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate template ID
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old executions
   */
  clearOldExecutions(olderThanDays: number = 30): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.executions.length;
    
    this.executions = this.executions.filter(e => e.started_at > cutoff);
    
    return initialLength - this.executions.length;
  }

  /**
   * Get workflow health
   */
  getWorkflowHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for failed workflows
    const failedWorkflows = this.workflows.filter(w => w.success_rate < 50);
    if (failedWorkflows.length > 0) {
      issues.push(`${failedWorkflows.length} workflows with low success rate`);
      recommendations.push('Review and fix failing workflows');
    }

    // Check for inactive workflows
    const inactiveWorkflows = this.workflows.filter(w => w.status === 'inactive');
    if (inactiveWorkflows.length > this.workflows.length * 0.5) {
      issues.push('High number of inactive workflows');
      recommendations.push('Consider cleaning up unused workflows');
    }

    // Check for long-running executions
    const longRunningExecutions = this.executions.filter(e => 
      e.status === 'running' && 
      Date.now() - e.started_at.getTime() > 3600000 // 1 hour
    );
    if (longRunningExecutions.length > 0) {
      issues.push(`${longRunningExecutions.length} long-running executions`);
      recommendations.push('Investigate and optimize long-running workflows');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const enterpriseWorkflowService = new EnterpriseWorkflowService();

export default enterpriseWorkflowService;
