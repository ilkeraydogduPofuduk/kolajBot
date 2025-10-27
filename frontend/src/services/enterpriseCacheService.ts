/**
 * Enterprise Cache Service
 * High-performance caching with TTL and memory management
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  evictions: number;
}

class EnterpriseCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private MAX_SIZE = 1000;
  private MAX_MEMORY_MB = 100;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  /**
   * Set cache entry
   */
  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    // Check memory limit
    if (this.getMemoryUsage() > this.MAX_MEMORY_MB) {
      this.evictOldest();
    }

    // Check size limit
    if (this.cache.size >= this.MAX_SIZE) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const missRate = total > 0 ? (this.stats.misses / total) * 100 : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.getMemoryUsage(),
      evictions: this.stats.evictions
    };
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 100; // Overhead for entry object
    }
    
    return totalSize / (1024 * 1024); // Convert to MB
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict expired entries
   */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    return evicted;
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache values
   */
  values(): any[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get cache entries
   */
  entries(): Array<[string, any]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }

  /**
   * For each cache entry
   */
  forEach(callback: (value: any, key: string) => void): void {
    for (const [key, entry] of Array.from(this.cache.entries())) {
      callback(entry.value, key);
    }
  }

  /**
   * Map cache entries
   */
  map<T>(callback: (value: any, key: string) => T): T[] {
    const result: T[] = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      result.push(callback(entry.value, key));
    }
    
    return result;
  }

  /**
   * Filter cache entries
   */
  filter(callback: (value: any, key: string) => boolean): Array<[string, any]> {
    const result: Array<[string, any]> = [];
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (callback(entry.value, key)) {
        result.push([key, entry.value]);
      }
    }
    
    return result;
  }

  /**
   * Reduce cache entries
   */
  reduce<T>(callback: (accumulator: T, value: any, key: string) => T, initialValue: T): T {
    let accumulator = initialValue;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      accumulator = callback(accumulator, entry.value, key);
    }
    
    return accumulator;
  }

  /**
   * Get cache info
   */
  getInfo(): {
    size: number;
    maxSize: number;
    memoryUsage: number;
    maxMemory: number;
    hitRate: number;
    ttl: number;
  } {
    const stats = this.getStats();
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_SIZE,
      memoryUsage: stats.memoryUsage,
      maxMemory: this.MAX_MEMORY_MB,
      hitRate: stats.hitRate,
      ttl: this.DEFAULT_TTL
    };
  }

  /**
   * Set cache configuration
   */
  configure(options: {
    maxSize?: number;
    maxMemory?: number;
    defaultTtl?: number;
  }): void {
    if (options.maxSize !== undefined) {
      this.MAX_SIZE = options.maxSize;
    }
    
    if (options.maxMemory !== undefined) {
      this.MAX_MEMORY_MB = options.maxMemory;
    }
    
    if (options.defaultTtl !== undefined) {
      this.DEFAULT_TTL = options.defaultTtl;
    }
  }

  /**
   * Warm up cache
   */
  async warmUp<T>(
    keys: string[],
    loader: (key: string) => Promise<T>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const value = await loader(key);
          this.set(key, value, ttl);
        } catch (error) {
          console.error(`Failed to warm up cache for key: ${key}`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of Array.from(this.cache.keys())) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  /**
   * Get cache health
   */
  getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check hit rate
    if (stats.hitRate < 70) {
      issues.push('Low cache hit rate');
      recommendations.push('Consider increasing cache size or TTL');
    }

    // Check memory usage
    if (stats.memoryUsage > this.MAX_MEMORY_MB * 0.8) {
      issues.push('High memory usage');
      recommendations.push('Consider reducing cache size or TTL');
    }

    // Check evictions
    if (stats.evictions > 100) {
      issues.push('High eviction rate');
      recommendations.push('Consider increasing cache size');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (issues.length > 0) {
      status = issues.length > 2 ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      recommendations
    };
  }
}

// Export singleton instance
export const enterpriseCacheService = new EnterpriseCacheService();

export default enterpriseCacheService;
