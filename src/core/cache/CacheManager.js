/**
 * Cache Manager - Multi-layer Caching
 * Redis + Memory cache with TTL support
 * @module core/cache/CacheManager
 */

import { createClient } from 'redis';

class CacheManager {
  constructor() {
    if (CacheManager.instance) {
      return CacheManager.instance;
    }

    this.redis = null;
    this.memory = new Map();
    this.ttls = new Map();
    this.logger = null;

    CacheManager.instance = this;
  }

  async initialize(redisConfig, logger = null) {
    this.logger = logger;

    try {
      this.redis = createClient({
        socket: {
          host: redisConfig.host || 'localhost',
          port: redisConfig.port || 6379
        },
        password: redisConfig.password || undefined
      });

      await this.redis.connect();
      this.logger?.info('Cache manager initialized');
    } catch (error) {
      this.logger?.warn('Redis not available, using memory cache only', { error });
    }
  }

  async get(key) {
    // Try memory first
    if (this.memory.has(key)) {
      const { value, expiresAt } = this.memory.get(key);
      if (!expiresAt || Date.now() < expiresAt) {
        return value;
      }
      this.memory.delete(key);
    }

    // Try Redis
    if (this.redis?.isReady) {
      const value = await this.redis.get(key);
      if (value) {
        return JSON.parse(value);
      }
    }

    return null;
  }

  async set(key, value, ttl = 3600) {
    // Set in memory
    this.memory.set(key, {
      value,
      expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : null
    });

    // Set in Redis
    if (this.redis?.isReady) {
      await this.redis.setEx(key, ttl, JSON.stringify(value));
    }
  }

  async delete(key) {
    this.memory.delete(key);

    if (this.redis?.isReady) {
      await this.redis.del(key);
    }
  }

  async clear() {
    this.memory.clear();

    if (this.redis?.isReady) {
      await this.redis.flushDb();
    }
  }

  async close() {
    if (this.redis?.isReady) {
      await this.redis.quit();
    }
  }
}

export default new CacheManager();
