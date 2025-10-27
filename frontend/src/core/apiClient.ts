/**
 * Merkezi API Client Sistemi
 * Tüm API çağrıları tek yerden yönetilir
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { configManager } from './config';
import { handleError } from './errorHandler';
import { logger } from './logger';
import { cacheManager } from './cacheManager';

export interface APIRequestConfig extends AxiosRequestConfig {
  useCache?: boolean;
  cacheTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface APIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: AxiosRequestConfig;
}

export interface APIError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

class APIClient {
  private instance: AxiosInstance;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private retryQueue: Map<string, number> = new Map();

  constructor() {
    const config = configManager.getConfig();
    
    this.instance = axios.create({
      baseURL: config.app.backendUrl,
      timeout: 120000,  // 2 minutes for large uploads
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config) => {
        // Add request ID
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        // Add timestamp
        config.headers['X-Request-Time'] = Date.now().toString();
        
        // Log request
        logger.info('API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          headers: config.headers,
        });

        return config;
      },
      (error) => {
        logger.error('API Request Error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        // Log response
        logger.info('API Response', {
          status: response.status,
          statusText: response.statusText,
          url: response.config.url,
          duration: Date.now() - parseInt(response.config.headers['X-Request-Time'] || '0'),
        });

        return response;
      },
      (error) => {
        // Log error
        logger.error('API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
        });

        // Handle error
        const apiError = this.handleError(error);
        return Promise.reject(apiError);
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error status
      return {
        message: (error.response.data as any)?.message || error.message,
        status: error.response.status,
        code: (error.response.data as any)?.error_code || 'SERVER_ERROR',
        details: (error.response.data as any)?.details || {},
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error - no response received',
        code: 'NETWORK_ERROR',
        details: { originalError: error.message },
      };
    } else {
      // Something else happened
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        details: { originalError: error.message },
      };
    }
  }

  private getCacheKey(config: APIRequestConfig): string {
    const { method = 'GET', url, params, data } = config;
    return `api_${method}_${url}_${JSON.stringify(params)}_${JSON.stringify(data)}`;
  }

  private async executeRequest<T>(
    config: APIRequestConfig,
    requestId: string
  ): Promise<APIResponse<T>> {
    try {
      const response = await this.instance.request<T>(config);
      return response;
    } catch (error) {
      throw error;
    } finally {
      // Remove from queue
      this.requestQueue.delete(requestId);
    }
  }

  private async retryRequest<T>(
    config: APIRequestConfig,
    requestId: string,
    attempt: number = 1
  ): Promise<APIResponse<T>> {
    const maxAttempts = config.retryAttempts || 3;
    const delay = config.retryDelay || 1000;

    if (attempt > maxAttempts) {
      throw new Error(`Max retry attempts (${maxAttempts}) exceeded`);
    }

    try {
      return await this.executeRequest<T>(config, requestId);
    } catch (error) {
      if (attempt < maxAttempts) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        
        // Retry
        return this.retryRequest<T>(config, requestId, attempt + 1);
      } else {
        throw error;
      }
    }
  }

  public async get<T = any>(
    url: string,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    const cacheKey = this.getCacheKey({ ...config, method: 'GET', url });

    // Check cache
    if (config.useCache !== false) {
      const cached = cacheManager.get(cacheKey);
      if (cached) {
        logger.info('API Cache Hit', { url, cacheKey });
        return cached as APIResponse<T>;
      }
    }

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      logger.info('API Request Queued', { url, cacheKey });
      return this.requestQueue.get(cacheKey)!;
    }

    // Create request promise
    const requestPromise = this.retryRequest<T>(
      { ...config, method: 'GET', url },
      requestId
    );

    // Add to queue
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache response
      if (config.useCache !== false) {
        const ttl = config.cacheTimeout || 300000; // 5 minutes default
        cacheManager.set(cacheKey, response, ttl);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    
    return this.retryRequest<T>(
      { ...config, method: 'POST', url, data },
      requestId
    );
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    
    return this.retryRequest<T>(
      { ...config, method: 'PUT', url, data },
      requestId
    );
  }

  public async delete<T = any>(
    url: string,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    
    return this.retryRequest<T>(
      { ...config, method: 'DELETE', url },
      requestId
    );
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    
    return this.retryRequest<T>(
      { ...config, method: 'PATCH', url, data },
      requestId
    );
  }

  public async upload<T = any>(
    url: string,
    formData: FormData,
    config: APIRequestConfig = {}
  ): Promise<APIResponse<T>> {
    const requestId = this.generateRequestId();
    
    return this.retryRequest<T>(
      {
        ...config,
        method: 'POST',
        url,
        data: formData,
        headers: {
          ...config.headers,
          'Content-Type': 'multipart/form-data',
        },
      },
      requestId
    );
  }

  public setAuthToken(token: string): void {
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  public removeAuthToken(): void {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  public setBaseURL(baseURL: string): void {
    this.instance.defaults.baseURL = baseURL;
  }

  public getBaseURL(): string {
    return this.instance.defaults.baseURL || '';
  }

  public setTimeout(timeout: number): void {
    this.instance.defaults.timeout = timeout;
  }

  public getInstance(): AxiosInstance {
    return this.instance;
  }

  public clearCache(): void {
    cacheManager.clear();
  }

  public getRequestQueue(): Map<string, Promise<any>> {
    return this.requestQueue;
  }

  public getRetryQueue(): Map<string, number> {
    return this.retryQueue;
  }
}

// Singleton instance
export const apiClient = new APIClient();

// Export commonly used methods
export const { get, post, put, delete: del, patch, upload } = apiClient;

export default apiClient;
