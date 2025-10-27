/**
 * Enterprise Types
 * Merkezi tip tanımları - tüm enterprise modülleri için
 */

// Analytics Types
export interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: string;
  data: any;
  category: string;
  action: string;
  value?: number;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  category: string;
  unit: string;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: string;
  data: any;
  created_at: string;
  metrics?: any;
  top_pages?: any[];
  performance?: any;
}

export interface AnalyticsInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  actions?: any[];
  severity?: string;
  timestamp?: string;
}

// Integration Types
export interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  config: any;
  health?: any;
  endpoint?: string;
  metrics?: any;
}

export interface IntegrationEvent {
  id: string;
  integrationId: string;
  type: string;
  data: any;
  timestamp: string;
  duration?: number;
  error_message?: string;
  status?: string;
}

export interface IntegrationHealth {
  status: string;
  lastCheck: string;
  issues: string[];
  overall_status?: string;
  total_integrations?: number;
  active_integrations?: number;
  failed_integrations?: number;
  avg_response_time?: number;
  error_rate?: number;
  uptime?: number;
  last_check?: Date;
}

// Logging Types
export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: any;
  category?: string;
  user_id?: string;
  session_id?: string;
  duration?: number;
  stack_trace?: string;
}

export interface LogFilter {
  level?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}

export interface LogAlert {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  type?: string;
  message?: string;
  severity?: string;
  timestamp?: string;
  affected_users?: number;
  affected_sessions?: number;
}

export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<string, number>;
  logsBySource: Record<string, number>;
  total_logs?: number;
  error_rate?: number;
  avg_response_time?: number;
  unique_users?: number;
  by_level?: Record<string, number>;
  by_source?: Record<string, number>;
  by_category?: Record<string, number>;
}

// Monitoring Types
export interface MonitoringMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  category?: string;
  metadata?: any;
  tags?: string[];
}

export interface MonitoringAlert {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  title?: string;
  severity?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  acknowledged_by?: string;
  resolved_by?: string;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  widgets: any[];
  description?: string;
  layout?: any;
  tags?: string[];
  created_at?: string;
  is_public?: boolean;
}

export interface MonitoringService {
  id: string;
  name: string;
  status: string;
  type?: string;
  metrics?: any;
  alerts?: any[];
  health_check?: any;
  uptime?: number;
  response_time?: number;
  error_rate?: number;
  last_check?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'loading' | 'success' | 'error' | 'warning' | 'info' | string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: any[];
  metadata?: any;
}

export interface NotificationSettings {
  categories: {
    system: boolean;
    security: boolean;
    performance: boolean;
    user: boolean;
    business: boolean;
  };
  frequency: string;
  channels: string[];
  enabled?: boolean;
  sound?: boolean;
  desktop?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  success_rate?: number;
  read_rate?: number;
  response_rate?: number;
  by_type?: Record<string, number>;
  by_category?: Record<string, number>;
}

// Performance Types
export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorRate: number;
  cpu?: number;
  memory?: number;
  disk?: number;
  network?: number;
  database?: number;
  cache?: number;
}

export interface PerformanceAlert {
  id: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
}

// Reporting Types
export interface Report {
  id: string;
  name: string;
  type: 'security' | 'custom' | 'performance' | 'business' | 'analytics' | string;
  status: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  generation_count?: number;
  format?: string;
  filters?: any;
  created_by?: string;
  is_public?: boolean;
  tags?: string[];
}

export interface ReportExecution {
  id: string;
  reportId: string;
  status: string;
  startedAt: string;
  report_id?: string;
  started_at?: string;
  triggered_type?: string;
  completed_at?: string;
  execution_time?: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  fields?: any;
  type?: string;
  usage_count?: number;
  template?: any;
  tags?: string[];
  created_by?: string;
  is_public?: boolean;
}

export interface ReportDashboard {
  id: string;
  name: string;
  widgets: any[];
  description?: string;
  layout?: any;
  reports?: any[];
  tags?: string[];
  created_by?: string;
  is_public?: boolean;
}

// Security Types
export interface SecurityEvent {
  id: string;
  type: string;
  severity: string;
  timestamp: string;
  message?: string;
  ip_address?: string;
}

export interface SecurityAlert {
  id: string;
  name: string;
  condition: string;
  enabled: boolean;
  type?: string;
  message?: string;
  timestamp?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  total_events?: number;
  events_by_type?: Record<string, number>;
  events_by_severity?: Record<string, number>;
  blocked_attempts?: number;
  suspicious_activities?: number;
  last_24h_events?: number;
  top_threats?: any[];
}

// System Types
export interface SystemInfo {
  version: string;
  uptime: number;
  platform: string;
  environment?: string;
  arch?: string;
}

export interface SystemHealth {
  status: string;
  checks: any[];
  score?: number;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  response_time?: number;
  timestamp?: string;
}

export interface SystemAlert {
  id: string;
  type: string;
  message: string;
  severity: string;
  title?: string;
  timestamp?: string;
}

// Workflow Types
export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'draft' | 'archived' | string;
  steps: any[];
  version?: string;
  description?: string;
  execution_count?: number;
  success_rate?: number;
  last_executed?: string;
  created_by?: string;
  variables?: any;
  triggers?: any;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  workflow_id?: string;
  started_at?: string;
  duration?: number;
  progress?: number;
  error_message?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  steps?: any[];
  usage_count?: number;
  rating?: number;
  tags?: string[];
  variables?: any;
}

// Query Types
export interface QueryOptions {
  cache?: boolean;
  timeout?: number;
  retries?: number;
}

// Upload Types
export interface UploadOptions {
  chunkSize?: number;
  maxRetries?: number;
  timeout?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
}

// Status Types
export type ReportExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  permissions?: string[];
  brand_id?: number;
  brand_ids?: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

