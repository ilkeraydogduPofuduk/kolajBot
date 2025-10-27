/**
 * Enterprise Reporting Service
 * Advanced reporting with scheduled reports and data visualization
 */

interface Report {
  id: string;
  name: string;
  description: string;
  type: 'analytics' | 'performance' | 'security' | 'business' | 'custom';
  status: 'draft' | 'active' | 'paused' | 'archived';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    time: string;
    timezone: string;
    enabled: boolean;
  };
  data_source: string;
  query: string;
  filters: Record<string, any>;
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  template?: string;
  recipients: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  last_generated?: Date;
  generation_count: number;
  file_size?: number;
  download_url?: string;
}

interface ReportExecution {
  id: string;
  report_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at?: Date;
  duration?: number;
  records_processed: number;
  file_size?: number;
  download_url?: string;
  error_message?: string;
  triggered_by: string;
  triggered_type: 'manual' | 'scheduled' | 'api';
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: Report['type'];
  template: string;
  variables: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  usage_count: number;
  is_public: boolean;
  tags: string[];
}

interface ReportDashboard {
  id: string;
  name: string;
  description: string;
  reports: string[];
  layout: {
    columns: number;
    rows: number;
  };
  widgets: Array<{
    id: string;
    report_id: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: Record<string, any>;
  }>;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  is_public: boolean;
  tags: string[];
}

class EnterpriseReportingService {
  private reports: Report[] = [];
  private executions: ReportExecution[] = [];
  private templates: ReportTemplate[] = [];
  private dashboards: ReportDashboard[] = [];
  private listeners: Array<(execution: ReportExecution) => void> = [];
  private readonly MAX_REPORTS = 1000;
  private readonly MAX_EXECUTIONS = 10000;
  private readonly MAX_TEMPLATES = 500;
  private readonly MAX_DASHBOARDS = 100;

  /**
   * Create report
   */
  createReport(report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'generation_count'>): string {
    const newReport: Report = {
      ...report,
      id: this.generateReportId(),
      created_at: new Date(),
      updated_at: new Date(),
      generation_count: 0
    };

    this.reports.push(newReport);
    return newReport.id;
  }

  /**
   * Update report
   */
  updateReport(id: string, updates: Partial<Report>): boolean {
    const index = this.reports.findIndex(r => r.id === id);
    if (index > -1) {
      this.reports[index] = {
        ...this.reports[index],
        ...updates,
        updated_at: new Date()
      };
      return true;
    }
    return false;
  }

  /**
   * Delete report
   */
  deleteReport(id: string): boolean {
    const index = this.reports.findIndex(r => r.id === id);
    if (index > -1) {
      this.reports.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get report
   */
  getReport(id: string): Report | null {
    return this.reports.find(r => r.id === id) || null;
  }

  /**
   * Get all reports
   */
  getReports(): Report[] {
    return this.reports;
  }

  /**
   * Get reports by type
   */
  getReportsByType(type: Report['type']): Report[] {
    return this.reports.filter(r => r.type === type);
  }

  /**
   * Get reports by status
   */
  getReportsByStatus(status: Report['status']): Report[] {
    return this.reports.filter(r => r.status === status);
  }

  /**
   * Execute report
   */
  async executeReport(
    id: string, 
    triggeredBy: string = 'system', 
    triggeredType: ReportExecution['triggered_type'] = 'manual'
  ): Promise<ReportExecution> {
    const report = this.getReport(id);
    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'active') {
      throw new Error('Report is not active');
    }

    const execution: ReportExecution = {
      id: this.generateExecutionId(),
      report_id: id,
      status: 'running',
      started_at: new Date(),
      records_processed: 0,
      triggered_by: triggeredBy,
      triggered_type: triggeredType
    };

    this.executions.unshift(execution);
    
    // Limit executions
    if (this.executions.length > this.MAX_EXECUTIONS) {
      this.executions = this.executions.slice(0, this.MAX_EXECUTIONS);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(execution));

    try {
      // Simulate report execution
      await this.processReport(report, execution);
      
      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      execution.file_size = Math.floor(Math.random() * 1000000) + 100000; // Random file size
      execution.download_url = `/api/reports/download/${execution.id}`;

      // Update report metrics
      report.last_generated = new Date();
      report.generation_count++;

    } catch (error) {
      execution.status = 'failed';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
    }

    return execution;
  }

  /**
   * Process report
   */
  private async processReport(report: Report, execution: ReportExecution): Promise<void> {
    // Simulate processing time
    const processingTime = Math.random() * 5000 + 1000; // 1-6 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Simulate records processed
    execution.records_processed = Math.floor(Math.random() * 10000) + 1000;

    // Simulate potential failure
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Report generation failed');
    }
  }

  /**
   * Cancel report execution
   */
  cancelExecution(id: string): boolean {
    const execution = this.executions.find(e => e.id === id);
    if (execution && execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completed_at = new Date();
      execution.duration = execution.completed_at.getTime() - execution.started_at.getTime();
      return true;
    }
    return false;
  }

  /**
   * Get execution
   */
  getExecution(id: string): ReportExecution | null {
    return this.executions.find(e => e.id === id) || null;
  }

  /**
   * Get executions
   */
  getExecutions(reportId?: string, limit: number = 100): ReportExecution[] {
    let filteredExecutions = this.executions;
    
    if (reportId) {
      filteredExecutions = filteredExecutions.filter(e => e.report_id === reportId);
    }
    
    return filteredExecutions.slice(0, limit);
  }

  /**
   * Create template
   */
  createTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>): string {
    const newTemplate: ReportTemplate = {
      ...template,
      id: this.generateTemplateId(),
      created_at: new Date(),
      updated_at: new Date(),
      usage_count: 0
    };

    this.templates.push(newTemplate);
    return newTemplate.id;
  }

  /**
   * Get templates
   */
  getTemplates(): ReportTemplate[] {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): ReportTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  /**
   * Create report from template
   */
  createReportFromTemplate(templateId: string, name: string, createdBy: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const report: Omit<Report, 'id' | 'created_at' | 'updated_at' | 'generation_count'> = {
      name,
      description: template.description,
      type: template.type,
      status: 'draft',
      data_source: 'default',
      query: template.template,
      filters: {},
      format: 'pdf',
      template: templateId,
      recipients: [],
      created_by: createdBy
    };

    const reportId = this.createReport(report);
    
    // Update template usage count
    template.usage_count++;

    return reportId;
  }

  /**
   * Create dashboard
   */
  createDashboard(dashboard: Omit<ReportDashboard, 'id' | 'created_at' | 'updated_at'>): string {
    const newDashboard: ReportDashboard = {
      ...dashboard,
      id: this.generateDashboardId(),
      created_at: new Date(),
      updated_at: new Date()
    };

    this.dashboards.push(newDashboard);
    return newDashboard.id;
  }

  /**
   * Get dashboards
   */
  getDashboards(): ReportDashboard[] {
    return this.dashboards;
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(id: string): ReportDashboard | null {
    return this.dashboards.find(d => d.id === id) || null;
  }

  /**
   * Get reporting statistics
   */
  getReportingStats(): {
    total_reports: number;
    active_reports: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    total_templates: number;
    total_dashboards: number;
    avg_execution_time: number;
    success_rate: number;
  } {
    const totalReports = this.reports.length;
    const activeReports = this.reports.filter(r => r.status === 'active').length;
    const totalExecutions = this.executions.length;
    const successfulExecutions = this.executions.filter(e => e.status === 'completed').length;
    const failedExecutions = this.executions.filter(e => e.status === 'failed').length;
    const totalTemplates = this.templates.length;
    const totalDashboards = this.dashboards.length;
    
    const avgExecutionTime = this.executions.length > 0 
      ? this.executions.reduce((sum, e) => sum + (e.duration || 0), 0) / this.executions.length 
      : 0;
    
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      total_reports: totalReports,
      active_reports: activeReports,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      total_templates: totalTemplates,
      total_dashboards: totalDashboards,
      avg_execution_time: avgExecutionTime,
      success_rate: successRate
    };
  }

  /**
   * Add execution listener
   */
  addExecutionListener(listener: (execution: ReportExecution) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove execution listener
   */
  removeExecutionListener(listener: (execution: ReportExecution) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
   * Generate dashboard ID
   */
  private generateDashboardId(): string {
    return `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old executions
   */
  clearOldExecutions(olderThanDays: number = 90): number {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialLength = this.executions.length;
    
    this.executions = this.executions.filter(e => e.started_at > cutoff);
    
    return initialLength - this.executions.length;
  }

  /**
   * Get reporting health
   */
  getReportingHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    const stats = this.getReportingStats();
    
    // Check success rate
    if (stats.success_rate < 90) {
      issues.push('Low report success rate');
      recommendations.push('Investigate and fix failing reports');
    }

    // Check execution time
    if (stats.avg_execution_time > 30000) { // 30 seconds
      issues.push('Slow report execution');
      recommendations.push('Optimize report queries and data sources');
    }

    // Check failed executions
    if (stats.failed_executions > 10) {
      issues.push('High number of failed executions');
      recommendations.push('Review error logs and fix issues');
    }

    // Check active reports
    if (stats.active_reports < stats.total_reports * 0.5) {
      issues.push('Low number of active reports');
      recommendations.push('Review and activate useful reports');
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
export const enterpriseReportingService = new EnterpriseReportingService();

export default enterpriseReportingService;
