/**
 * Merkezi Event Bus Sistemi
 * Tüm event'ler tek yerden yönetilir
 */

import { logger } from './logger';

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once: boolean;
  priority: number;
  context?: any;
}

export interface EventData {
  event: string;
  data: any;
  timestamp: number;
  source?: string;
  metadata?: any;
}

class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: EventData[] = [];
  private maxHistorySize = 1000;
  private isProcessing = false;
  private processingQueue: EventData[] = [];

  constructor() {
    this.setupGlobalEvents();
  }

  private setupGlobalEvents(): void {
    // Listen to browser events
    window.addEventListener('beforeunload', () => {
      this.emit('app:beforeunload', { timestamp: Date.now() });
    });

    window.addEventListener('online', () => {
      this.emit('app:online', { timestamp: Date.now() });
    });

    window.addEventListener('offline', () => {
      this.emit('app:offline', { timestamp: Date.now() });
    });

    // Listen to visibility changes
    document.addEventListener('visibilitychange', () => {
      this.emit('app:visibilitychange', {
        hidden: document.hidden,
        timestamp: Date.now(),
      });
    });
  }

  public subscribe<T = any>(
    event: string,
    handler: EventHandler<T>,
    options: {
      once?: boolean;
      priority?: number;
      context?: any;
    } = {}
  ): string {
    const subscription: EventSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event,
      handler,
      once: options.once || false,
      priority: options.priority || 0,
      context: options.context,
    };

    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const eventSubscriptions = this.subscriptions.get(event)!;
    eventSubscriptions.push(subscription);

    // Sort by priority (higher priority first)
    eventSubscriptions.sort((a, b) => b.priority - a.priority);

    logger.debug('Event subscription created', {
      event,
      subscriptionId: subscription.id,
      priority: subscription.priority,
      once: subscription.once,
    });

    return subscription.id;
  }

  public unsubscribe(subscriptionId: string): boolean {
    for (const [event, subscriptions] of Array.from(this.subscriptions.entries())) {
      const index = subscriptions.findIndex((sub: any) => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        
        if (subscriptions.length === 0) {
          this.subscriptions.delete(event);
        }

        logger.debug('Event subscription removed', {
          event,
          subscriptionId,
        });

        return true;
      }
    }

    return false;
  }

  public unsubscribeAll(event?: string): number {
    if (event) {
      const count = this.subscriptions.get(event)?.length || 0;
      this.subscriptions.delete(event);
      
      logger.debug('All subscriptions removed for event', {
        event,
        count,
      });

      return count;
    } else {
      const totalCount = Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0);
      
      this.subscriptions.clear();
      
      logger.debug('All event subscriptions removed', {
        totalCount,
      });

      return totalCount;
    }
  }

  public emit(event: string, data: any = null, source?: string): void {
    const eventData: EventData = {
      event,
      data,
      timestamp: Date.now(),
      source,
    };

    // Add to history
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Process event
    this.processEvent(eventData);
  }

  public async emitAsync(event: string, data: any = null, source?: string): Promise<void> {
    const eventData: EventData = {
      event,
      data,
      timestamp: Date.now(),
      source,
    };

    // Add to history
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Process event asynchronously
    await this.processEventAsync(eventData);
  }

  private processEvent(eventData: EventData): void {
    const subscriptions = this.subscriptions.get(eventData.event);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // Process handlers
    const handlersToRemove: string[] = [];

    for (const subscription of subscriptions) {
      try {
        const result = subscription.handler(eventData.data);
        
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            logger.error('Event handler error', {
              event: eventData.event,
              subscriptionId: subscription.id,
              error: (error as Error).message,
            });
          });
        }

        // Mark for removal if once
        if (subscription.once) {
          handlersToRemove.push(subscription.id);
        }
      } catch (error) {
        logger.error('Event handler error', {
          event: eventData.event,
          subscriptionId: subscription.id,
          error: (error as Error).message,
        });
      }
    }

    // Remove once handlers
    handlersToRemove.forEach(id => this.unsubscribe(id));
  }

  private async processEventAsync(eventData: EventData): Promise<void> {
    const subscriptions = this.subscriptions.get(eventData.event);
    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    // Process handlers asynchronously
    const handlersToRemove: string[] = [];

    for (const subscription of subscriptions) {
      try {
        await subscription.handler(eventData.data);

        // Mark for removal if once
        if (subscription.once) {
          handlersToRemove.push(subscription.id);
        }
      } catch (error) {
        logger.error('Event handler error', {
          event: eventData.event,
          subscriptionId: subscription.id,
          error: (error as Error).message,
        });
      }
    }

    // Remove once handlers
    handlersToRemove.forEach(id => this.unsubscribe(id));
  }

  public once<T = any>(event: string, handler: EventHandler<T>): string {
    return this.subscribe(event, handler, { once: true });
  }

  public waitFor<T = any>(event: string, timeout: number = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.unsubscribe(subscriptionId);
        reject(new Error(`Event '${event}' timeout after ${timeout}ms`));
      }, timeout);

      const subscriptionId = this.once(event, (data: T) => {
        clearTimeout(timeoutId);
        resolve(data);
      });
    });
  }

  public getSubscriptions(event?: string): EventSubscription[] {
    if (event) {
      return this.subscriptions.get(event) || [];
    }

    const allSubscriptions: EventSubscription[] = [];
    for (const subscriptions of Array.from(this.subscriptions.values())) {
      allSubscriptions.push(...subscriptions);
    }

    return allSubscriptions;
  }

  public getEventHistory(event?: string, limit: number = 100): EventData[] {
    let history = this.eventHistory;

    if (event) {
      history = history.filter(eventData => eventData.event === event);
    }

    return history.slice(-limit);
  }

  public getEventStats(): {
    totalEvents: number;
    uniqueEvents: number;
    totalSubscriptions: number;
    eventsByType: Record<string, number>;
    subscriptionsByEvent: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const subscriptionsByEvent: Record<string, number> = {};

    // Count events by type
    this.eventHistory.forEach(eventData => {
      eventsByType[eventData.event] = (eventsByType[eventData.event] || 0) + 1;
    });

    // Count subscriptions by event
    this.subscriptions.forEach((subscriptions, event) => {
      subscriptionsByEvent[event] = subscriptions.length;
    });

    return {
      totalEvents: this.eventHistory.length,
      uniqueEvents: Object.keys(eventsByType).length,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, subs) => sum + subs.length, 0),
      eventsByType,
      subscriptionsByEvent,
    };
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }

  public exportSubscriptions(): string {
    const exportData = {
      subscriptions: Array.from(this.subscriptions.entries()),
      timestamp: Date.now(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  public importSubscriptions(data: string): void {
    try {
      const importData = JSON.parse(data);
      
      if (importData.subscriptions && Array.isArray(importData.subscriptions)) {
        this.subscriptions.clear();
        
        importData.subscriptions.forEach(([event, subscriptions]: [string, EventSubscription[]]) => {
          this.subscriptions.set(event, subscriptions);
        });
      }
    } catch (error) {
      logger.error('Failed to import subscriptions', { error: (error as Error).message });
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Export commonly used methods
export const {
  subscribe,
  unsubscribe,
  unsubscribeAll,
  emit,
  emitAsync,
  once,
  waitFor,
  getSubscriptions,
  getEventHistory,
  getEventStats,
  clearHistory,
} = eventBus;

export default eventBus;
