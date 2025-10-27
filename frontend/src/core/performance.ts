/**
 * Performans Optimizasyon Sistemi
 * Tüm performans iyileştirmeleri tek yerden yönetilir
 */

import { logger } from './logger';
import { eventBus } from './eventBus';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata: Record<string, any>;
  success: boolean;
  error?: string;
}

export interface PerformanceStats {
  count: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  slowCount: number;
  verySlowCount: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;
  private slowThreshold = 2000; // milliseconds
  private verySlowThreshold = 5000; // milliseconds

  recordMetric(
    name: string,
    duration: number,
    metadata: Record<string, any> = {},
    success: boolean = true,
    error?: string
  ): void {
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
      success,
      error,
    };

    this.metrics.push(metric);

    // Maintain max metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log slow operations
    if (duration > this.verySlowThreshold) {
      logger.warn(`Very slow operation: ${name} took ${duration}ms`, metadata);
    } else if (duration > this.verySlowThreshold) {
      logger.info(`Slow operation: ${name} took ${duration}ms`, metadata);
    }

    // Emit performance event
    eventBus.emit('performance:metric', metric);
  }

  getMetrics(name?: string, limit: number = 100): PerformanceMetric[] {
    let metrics = this.metrics;

    if (name) {
      metrics = metrics.filter(m => m.name === name);
    }

    return metrics.slice(-limit);
  }

  getStats(name?: string): PerformanceStats {
    const metrics = this.getMetrics(name);

    if (metrics.length === 0) {
      return {
        count: 0,
        successCount: 0,
        errorCount: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalDuration: 0,
        slowCount: 0,
        verySlowCount: 0,
      };
    }

    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;
    const errorCount = metrics.length - successCount;

    return {
      count: metrics.length,
      successCount,
      errorCount,
      successRate: successCount / metrics.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      slowCount: durations.filter(d => d > this.slowThreshold).length,
      verySlowCount: durations.filter(d => d > this.verySlowThreshold).length,
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

class ConnectionPool {
  private connections: any[] = [];
  private maxConnections: number;
  private lock = false;

  constructor(maxConnections: number = 20) {
    this.maxConnections = maxConnections;
  }

  async getConnection(): Promise<any> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.lock = true;
    try {
      if (this.connections.length > 0) {
        return this.connections.pop();
      }
      return null;
    } finally {
      this.lock = false;
    }
  }

  returnConnection(connection: any): void {
    while (this.lock) {
      // Wait for lock
    }

    this.lock = true;
    try {
      if (this.connections.length < this.maxConnections) {
        this.connections.push(connection);
      }
    } finally {
      this.lock = false;
    }
  }

  closeAll(): void {
    this.connections.forEach(connection => {
      try {
        if (connection && typeof connection.close === 'function') {
          connection.close();
        }
      } catch (error) {
        logger.error('Error closing connection', { error });
      }
    });
    this.connections = [];
  }
}

class AsyncTaskPool {
  private maxWorkers: number;
  private activeTasks = 0;
  private queue: Array<() => Promise<any>> = [];

  constructor(maxWorkers: number = 10) {
    this.maxWorkers = maxWorkers;
  }

  async submit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.activeTasks >= this.maxWorkers || this.queue.length === 0) {
      return;
    }

    this.activeTasks++;
    const task = this.queue.shift()!;

    try {
      await task();
    } finally {
      this.activeTasks--;
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  async submitBatch<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    const promises = tasks.map(task => this.submit(task));
    return Promise.all(promises);
  }
}

class CacheOptimizer {
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
  };

  optimizeCacheKey(key: string, prefix: string = ''): string {
    // Remove special characters and normalize
    const normalized = key.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    return prefix ? `${prefix}:${normalized}` : normalized;
  }

  getCacheStats(): Record<string, any> {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    const hitRate = totalRequests > 0 ? this.cacheStats.hits / totalRequests : 0;

    return {
      ...this.cacheStats,
      hitRate,
      missRate: 1 - hitRate,
    };
  }

  recordHit(): void {
    this.cacheStats.hits++;
  }

  recordMiss(): void {
    this.cacheStats.misses++;
  }

  recordEviction(): void {
    this.cacheStats.evictions++;
  }

  updateSize(size: number): void {
    this.cacheStats.size = size;
  }
}

class QueryOptimizer {
  private queryStats: Record<string, any> = {};
  private slowQueries: Array<{
    query: string;
    duration: number;
    params: Record<string, any>;
    timestamp: number;
  }> = [];

  optimizeQuery(query: string): string {
    // Remove extra whitespace
    query = query.replace(/\s+/g, ' ').trim();

    // Add hints for common patterns
    if (query.toUpperCase().includes('SELECT') && !query.toUpperCase().includes('LIMIT')) {
      query += ' LIMIT 1000';
    }

    return query;
  }

  recordSlowQuery(
    query: string,
    duration: number,
    params: Record<string, any> = {}
  ): void {
    this.slowQueries.push({
      query,
      duration,
      params,
      timestamp: Date.now(),
    });

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    logger.warn('Slow query detected', { query, duration, params });
  }

  getSlowQueries(limit: number = 50): Array<Record<string, any>> {
    return this.slowQueries.slice(-limit);
  }
}

class MemoryOptimizer {
  private memoryStats = {
    allocations: 0,
    deallocations: 0,
    peakUsage: 0,
    currentUsage: 0,
  };

  getMemoryUsage(): Record<string, any> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        allocationCount: memory.allocationCount || 0,
      };
    }

    return { error: 'Memory API not available' };
  }

  optimizeMemory(): void {
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
      logger.info('Memory optimization completed');
    } else {
      logger.info('Memory optimization not available');
    }
  }
}

class PerformanceProfiler {
  private profiles: Record<string, {
    startTime: number;
    calls: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    avgTime: number;
  }> = {};
  private activeProfiles = new Set<string>();

  startProfile(name: string): void {
    this.activeProfiles.add(name);
    this.profiles[name] = {
      startTime: performance.now(),
      calls: 0,
      totalTime: 0,
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
    };
  }

  endProfile(name: string): void {
    if (this.activeProfiles.has(name)) {
      this.activeProfiles.delete(name);

      if (this.profiles[name]) {
        const profile = this.profiles[name];
        const duration = performance.now() - profile.startTime;

        profile.calls++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);
        profile.avgTime = profile.totalTime / profile.calls;
      }
    }
  }

  getProfileStats(): Record<string, any> {
    return { ...this.profiles };
  }
}

class ImageOptimizer {
  private imageCache = new Map<string, HTMLImageElement>();
  private maxCacheSize = 100;

  async loadOptimizedImage(src: string, options: {
    width?: number;
    height?: number;
    quality?: number;
  } = {}): Promise<HTMLImageElement> {
    const cacheKey = `${src}_${options.width || 'auto'}_${options.height || 'auto'}`;

    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        // Add to cache
        if (this.imageCache.size >= this.maxCacheSize) {
          const firstKey = this.imageCache.keys().next().value;
          this.imageCache.delete(firstKey);
        }
        this.imageCache.set(cacheKey, img);
        
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });
  }

  preloadImages(urls: string[]): Promise<HTMLImageElement[]> {
    const promises = urls.map(url => this.loadOptimizedImage(url));
    return Promise.all(promises);
  }

  clearCache(): void {
    this.imageCache.clear();
  }
}

class BundleOptimizer {
  private loadedChunks = new Set<string>();
  private chunkCache = new Map<string, any>();

  async loadChunk(chunkName: string): Promise<any> {
    if (this.chunkCache.has(chunkName)) {
      return this.chunkCache.get(chunkName);
    }

    try {
      const chunk = await import(/* webpackChunkName: "[request]" */ `../chunks/${chunkName}`);
      this.chunkCache.set(chunkName, chunk);
      this.loadedChunks.add(chunkName);
      return chunk;
    } catch (error) {
      logger.error('Failed to load chunk', { chunkName, error });
      throw error;
    }
  }

  preloadChunks(chunkNames: string[]): Promise<any[]> {
    const promises = chunkNames.map(name => this.loadChunk(name));
    return Promise.all(promises);
  }

  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }
}

// Global instances
export const performanceMonitor = new PerformanceMonitor();
export const connectionPool = new ConnectionPool();
export const asyncTaskPool = new AsyncTaskPool();
export const cacheOptimizer = new CacheOptimizer();
export const queryOptimizer = new QueryOptimizer();
export const memoryOptimizer = new MemoryOptimizer();
export const performanceProfiler = new PerformanceProfiler();
export const imageOptimizer = new ImageOptimizer();
export const bundleOptimizer = new BundleOptimizer();

// Performance measurement decorator
export function measurePerformance(
  name?: string,
  metadata: Record<string, any> = {}
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      const metricName = name || `${target.constructor.name}.${propertyName}`;
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
        throw err;
      } finally {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric(metricName, duration, metadata, success, error);
      }
    };

    return descriptor;
  };
}

// Performance measurement function
export function measureFunction<T extends (...args: any[]) => any>(
  fn: T,
  name?: string,
  metadata: Record<string, any> = {}
): T {
  return (async (...args: any[]) => {
    const startTime = performance.now();
    const metricName = name || fn.name || 'anonymous';
    let success = true;
    let error: string | undefined;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(metricName, duration, metadata, success, error);
    }
  }) as T;
}

export function getPerformanceStats(): Record<string, any> {
  return {
    performanceMonitor: performanceMonitor.getStats(),
    cacheOptimizer: cacheOptimizer.getCacheStats(),
    memoryOptimizer: memoryOptimizer.getMemoryUsage(),
    queryOptimizer: {
      slowQueriesCount: queryOptimizer.getSlowQueries().length,
      recentSlowQueries: queryOptimizer.getSlowQueries(10),
    },
    performanceProfiler: performanceProfiler.getProfileStats(),
    imageOptimizer: {
      cacheSize: (imageOptimizer as any).imageCache.size,
    },
    bundleOptimizer: {
      loadedChunks: bundleOptimizer.getLoadedChunks(),
    },
  };
}

export default {
  performanceMonitor,
  connectionPool,
  asyncTaskPool,
  cacheOptimizer,
  queryOptimizer,
  memoryOptimizer,
  performanceProfiler,
  imageOptimizer,
  bundleOptimizer,
  measurePerformance,
  measureFunction,
  getPerformanceStats,
};
