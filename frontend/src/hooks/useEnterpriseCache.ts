/**
 * useEnterpriseCache Hook
 * Custom hook for enterprise caching with TTL and memory management
 */

import { useState, useEffect, useCallback } from 'react';
import { enterpriseCacheService } from '../services/enterpriseCacheService';

interface UseEnterpriseCacheOptions {
  ttl?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseEnterpriseCacheReturn<T> {
  data: T | null;
  isLoading: boolean;
  hasError: boolean;
  error: string | null;
  setData: (key: string, value: T) => void;
  getData: (key: string) => T | null;
  hasData: (key: string) => boolean;
  deleteData: (key: string) => boolean;
  clearCache: () => void;
  refreshData: () => Promise<void>;
  cacheStats: {
    size: number;
    hitRate: number;
    missRate: number;
    totalHits: number;
    totalMisses: number;
    memoryUsage: number;
    evictions: number;
  };
  cacheHealth: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export const useEnterpriseCache = <T = any>(
  key: string,
  loader?: () => Promise<T>,
  options: UseEnterpriseCacheOptions = {}
): UseEnterpriseCacheReturn<T> => {
  const {
    ttl,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set data in cache
  const setData = useCallback((cacheKey: string, value: T) => {
    enterpriseCacheService.set(cacheKey, value, ttl);
    if (cacheKey === key) {
      setDataState(value);
    }
  }, [key, ttl]);

  // Get data from cache
  const getData = useCallback((cacheKey: string): T | null => {
    return enterpriseCacheService.get(cacheKey);
  }, []);

  // Check if data exists in cache
  const hasData = useCallback((cacheKey: string): boolean => {
    return enterpriseCacheService.has(cacheKey);
  }, []);

  // Delete data from cache
  const deleteData = useCallback((cacheKey: string): boolean => {
    const deleted = enterpriseCacheService.delete(cacheKey);
    if (cacheKey === key) {
      setDataState(null);
    }
    return deleted;
  }, [key]);

  // Clear all cache
  const clearCache = useCallback(() => {
    enterpriseCacheService.clear();
    setDataState(null);
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!loader) return;

    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const newData = await loader();
      enterpriseCacheService.set(key, newData, ttl);
      setDataState(newData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [key, loader, ttl]);

  // Load data initially
  useEffect(() => {
    const loadData = async () => {
      // Check cache first
      const cachedData = enterpriseCacheService.get(key);
      if (cachedData) {
        setDataState(cachedData as T);
        return;
      }

      // Load from source if loader provided
      if (loader) {
        setIsLoading(true);
        setHasError(false);
        setError(null);

        try {
          const newData = await loader();
          enterpriseCacheService.set(key, newData, ttl);
          setDataState(newData);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
          setError(errorMessage);
          setHasError(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [key, loader, ttl]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !loader) return;

    const interval = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, loader, refreshInterval, refreshData]);

  // Get cache stats
  const cacheStats = enterpriseCacheService.getStats();

  // Get cache health
  const cacheHealth = enterpriseCacheService.getHealth();

  return {
    data,
    isLoading,
    hasError,
    error,
    setData,
    getData,
    hasData,
    deleteData,
    clearCache,
    refreshData,
    cacheStats,
    cacheHealth
  };
};

export default useEnterpriseCache;
