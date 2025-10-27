/**
 * Merkezi Cache Yönetim Sistemi
 * Tüm cache işlemleri tek yerden yönetilir
 */

import { configManager } from './config';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  size: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  oldestEntry: number;
  newestEntry: number;
}

export type CacheStrategy = 'lru' | 'fifo' | 'lfu';

class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessCount: Map<string, number> = new Map();
  private config = configManager.get('cache');
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    this.setupCleanupInterval();
  }

  private setupCleanupInterval(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  public set<T>(key: string, data: T, ttl: number = this.config.ttl * 1000): void {
    if (!this.config.enabled) return;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
      size: this.calculateSize(data),
    };

    // Check if we need to evict entries
    if (this.shouldEvict(entry)) {
      this.evictEntries(entry);
    }

    this.cache.set(key, entry);
    this.accessCount.set(key, 1);
  }

  public get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access count
    const currentCount = this.accessCount.get(key) || 0;
    this.accessCount.set(key, currentCount + 1);

    this.stats.hits++;
    return entry.data as T;
  }

  public has(key: string): boolean {
    if (!this.config.enabled) return false;

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.stats.misses++;
      return false;
    }

    this.stats.hits++;
    return true;
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.accessCount.delete(key);
    return deleted;
  }

  public clear(): void {
    this.cache.clear();
    this.accessCount.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public values(): any[] {
    return Array.from(this.cache.values()).map(entry => entry.data);
  }

  public entries(): Array<[string, any]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.data]);
  }

  public size(): number {
    return this.cache.size;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private shouldEvict(entry: CacheEntry): boolean {
    const totalSize = this.getTotalSize() + entry.size;
    return totalSize > this.config.maxSize * 1024 * 1024; // Convert MB to bytes
  }

  private evictEntries(newEntry: CacheEntry): void {
    const entriesToEvict: Array<[string, CacheEntry]> = [];
    const totalSize = this.getTotalSize() + newEntry.size;
    const maxSize = this.config.maxSize * 1024 * 1024;

    // Sort entries by strategy
    const sortedEntries = this.getSortedEntries();

    for (const [key, entry] of sortedEntries) {
      if (totalSize - entry.size <= maxSize) break;
      entriesToEvict.push([key, entry]);
    }

    // Evict entries
    entriesToEvict.forEach(([key, entry]) => {
      this.cache.delete(key);
      this.accessCount.delete(key);
      this.stats.evictions++;
    });
  }

  private getSortedEntries(): Array<[string, CacheEntry]> {
    const entries = Array.from(this.cache.entries());

    switch (this.config.strategy) {
      case 'lru':
        return entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      case 'fifo':
        return entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      case 'lfu':
        return entries.sort((a, b) => {
          const countA = this.accessCount.get(a[0]) || 0;
          const countB = this.accessCount.get(b[0]) || 0;
          return countA - countB;
        });
      default:
        return entries;
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      this.accessCount.delete(key);
    });
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 0;
    }
  }

  private getTotalSize(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize;
  }

  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.stats.misses / totalRequests : 0;

    let oldestEntry = Date.now();
    let newestEntry = 0;

    this.cache.forEach(entry => {
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      totalEntries: this.cache.size,
      totalSize: this.getTotalSize(),
      hitRate,
      missRate,
      evictions: this.stats.evictions,
      oldestEntry,
      newestEntry,
    };
  }

  public getEntryInfo(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    return entry;
  }

  public getEntriesByPattern(pattern: RegExp): Array<[string, any]> {
    const matches: Array<[string, any]> = [];
    
    this.cache.forEach((entry, key) => {
      if (pattern.test(key) && !this.isExpired(entry)) {
        matches.push([key, entry.data]);
      }
    });

    return matches;
  }

  public invalidateByPattern(pattern: RegExp): number {
    let invalidated = 0;
    
    this.cache.forEach((entry, key) => {
      if (pattern.test(key)) {
        this.cache.delete(key);
        this.accessCount.delete(key);
        invalidated++;
      }
    });

    return invalidated;
  }

  public exportCache(): string {
    const exportData = {
      entries: Array.from(this.cache.entries()),
      stats: this.stats,
      timestamp: Date.now(),
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  public importCache(data: string): void {
    try {
      const importData = JSON.parse(data);
      
      if (importData.entries && Array.isArray(importData.entries)) {
        this.cache.clear();
        this.accessCount.clear();
        
        importData.entries.forEach(([key, entry]: [string, CacheEntry]) => {
          this.cache.set(key, entry);
          this.accessCount.set(key, 1);
        });
      }
      
      if (importData.stats) {
        this.stats = { ...this.stats, ...importData.stats };
      }
    } catch (error) {
      console.error('Failed to import cache:', error);
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Export commonly used methods
export const { set, get, has, delete: del, clear, size, getStats } = cacheManager;

export default cacheManager;
