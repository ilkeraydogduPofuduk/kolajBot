/**
 * Event Bus - Pub/Sub System
 * Decoupled event-driven architecture
 * @module core/events/EventBus
 */

import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    if (EventBus.instance) {
      return EventBus.instance;
    }

    super();
    this.setMaxListeners(100); // Increase limit for many listeners
    this.logger = null;

    EventBus.instance = this;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  publish(event, data = {}) {
    this.logger?.debug(`Event published: ${event}`, { data });
    this.emit(event, data);
  }

  subscribe(event, handler) {
    this.on(event, handler);
    this.logger?.debug(`Subscribed to event: ${event}`);
  }

  unsubscribe(event, handler) {
    this.off(event, handler);
    this.logger?.debug(`Unsubscribed from event: ${event}`);
  }

  async publishAsync(event, data = {}) {
    const listeners = this.listeners(event);

    for (const listener of listeners) {
      try {
        await listener(data);
      } catch (error) {
        this.logger?.error(`Event handler failed for ${event}`, { error });
      }
    }
  }
}

export default new EventBus();
