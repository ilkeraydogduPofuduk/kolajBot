/**
 * useUrlConfig Hook
 * URL konfigürasyonunu yöneten hook
 */

import { useState, useEffect } from 'react';
import { settingsAPI } from '../api/settings';

interface UrlConfig {
  baseUrl: string;
  apiUrl: string;
  uploadUrl: string;
  imageUrl: string;
  frontendUrl: string;
}

const defaultConfig: UrlConfig = {
  baseUrl: process.env.REACT_APP_BASE_URL || 'http://localhost:8000',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  uploadUrl: process.env.REACT_APP_UPLOAD_URL || 'http://localhost:8000/uploads',
  imageUrl: process.env.REACT_APP_IMAGE_URL || 'http://localhost:8000/uploads',
  frontendUrl: process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000'
};

export const useUrlConfig = () => {
  const [config, setConfig] = useState<UrlConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUrlConfig();
  }, []);

  const loadUrlConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from settings API
      const settings = await settingsAPI.getSettings();
      
      if (settings && (settings as any).url_config) {
        const urlConfig = JSON.parse((settings as any).url_config);
        setConfig(prevConfig => ({ ...prevConfig, ...urlConfig }));
      }
      
    } catch (err) {
      console.warn('Failed to load URL config from settings, using defaults:', err);
      // Keep default config if API fails
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<UrlConfig>) => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      
      // Save to settings API
      await settingsAPI.updateSettings([
        {
          key: 'url_config',
          value: JSON.stringify(updatedConfig)
        }
      ]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update URL config');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetConfig = () => {
    setConfig(defaultConfig);
  };

  const getImageURL = (path: string): string => {
    if (!path) return '';
    
    // If path is already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Extract filename from path
    const filename = path.split('/').pop() || path;
    
    // Use API endpoint for images
    return `${config.apiUrl}/images/${filename}`;
  };

  const getUploadURL = (): string => {
    return config.uploadUrl;
  };

  const getApiURL = (endpoint: string = ''): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${config.apiUrl}/${cleanEndpoint}`;
  };

  const getBaseURL = (): string => {
    return config.baseUrl;
  };

  const getFrontendURL = (): string => {
    return config.frontendUrl;
  };

  return {
    config,
    loading,
    error,
    updateConfig,
    resetConfig,
    getImageURL,
    getUploadURL,
    getApiURL,
    getBaseURL,
    getFrontendURL,
    loadUrlConfig
  };
};
