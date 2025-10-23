/**
 * Resource Manager
 * 
 * Centralized resource storage and management service.
 * Provides type-safe access to game resources like textures, audio, data, etc.
 */

export class ResourceManager {
  private readonly resources = new Map<string, unknown>();

  /**
   * Set a resource
   */
  public set<T>(key: string, value: T): void {
    this.resources.set(key, value);
  }

  /**
   * Get a resource
   */
  public get<T>(key: string): T | undefined {
    return this.resources.get(key) as T | undefined;
  }

  /**
   * Check if a resource exists
   */
  public has(key: string): boolean {
    return this.resources.has(key);
  }

  /**
   * Get or create a resource using a factory function
   */
  public ensure<T>(key: string, factory: () => T): T {
    let value = this.resources.get(key) as T | undefined;
    if (value === undefined) {
      value = factory();
      this.resources.set(key, value);
    }
    return value;
  }

  /**
   * Remove a resource
   */
  public remove(key: string): boolean {
    return this.resources.delete(key);
  }

  /**
   * Clear all resources
   */
  public clear(): void {
    this.resources.clear();
  }

  /**
   * Get all resource keys
   */
  public keys(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * Get the number of resources
   */
  public size(): number {
    return this.resources.size;
  }
}
