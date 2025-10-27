/**
 * Constants
 * Sabitler
 */

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
} as const;

export const STATUS_TEXTS = {
  active: 'Aktif',
  inactive: 'Pasif',
  pending: 'Beklemede',
  approved: 'Onaylandı',
  rejected: 'Reddedildi'
} as const;

export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  BRANDS: '/brands',
  PRODUCTS: '/products',
  TEMPLATES: '/templates',
  UPLOADS: '/uploads',
  SOCIAL_MEDIA: '/social-media',
  TELEGRAM: '/telegram',
  AUDIT_LOGS: '/audit-logs',
  EMPLOYEE_REQUESTS: '/employee-requests',
  CATEGORIES: '/categories',
  BRANCHES: '/branches',
  ROLES: '/roles',
  SETTINGS: '/settings',
  SYSTEM: '/system'
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BRANDS: '/brands',
  PRODUCTS: '/products',
  TEMPLATES: '/templates',
  UPLOADS: '/uploads',
  SOCIAL_MEDIA: '/social-media',
  TELEGRAM: '/telegram',
  AUDIT_LOGS: '/audit-logs',
  EMPLOYEE_REQUESTS: '/employee-requests',
  CATEGORIES: '/categories',
  BRANCHES: '/branches',
  ROLES: '/roles',
  SETTINGS: '/settings',
  SYSTEM: '/system',
  PROFILE: '/profile'
} as const;

export const PERMISSIONS = {
  BRANDS_VIEW: 'brands:view',
  BRANDS_CREATE: 'brands:create',
  BRANDS_UPDATE: 'brands:update',
  BRANDS_DELETE: 'brands:delete',
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  TEMPLATES_VIEW: 'templates:view',
  TEMPLATES_CREATE: 'templates:create',
  TEMPLATES_UPDATE: 'templates:update',
  TEMPLATES_DELETE: 'templates:delete',
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  SYSTEM_VIEW: 'system:view',
  SYSTEM_MANAGE: 'system:manage'
} as const;

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer'
} as const;

export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PRESENTATION: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
} as const;

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
} as const;

export const THEME_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#64748b',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4'
} as const;