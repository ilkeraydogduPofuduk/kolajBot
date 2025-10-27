// @ts-nocheck
/**
 * useEnterpriseQuery Hook
 * Custom hook for enterprise query management with caching and optimization
 */

import { useState, useEffect, useCallback } from 'react';
import { enterpriseQueryService } from '../services/enterpriseQueryService';
import { QueryOptions } from '../types/enterprise';

interface UseEnterpriseQueryOptions extends QueryOptions {
  enabled?: boolean;
  ttl?: number;
  refetchOnMount?: boolean;
}

interface UseEnterpriseQueryReturn<T> {
  data: T[] | null;
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  isLoading: boolean;
  hasError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

export const useEnterpriseQuery = <T = any>(
  endpoint: string,
  options: UseEnterpriseQueryOptions = {}
): UseEnterpriseQueryReturn<T> => {
  const {
    enabled = true,
    ttl,
    refetchOnMount = true,
    ...queryOptions
  } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [per_page, setPerPage] = useState(20);
  const [total_pages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Execute query
  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const result = await enterpriseQueryService.executeQuery<T>(
        endpoint,
        queryOptions,
        ttl
      );

      setData(result.data);
      setTotal(result.total);
      setPage(result.page);
      setPerPage(result.per_page);
      setTotalPages(result.total_pages);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setHasError(true);
      console.error('Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, enabled, ttl, JSON.stringify(queryOptions)]);

  // Initial load
  useEffect(() => {
    if (refetchOnMount) {
      executeQuery();
    }
  }, [executeQuery, refetchOnMount]);

  // Refetch function
  const refetch = useCallback(async () => {
    await executeQuery();
  }, [executeQuery]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    enterpriseQueryService.invalidateCache(endpoint);
  }, [endpoint]);

  return {
    data,
    total,
    page,
    per_page,
    total_pages,
    isLoading,
    hasError,
    error,
    refetch,
    invalidateCache
  };
};

// Specialized hooks for common endpoints
export const useProducts = (options: UseEnterpriseQueryOptions = {}) => {
  return useEnterpriseQuery('/api/products', options);
};

export const useTemplates = (options: UseEnterpriseQueryOptions = {}) => {
  return useEnterpriseQuery('/api/templates', options);
};

export const useBrands = (options: UseEnterpriseQueryOptions = {}) => {
  return useEnterpriseQuery('/api/brands', options);
};

export const useUsers = (options: UseEnterpriseQueryOptions = {}) => {
  return useEnterpriseQuery('/api/users', options);
};

export default useEnterpriseQuery;
