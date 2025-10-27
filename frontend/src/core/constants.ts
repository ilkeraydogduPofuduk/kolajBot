/**
 * Core Constants
 * Temel sabitler
 */

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

export const LOG_CATEGORIES = {
  SYSTEM: 'system',
  USER: 'user',
  API: 'api',
  DATABASE: 'database',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  TEMPLATE: 'template',
  UPLOAD: 'upload',
  SOCIAL_MEDIA: 'social_media',
  TELEGRAM: 'telegram'
} as const;

export const API_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
} as const;

export const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENT: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  SPREADSHEET: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  PRESENTATION: ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
} as const;

export const NOTIFICATION_DEFAULTS = {
  DURATION: 5000,
  POSITION: 'top-right'
} as const;

export const THEME_COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#64748b',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4'
} as const;

export const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: 1000, // ms
  MEMORY_USAGE: 100, // MB
  CPU_USAGE: 80, // %
  ERROR_RATE: 0.05 // 5%
} as const;

export const CACHE_DEFAULTS = {
  TTL: 300000, // 5 minutes
  MAX_SIZE: 1000,
  MAX_MEMORY_MB: 100
} as const;

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  PRODUCT_CODE: /^[A-Z0-9]{2,}-[A-Z0-9]{2,}$/,
  COLOR_CODE: /^[A-Z0-9]{2,}$/
} as const;

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'Bu alan zorunludur',
  INVALID_EMAIL: 'Geçerli bir e-posta adresi girin',
  INVALID_PHONE: 'Geçerli bir telefon numarası girin',
  INVALID_URL: 'Geçerli bir URL girin',
  FILE_TOO_LARGE: 'Dosya boyutu çok büyük',
  INVALID_FILE_TYPE: 'Geçersiz dosya türü',
  NETWORK_ERROR: 'Ağ bağlantısı hatası',
  SERVER_ERROR: 'Sunucu hatası',
  UNAUTHORIZED: 'Yetkisiz erişim',
  FORBIDDEN: 'Erişim reddedildi',
  NOT_FOUND: 'Kaynak bulunamadı',
  VALIDATION_ERROR: 'Doğrulama hatası',
  UNKNOWN_ERROR: 'Bilinmeyen hata'
} as const;

export const SUCCESS_MESSAGES = {
  SAVED: 'Başarıyla kaydedildi',
  UPDATED: 'Başarıyla güncellendi',
  DELETED: 'Başarıyla silindi',
  CREATED: 'Başarıyla oluşturuldu',
  UPLOADED: 'Başarıyla yüklendi',
  SENT: 'Başarıyla gönderildi',
  APPROVED: 'Başarıyla onaylandı',
  REJECTED: 'Başarıyla reddedildi'
} as const;