/**
 * Core Types
 * Temel tipler
 */

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

export interface ErrorResponse {
  message: string;
  status: number;
  code: string;
  details: any;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface NotificationOptions {
  duration?: number;
  position?: string;
  style?: React.CSSProperties;
  className?: string;
  id?: string;
  icon?: string;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category: string;
  message: string;
  metadata?: any;
  timestamp: string;
  source?: string;
  stackTrace?: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  requestCount: number;
  errorRate: number;
}

export interface ValidationRule {
  type: string;
  message: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export interface EventSubscription {
  id: string;
  event: string;
  handler: (data: any) => void;
  once?: boolean;
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  metadata?: any;
}
