/**
 * Dinamik Konfigürasyon Sistemi
 * Runtime'da değiştirilebilir ayarlar
 */

import { apiClient } from './apiClient';
import { logger } from './logger';
import { eventBus } from './eventBus';

export interface DynamicConfigItem {
  key: string;
  value: any;
  category: string;
  description: string;
  dataType: string;
  isSensitive?: boolean;
  isReadonly?: boolean;
  minValue?: any;
  maxValue?: any;
  allowedValues?: any[];
  updatedAt: string;
  updatedBy?: string;
}

export interface DynamicConfigCategory {
  [key: string]: {
    value: any;
    description: string;
    dataType: string;
    isSensitive?: boolean;
    isReadonly?: boolean;
    updatedAt: string;
    updatedBy?: string;
  };
}

export type ConfigChangeListener = (key: string, oldValue: any, newValue: any) => void;

class DynamicConfigManager {
  private config: Map<string, DynamicConfigItem> = new Map();
  private listeners: ConfigChangeListener[] = [];
  private cache: Map<string, { value: any; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.setupEventListeners();
    this.loadConfig();
  }

  private setupEventListeners(): void {
    // Listen for config changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'dynamic_config_update') {
        const { key, oldValue, newValue } = JSON.parse(event.newValue || '{}');
        this.handleConfigChange(key, oldValue, newValue);
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.loadConfig();
    });
  }

  private async loadConfig(): Promise<void> {
    try {
      const response = await apiClient.get('/api/config/dynamic');
      const configData = response.data;

      this.config.clear();
      Object.entries(configData).forEach(([key, item]: [string, any]) => {
        this.config.set(key, item as DynamicConfigItem);
      });

      logger.info('Dynamic config loaded', { count: this.config.size });
      eventBus.emit('config:loaded', { count: this.config.size });
    } catch (error) {
      logger.error('Failed to load dynamic config', { error });
      this.loadFromCache();
    }
  }

  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem('dynamic_config');
      if (cached) {
        const configData = JSON.parse(cached);
        this.config.clear();
        Object.entries(configData).forEach(([key, item]: [string, any]) => {
          this.config.set(key, item as DynamicConfigItem);
        });
        logger.info('Dynamic config loaded from cache', { count: this.config.size });
      }
    } catch (error) {
      logger.error('Failed to load config from cache', { error });
    }
  }

  private saveToCache(): void {
    try {
      const configData: { [key: string]: DynamicConfigItem } = {};
      this.config.forEach((item, key) => {
        configData[key] = item;
      });
      localStorage.setItem('dynamic_config', JSON.stringify(configData));
    } catch (error) {
      logger.error('Failed to save config to cache', { error });
    }
  }

  public get(key: string, defaultValue: any = null): any {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value;
    }

    // Get from config
    const item = this.config.get(key);
    if (item) {
      // Update cache
      this.cache.set(key, { value: item.value, timestamp: Date.now() });
      return item.value;
    }

    return defaultValue;
  }

  public async set(key: string, value: any, updatedBy?: string): Promise<boolean> {
    try {
      const response = await apiClient.put('/api/config/dynamic', {
        key,
        value,
        updatedBy,
      });

      if (response.status === 200) {
        const oldValue = this.get(key);
        const newItem: DynamicConfigItem = {
          key,
          value,
          category: response.data.category || 'general',
          description: response.data.description || '',
          dataType: response.data.dataType || 'string',
          isSensitive: response.data.isSensitive || false,
          isReadonly: response.data.isReadonly || false,
          updatedAt: new Date().toISOString(),
          updatedBy,
        };

        this.config.set(key, newItem);
        this.cache.set(key, { value, timestamp: Date.now() });
        this.saveToCache();

        // Notify listeners
        this.notifyListeners(key, oldValue, value);

        // Broadcast to other tabs
        localStorage.setItem('dynamic_config_update', JSON.stringify({
          key,
          oldValue,
          newValue: value,
        }));
        localStorage.removeItem('dynamic_config_update');

        logger.info('Dynamic config updated', { key, value });
        eventBus.emit('config:updated', { key, oldValue, newValue: value });

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to update dynamic config', { key, value, error });
      return false;
    }
  }

  public getCategory(category: string): DynamicConfigCategory {
    const result: DynamicConfigCategory = {};
    
    this.config.forEach((item, key) => {
      if (item.category === category) {
        result[key] = {
          value: item.value,
          description: item.description,
          dataType: item.dataType,
          isSensitive: item.isSensitive,
          isReadonly: item.isReadonly,
          updatedAt: item.updatedAt,
          updatedBy: item.updatedBy,
        };
      }
    });

    return result;
  }

  public getAll(): { [key: string]: DynamicConfigItem } {
    const result: { [key: string]: DynamicConfigItem } = {};
    this.config.forEach((item, key) => {
      result[key] = item;
    });
    return result;
  }

  public getKeys(): string[] {
    return Array.from(this.config.keys());
  }

  public getKeysByCategory(category: string): string[] {
    const keys: string[] = [];
    this.config.forEach((item, key) => {
      if (item.category === category) {
        keys.push(key);
      }
    });
    return keys;
  }

  public has(key: string): boolean {
    return this.config.has(key);
  }

  public addListener(listener: ConfigChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(key: string, oldValue: any, newValue: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(key, oldValue, newValue);
      } catch (error) {
        logger.error('Config listener error', { key, error });
      }
    });
  }

  private handleConfigChange(key: string, oldValue: any, newValue: any): void {
    // Update local config
    const item = this.config.get(key);
    if (item) {
      item.value = newValue;
      item.updatedAt = new Date().toISOString();
      this.config.set(key, item);
      this.cache.set(key, { value: newValue, timestamp: Date.now() });
    }

    // Notify listeners
    this.notifyListeners(key, oldValue, newValue);
  }

  public async refresh(): Promise<void> {
    await this.loadConfig();
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public getStats(): {
    totalConfigs: number;
    categories: string[];
    cacheSize: number;
    listeners: number;
  } {
    const categories = new Set<string>();
    this.config.forEach(item => {
      categories.add(item.category);
    });

    return {
      totalConfigs: this.config.size,
      categories: Array.from(categories),
      cacheSize: this.cache.size,
      listeners: this.listeners.length,
    };
  }

  public exportConfig(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  public importConfig(configData: string): boolean {
    try {
      const data = JSON.parse(configData);
      Object.entries(data).forEach(([key, item]: [string, any]) => {
        this.config.set(key, item as DynamicConfigItem);
      });
      this.saveToCache();
      return true;
    } catch (error) {
      logger.error('Failed to import config', { error });
      return false;
    }
  }

  // Convenience methods for common config types
  public getString(key: string, defaultValue: string = ''): string {
    const value = this.get(key, defaultValue);
    return typeof value === 'string' ? value : String(value);
  }

  public getNumber(key: string, defaultValue: number = 0): number {
    const value = this.get(key, defaultValue);
    return typeof value === 'number' ? value : Number(value);
  }

  public getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = this.get(key, defaultValue);
    return typeof value === 'boolean' ? value : Boolean(value);
  }

  public getArray(key: string, defaultValue: any[] = []): any[] {
    const value = this.get(key, defaultValue);
    return Array.isArray(value) ? value : [];
  }

  public getObject(key: string, defaultValue: object = {}): object {
    const value = this.get(key, defaultValue);
    return typeof value === 'object' && value !== null ? value : defaultValue;
  }
}

// Singleton instance
export const dynamicConfig = new DynamicConfigManager();

// Export commonly used methods
export const {
  get: getDynamicConfig,
  set: setDynamicConfig,
  getCategory: getDynamicConfigCategory,
  getAll: getAllDynamicConfig,
  getString: getDynamicConfigString,
  getNumber: getDynamicConfigNumber,
  getBoolean: getDynamicConfigBoolean,
  getArray: getDynamicConfigArray,
  getObject: getDynamicConfigObject,
  addListener: addDynamicConfigListener,
  refresh: refreshDynamicConfig,
  clearCache: clearDynamicConfigCache,
  getStats: getDynamicConfigStats,
} = dynamicConfig;

export default dynamicConfig;
