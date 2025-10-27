/**
 * API Utility Functions
 * Centralized API client for frontend
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { configManager } from '../core/config';
import { showApiErrorOverlay, hideApiErrorOverlay } from './apiErrorOverlay';

class APIClient {
  private instance: AxiosInstance;

  constructor() {
    const config = configManager.getConfig();
    
    this.instance = axios.create({
      baseURL: config.app.backendUrl,
      timeout: 30000,
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
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor with token refresh
    this.instance.interceptors.response.use(
      (response) => {
        hideApiErrorOverlay();
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // Token refresh logic
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              // Refresh token
              const response = await axios.post(`${this.instance.defaults.baseURL}/api/auth/refresh`, {
                refresh_token: refreshToken
              });
              
              const newAccessToken = response.data.access_token;
              localStorage.setItem('access_token', newAccessToken);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.instance(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        
        // Original 401 handling (if no refresh token)
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }

        if (error.response?.status && error.response.status >= 500) {
          const detail = error.response.data?.detail;
          const message =
            typeof detail === 'string' && detail.trim().length > 0
              ? detail
              : 'Sunucu beklenmedik bir hata döndürdü. Lütfen sistem yöneticinize haber verin.';

          showApiErrorOverlay(message, () => window.location.reload());
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }
}

export default new APIClient();
