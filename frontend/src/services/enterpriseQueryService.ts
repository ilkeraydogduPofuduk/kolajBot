/**
 * Enterprise Query Service
 * High-performance frontend query management with caching and optimization
 */

interface QueryOptions {
  page?: number;
  per_page?: number;
  search?: string;
  filters?: Record<string, any>;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

interface QueryResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

class EnterpriseQueryService {
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Execute optimized query with caching
   */
  async executeQuery<T>(
    endpoint: string,
    options: QueryOptions = {},
    ttl: number = this.DEFAULT_TTL
  ): Promise<QueryResult<T>> {
    const cacheKey = this.generateCacheKey(endpoint, options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query parameters
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.search) params.append('search', options.search);
    if (options.sort_by) params.append('sort_by', options.sort_by);
    if (options.sort_direction) params.append('sort_direction', options.sort_direction);
    
    // Add filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8005';
      const url = `${apiUrl}${endpoint}?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: QueryResult<T> = await response.json();
      
      // Cache result
      this.setCache(cacheKey, result, ttl);
      
      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Get products with optimization
   */
  async getProducts(options: QueryOptions = {}): Promise<QueryResult<any>> {
    return this.executeQuery('/api/products', options, 2 * 60 * 1000); // 2 minutes cache
  }

  /**
   * Get templates with optimization
   */
  async getTemplates(options: QueryOptions = {}): Promise<QueryResult<any>> {
    return this.executeQuery('/api/templates', options, 5 * 60 * 1000); // 5 minutes cache
  }

  /**
   * Get brands with optimization
   */
  async getBrands(options: QueryOptions = {}): Promise<QueryResult<any>> {
    return this.executeQuery('/api/brands', options, 10 * 60 * 1000); // 10 minutes cache
  }

  /**
   * Get users with optimization
   */
  async getUsers(options: QueryOptions = {}): Promise<QueryResult<any>> {
    return this.executeQuery('/api/users', options, 2 * 60 * 1000); // 2 minutes cache
  }

  /**
   * Search with optimization
   */
  async search(
    query: string,
    type: 'products' | 'templates' | 'brands' | 'users' = 'products',
    options: QueryOptions = {}
  ): Promise<QueryResult<any>> {
    const searchOptions = {
      ...options,
      search: query
    };

    switch (type) {
      case 'products':
        return this.getProducts(searchOptions);
      case 'templates':
        return this.getTemplates(searchOptions);
      case 'brands':
        return this.getBrands(searchOptions);
      case 'users':
        return this.getUsers(searchOptions);
      default:
        throw new Error(`Unknown search type: ${type}`);
    }
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(endpoint: string, options: QueryOptions): string {
    const sortedOptions = Object.keys(options)
      .sort()
      .reduce((result, key) => {
        result[key] = options[key as keyof QueryOptions];
        return result;
      }, {} as any);

    return `${endpoint}:${JSON.stringify(sortedOptions)}`;
  }

  /**
   * Get from cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.queryCache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any, ttl: number): void {
    // Clean up old entries if cache is full
    if (this.queryCache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Invalidate cache for specific endpoint
   */
  invalidateCache(endpoint: string): void {
    for (const [key] of Array.from(this.queryCache.entries())) {
      if (key.startsWith(endpoint)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const entries = Array.from(this.queryCache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      ttl: value.ttl
    }));

    return {
      size: this.queryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      entries
    };
  }

  /**
   * Preload data for better performance
   */
  async preloadData(endpoints: string[], options: QueryOptions = {}): Promise<void> {
    const promises = endpoints.map(endpoint => 
      this.executeQuery(endpoint, options, 10 * 60 * 1000) // 10 minutes cache
    );

    try {
      await Promise.all(promises);
    } catch (error) {
      console.error('Failed to preload data:', error);
    }
  }
}

// Export singleton instance
export const enterpriseQueryService = new EnterpriseQueryService();

export default enterpriseQueryService;
