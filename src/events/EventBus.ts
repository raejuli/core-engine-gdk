/**
 * Event Bus - Decoupled event-driven communication
 * 
 * Provides a publish-subscribe pattern for game events.
 * Supports both typed and untyped event handling.
 */

export type EventCallback<T = any> = (data: T) => void;
type ListenerMap = Map<string, Set<EventCallback<unknown>>>;

/**
 * EventBus interface for type-safe implementations
 */
export interface EventBusLike {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, listener: EventCallback<T>): () => void;
}

/**
 * EventBus - Simple, efficient event system
 * Suitable for most use cases with minimal overhead
 */
export class EventBus implements EventBusLike {
  private listeners: ListenerMap = new Map();

  /**
   * Emit an event with optional payload
   */
  emit<T>(event: string, payload: T): void {
    const bucket = this.listeners.get(event);
    if (!bucket) {
      return;
    }

    for (const handler of bucket) {
      (handler as EventCallback<T>)(payload);
    }
  }

  /**
   * Subscribe to an event
   * Returns an unsubscribe function
   */
  on<T>(event: string, listener: EventCallback<T>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(event, bucket);
    }

    bucket.add(listener as EventCallback<unknown>);

    return () => {
      bucket?.delete(listener as EventCallback<unknown>);
      if (bucket && bucket.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  /**
   * Remove a specific listener
   */
  off<T>(event: string, listener: EventCallback<T>): void {
    const bucket = this.listeners.get(event);
    if (bucket) {
      bucket.delete(listener as EventCallback<unknown>);
      if (bucket.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Check if an event has listeners
   */
  hasListeners(event: string): boolean {
    const bucket = this.listeners.get(event);
    return bucket ? bucket.size > 0 : false;
  }

  /**
   * Get the number of listeners for an event
   */
  getListenerCount(event: string): number {
    const bucket = this.listeners.get(event);
    return bucket ? bucket.size : 0;
  }
}

/**
 * EventEmitter - Feature-rich event system with logging
 * More suitable for debugging and complex event scenarios
 */
export class EventEmitter {
  private _listeners: Map<string, EventCallback[]> = new Map();
  private _logEvents: boolean = false;

  constructor(options?: { logEvents?: boolean }) {
    this._logEvents = options?.logEvents ?? false;
  }

  /**
   * Subscribe to an event
   */
  public on(event: string, callback: EventCallback): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event)!.push(callback);
  }

  /**
   * Subscribe to an event once
   */
  public once(event: string, callback: EventCallback): void {
    const wrappedCallback = (data: any) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: string, callback: EventCallback): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        this._listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event with optional data
   */
  public emit(event: string, data?: any): void {
    const listeners = this._listeners.get(event);
    
    if (this._logEvents) {
      console.log(`EventEmitter: emit('${event}')`, 'listeners:', listeners?.length || 0, 'data:', data);
    }
    
    if (listeners) {
      // Clone the array to prevent issues if listeners modify the list during iteration
      const listenersClone = [...listeners];
      for (const callback of listenersClone) {
        callback(data);
      }
    }
  }

  /**
   * Clear all listeners or listeners for a specific event
   */
  public clear(event?: string): void {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }

  /**
   * Enable or disable event logging
   */
  public setLogging(enabled: boolean): void {
    this._logEvents = enabled;
  }

  /**
   * Get the number of listeners for an event
   */
  public listenerCount(event: string): number {
    return this._listeners.get(event)?.length || 0;
  }

  /**
   * Get all event names that have listeners
   */
  public eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }
}
