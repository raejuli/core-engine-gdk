/**
 * Service Locator Pattern
 * 
 * Provides global access to core services without tight coupling.
 * Use sparingly - dependency injection is generally preferred.
 */

export class ServiceLocator {
  private static _services: Map<string, any> = new Map();

  /**
   * Register a service
   */
  public static register<T>(serviceName: string, service: T): void {
    if (this._services.has(serviceName)) {
      console.warn(`ServiceLocator: Service '${serviceName}' is already registered. Overwriting.`);
    }
    this._services.set(serviceName, service);
  }

  /**
   * Get a service by name
   * Throws if service is not found
   */
  public static get<T>(serviceName: string): T {
    const service = this._services.get(serviceName);
    if (!service) {
      throw new Error(`ServiceLocator: Service '${serviceName}' not found. Did you forget to register it?`);
    }
    return service as T;
  }

  /**
   * Try to get a service by name
   * Returns undefined if not found
   */
  public static tryGet<T>(serviceName: string): T | undefined {
    return this._services.get(serviceName) as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  public static has(serviceName: string): boolean {
    return this._services.has(serviceName);
  }

  /**
   * Unregister a service
   */
  public static unregister(serviceName: string): void {
    this._services.delete(serviceName);
  }

  /**
   * Clear all services
   */
  public static clear(): void {
    this._services.clear();
  }

  /**
   * Get all registered service names
   */
  public static getServiceNames(): string[] {
    return Array.from(this._services.keys());
  }
}
