/**
 * Merkezi Frontend Konfigürasyon Sistemi
 * Tüm frontend ayarları tek yerden yönetilir
 */

export interface DatabaseConfig {
  url: string;
  poolSize: number;
  maxOverflow: number;
  poolTimeout: number;
  poolRecycle: number;
  echo: boolean;
}

export interface SecurityConfig {
  secretKey: string;
  algorithm: string;
  accessTokenExpireMinutes: number;
  refreshTokenExpireDays: number;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
}

export interface RedisConfig {
  url: string;
  enabled: boolean;
  timeout: number;
}

export interface EmailConfig {
  smtpServer?: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
  useSSL: boolean;
  useTLS: boolean;
}

export interface OCRConfig {
  googleAiApiKey?: string;
  parallelWorkers: number;
  timeout: number;
  retryCount: number;
}

export interface UploadConfig {
  maxFileCount: number;
  maxFileSizeMB: number;
  allowedExtensions: string[];
  totalUploadSizeMB: number;
  storagePath: string;
}

export interface TelegramConfig {
  botToken?: string;
  chatId?: string;
}

export interface AppConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  backendUrl: string;
  frontendUrl: string;
}

export interface UIConfig {
  theme: 'light' | 'dark' | 'system';
  language: string;
  dateFormat: string;
  timeFormat: string;
  timezone: string;
}

export interface FeatureConfig {
  socialMedia: boolean;
  templates: boolean;
  aiGeneration: boolean;
  multiLanguage: boolean;
  analytics: boolean;
  reporting: boolean;
  monitoring: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  maxSize: number; // MB
  strategy: 'lru' | 'fifo' | 'lfu';
}

export interface PaginationConfig {
  defaultPageSize: number;
  pageSizeOptions: number[];
  maxPageSize: number;
}

export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  maxConcurrentRequests: number;
}

export interface EnterpriseConfig {
  database: DatabaseConfig;
  security: SecurityConfig;
  cors: CORSConfig;
  redis: RedisConfig;
  email: EmailConfig;
  ocr: OCRConfig;
  upload: UploadConfig;
  telegram: TelegramConfig;
  app: AppConfig;
  ui: UIConfig;
  features: FeatureConfig;
  cache: CacheConfig;
  pagination: PaginationConfig;
  api: APIConfig;
}

class ConfigManager {
  private config: EnterpriseConfig;
  private listeners: Array<(config: EnterpriseConfig) => void> = [];

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): EnterpriseConfig {
    return {
      database: {
        url: process.env.REACT_APP_DATABASE_URL || 'mysql+pymysql://root:@localhost:3306/aibrands',
        poolSize: parseInt(process.env.REACT_APP_DB_POOL_SIZE || '20'),
        maxOverflow: parseInt(process.env.REACT_APP_DB_MAX_OVERFLOW || '30'),
        poolTimeout: parseInt(process.env.REACT_APP_DB_POOL_TIMEOUT || '30'),
        poolRecycle: parseInt(process.env.REACT_APP_DB_POOL_RECYCLE || '3600'),
        echo: process.env.REACT_APP_DB_ECHO === 'true'
      },
      security: {
        secretKey: process.env.REACT_APP_SECRET_KEY || 'your-secret-key-change-in-production',
        algorithm: process.env.REACT_APP_JWT_ALGORITHM || 'HS256',
        accessTokenExpireMinutes: parseInt(process.env.REACT_APP_ACCESS_TOKEN_EXPIRE_MINUTES || '15'),
        refreshTokenExpireDays: parseInt(process.env.REACT_APP_REFRESH_TOKEN_EXPIRE_DAYS || '7'),
        bcryptRounds: parseInt(process.env.REACT_APP_BCRYPT_ROUNDS || '12'),
        maxLoginAttempts: parseInt(process.env.REACT_APP_MAX_LOGIN_ATTEMPTS || '5'),
        lockoutDurationMinutes: parseInt(process.env.REACT_APP_LOCKOUT_DURATION_MINUTES || '15')
      },
      cors: {
        allowedOrigins: (process.env.REACT_APP_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003').split(','),
        allowedMethods: (process.env.REACT_APP_ALLOWED_METHODS || 'GET,POST,PUT,DELETE,OPTIONS').split(','),
        allowedHeaders: (process.env.REACT_APP_ALLOWED_HEADERS || '*').split(',')
      },
      redis: {
        url: process.env.REACT_APP_REDIS_URL || 'redis://localhost:6379',
        enabled: process.env.REACT_APP_REDIS_ENABLED !== 'false',
        timeout: parseInt(process.env.REACT_APP_REDIS_TIMEOUT || '5')
      },
      email: {
        smtpServer: process.env.REACT_APP_SMTP_SERVER,
        smtpPort: parseInt(process.env.REACT_APP_SMTP_PORT || '587'),
        smtpUsername: process.env.REACT_APP_SMTP_USERNAME,
        smtpPassword: process.env.REACT_APP_SMTP_PASSWORD,
        fromEmail: process.env.REACT_APP_FROM_EMAIL || 'noreply@aibrands.com',
        fromName: process.env.REACT_APP_FROM_NAME || 'AI Brands',
        useSSL: process.env.REACT_APP_SMTP_USE_SSL === 'true',
        useTLS: process.env.REACT_APP_SMTP_USE_TLS !== 'false'
      },
      ocr: {
        googleAiApiKey: process.env.REACT_APP_GOOGLE_AI_API_KEY,
        parallelWorkers: parseInt(process.env.REACT_APP_OCR_PARALLEL_WORKERS || '10'),
        timeout: parseInt(process.env.REACT_APP_OCR_TIMEOUT || '30'),
        retryCount: parseInt(process.env.REACT_APP_OCR_RETRY_COUNT || '3')
      },
      upload: {
        maxFileCount: parseInt(process.env.REACT_APP_MAX_FILE_COUNT || '500'),
        maxFileSizeMB: parseInt(process.env.REACT_APP_MAX_FILE_SIZE_MB || '10'),
        allowedExtensions: (process.env.REACT_APP_ALLOWED_EXTENSIONS || 'jpg,jpeg,png,webp').split(','),
        totalUploadSizeMB: parseInt(process.env.REACT_APP_TOTAL_UPLOAD_SIZE_MB || '500'),
        storagePath: process.env.REACT_APP_STORAGE_PATH || 'uploads'
      },
      telegram: {
        botToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN,
        chatId: process.env.REACT_APP_TELEGRAM_CHAT_ID
      },
      app: {
        name: process.env.REACT_APP_NAME || 'AI Brands',
        version: process.env.REACT_APP_VERSION || '2.0.0',
        description: process.env.REACT_APP_DESCRIPTION || 'AI Destekli Marka Yönetim Platformu',
        author: process.env.REACT_APP_AUTHOR || 'AI Brands Team',
        environment: (process.env.REACT_APP_ENVIRONMENT || 'development') as 'development' | 'staging' | 'production',
        debug: process.env.REACT_APP_DEBUG === 'true',
        backendUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        frontendUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'
      },
      ui: {
        theme: (process.env.REACT_APP_THEME || 'light') as 'light' | 'dark' | 'system',
        language: process.env.REACT_APP_LANGUAGE || 'tr',
        dateFormat: process.env.REACT_APP_DATE_FORMAT || 'DD/MM/YYYY',
        timeFormat: process.env.REACT_APP_TIME_FORMAT || 'HH:mm',
        timezone: process.env.REACT_APP_TIMEZONE || 'Europe/Istanbul'
      },
      features: {
        socialMedia: process.env.REACT_APP_FEATURE_SOCIAL_MEDIA !== 'false',
        templates: process.env.REACT_APP_FEATURE_TEMPLATES !== 'false',
        aiGeneration: process.env.REACT_APP_FEATURE_AI_GENERATION !== 'false',
        multiLanguage: process.env.REACT_APP_FEATURE_MULTI_LANGUAGE === 'true',
        analytics: process.env.REACT_APP_FEATURE_ANALYTICS !== 'false',
        reporting: process.env.REACT_APP_FEATURE_REPORTING !== 'false',
        monitoring: process.env.REACT_APP_FEATURE_MONITORING !== 'false'
      },
      cache: {
        enabled: process.env.REACT_APP_CACHE_ENABLED !== 'false',
        ttl: parseInt(process.env.REACT_APP_CACHE_TTL || '300'),
        maxSize: parseInt(process.env.REACT_APP_CACHE_MAX_SIZE || '50'),
        strategy: (process.env.REACT_APP_CACHE_STRATEGY || 'lru') as 'lru' | 'fifo' | 'lfu'
      },
      pagination: {
        defaultPageSize: parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE || '20'),
        pageSizeOptions: (process.env.REACT_APP_PAGE_SIZE_OPTIONS || '10,20,50,100').split(',').map(Number),
        maxPageSize: parseInt(process.env.REACT_APP_MAX_PAGE_SIZE || '1000')
      },
      api: {
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.REACT_APP_API_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.REACT_APP_API_RETRY_DELAY || '1000'),
        maxConcurrentRequests: parseInt(process.env.REACT_APP_API_MAX_CONCURRENT || '10')
      }
    };
  }

  private validateConfig(): void {
    // Validate required fields
    if (!this.config.app.name) {
      throw new Error('App name is required');
    }
    if (!this.config.api.baseURL) {
      throw new Error('API base URL is required');
    }
    if (!this.config.app.version) {
      throw new Error('App version is required');
    }

    // Validate numeric fields
    if (this.config.upload.maxFileSizeMB <= 0) {
      throw new Error('Max file size must be positive');
    }
    if (this.config.upload.maxFileCount <= 0) {
      throw new Error('Max file count must be positive');
    }
    if (this.config.pagination.defaultPageSize <= 0) {
      throw new Error('Default page size must be positive');
    }
  }

  public getConfig(): EnterpriseConfig {
    return { ...this.config };
  }

  public get<K extends keyof EnterpriseConfig>(key: K): EnterpriseConfig[K] {
    return this.config[key];
  }

  public updateConfig(updates: Partial<EnterpriseConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
    this.notifyListeners();
  }

  public subscribe(listener: (config: EnterpriseConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  public isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  public isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }

  public getAppInfo() {
    return {
      name: this.config.app.name,
      version: this.config.app.version,
      description: this.config.app.description,
      author: this.config.app.author,
      environment: this.config.app.environment
    };
  }

  public getUploadLimits() {
    return {
      maxFileCount: this.config.upload.maxFileCount,
      maxFileSizeMB: this.config.upload.maxFileSizeMB,
      allowedExtensions: this.config.upload.allowedExtensions,
      totalUploadSizeMB: this.config.upload.totalUploadSizeMB,
      storagePath: this.config.upload.storagePath
    };
  }

  public getOCRConfig() {
    return {
      apiKey: this.config.ocr.googleAiApiKey,
      parallelWorkers: this.config.ocr.parallelWorkers,
      timeout: this.config.ocr.timeout,
      retryCount: this.config.ocr.retryCount
    };
  }
}

// Singleton instance
export const configManager = new ConfigManager();

// Export commonly used configs
export const databaseConfig = configManager.get('database');
export const securityConfig = configManager.get('security');
export const corsConfig = configManager.get('cors');
export const redisConfig = configManager.get('redis');
export const emailConfig = configManager.get('email');
export const ocrConfig = configManager.get('ocr');
export const uploadConfig = configManager.get('upload');
export const telegramConfig = configManager.get('telegram');
export const appConfig = configManager.get('app');
export const uiConfig = configManager.get('ui');
export const featuresConfig = configManager.get('features');
export const cacheConfig = configManager.get('cache');
export const paginationConfig = configManager.get('pagination');
export const apiConfig = configManager.get('api');

// Export the main config
export const config = configManager.getConfig();

export default configManager;
