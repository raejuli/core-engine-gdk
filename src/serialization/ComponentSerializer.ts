/**
 * ComponentSerializer
 * 
 * Improved component serialization with better type safety, error handling,
 * and extensibility. Supports component versioning and migration.
 * 
 * @example
 * ```typescript
 * // Register a component
 * ComponentSerializer.register('Transform', (data) => {
 *   return new TransformComponent(data.data.x, data.data.y);
 * });
 * 
 * // Serialize
 * const serialized = ComponentSerializer.serialize(component);
 * 
 * // Deserialize
 * const component = ComponentSerializer.deserialize(serialized);
 * ```
 */

import { Component } from '../ecs/Component';
import {
  SerializedComponent,
  ComponentFactory,
  SerializationOptions,
  DeserializationOptions,
  SerializationError,
  ISerializable
} from './types';

export interface ComponentSerializerConfig {
  /** Warn when no factory is found */
  warnOnMissingFactory?: boolean;
  
  /** Default version for new components */
  defaultVersion?: string;
  
  /** Enable debug logging */
  debug?: boolean;
}

export class ComponentSerializer {
  private static factories = new Map<string, ComponentFactory>();
  private static migrators = new Map<string, Map<string, (data: any) => any>>();
  private static config: ComponentSerializerConfig = {
    warnOnMissingFactory: true,
    defaultVersion: '1.0.0',
    debug: false
  };

  /**
   * Configure the serializer
   */
  static configure(config: Partial<ComponentSerializerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register a component type with its factory function
   * @param typeName - Component type name
   * @param factory - Factory function to create component from serialized data
   */
  static register(typeName: string, factory: ComponentFactory): void {
    if (this.factories.has(typeName)) {
      console.warn(`⚠️ Overwriting existing factory for component type: ${typeName}`);
    }
    
    this.factories.set(typeName, factory);
    
    if (this.config.debug) {
      console.log(`📦 Registered component type: ${typeName}`);
    }
  }

  /**
   * Register multiple component types at once
   */
  static registerMany(factories: Record<string, ComponentFactory>): void {
    for (const [typeName, factory] of Object.entries(factories)) {
      this.register(typeName, factory);
    }
  }

  /**
   * Register a migration function for component version updates
   * @param typeName - Component type name
   * @param fromVersion - Version to migrate from
   * @param toVersion - Version to migrate to
   * @param migrator - Migration function
   */
  static registerMigration(
    typeName: string,
    fromVersion: string,
    toVersion: string,
    migrator: (data: any) => any
  ): void {
    if (!this.migrators.has(typeName)) {
      this.migrators.set(typeName, new Map());
    }
    
    const key = `${fromVersion}->${toVersion}`;
    this.migrators.get(typeName)!.set(key, migrator);
    
    if (this.config.debug) {
      console.log(`🔄 Registered migration for ${typeName}: ${key}`);
    }
  }

  /**
   * Unregister a component type
   */
  static unregister(typeName: string): boolean {
    return this.factories.delete(typeName);
  }

  /**
   * Check if a component type is registered
   */
  static isRegistered(typeName: string): boolean {
    return this.factories.has(typeName);
  }

  /**
   * Get all registered component types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Serialize a component to JSON-compatible format
   */
  static serialize(component: Component, _options?: SerializationOptions): SerializedComponent {
    const typeName = component.getType();
    
    try {
      // Check if component implements ISerializable
      if (this.isSerializable(component)) {
        return {
          type: typeName,
          data: component.toJSON(),
          version: this.config.defaultVersion
        };
      }

      // Default serialization: extract all enumerable properties
      const data = this.extractProperties(component);

      return {
        type: typeName,
        data,
        version: this.config.defaultVersion
      };
    } catch (error) {
      throw new SerializationError(
        `Failed to serialize component ${typeName}: ${error}`,
        'serialize',
        { component, error }
      );
    }
  }

  /**
   * Deserialize a component from JSON-compatible format
   */
  static deserialize(serialized: SerializedComponent, options?: DeserializationOptions): Component | null {
    const factory = this.factories.get(serialized.type);
    
    if (!factory) {
      if (this.config.warnOnMissingFactory || options?.strict) {
        const message = `No factory registered for component type: ${serialized.type}`;
        if (options?.strict) {
          throw new SerializationError(message, 'deserialize', { serialized });
        }
        console.warn(`⚠️ ${message}`);
      }
      return null;
    }

    try {
      // Apply migrations if needed
      const migratedData = this.applyMigrations(serialized);
      
      // Create component using factory
      const component = factory(migratedData, options?.context);
      
      // If component implements ISerializable, call fromJSON
      if (component && this.isSerializable(component)) {
        component.fromJSON(migratedData.data);
      }
      
      return component;
    } catch (error) {
      throw new SerializationError(
        `Failed to deserialize component ${serialized.type}: ${error}`,
        'deserialize',
        { serialized, error }
      );
    }
  }

  /**
   * Serialize multiple components
   */
  static serializeMany(components: Component[], options?: SerializationOptions): SerializedComponent[] {
    return components.map(c => this.serialize(c, options));
  }

  /**
   * Deserialize multiple components
   */
  static deserializeMany(
    serialized: SerializedComponent[],
    options?: DeserializationOptions
  ): Component[] {
    const components: Component[] = [];
    
    for (const data of serialized) {
      const component = this.deserialize(data, options);
      if (component) {
        components.push(component);
      }
    }
    
    return components;
  }

  /**
   * Extract serializable properties from a component
   */
  private static extractProperties(component: Component): Record<string, any> {
    const data: Record<string, any> = {};
    
    for (const key in component) {
      if (!component.hasOwnProperty(key)) continue;
      
      const value = (component as any)[key];
      
      // Skip functions, entity references, and private properties
      if (typeof value === 'function' || key.startsWith('_') || key === 'entity') {
        continue;
      }
      
      // Serialize the value
      data[key] = this.serializeValue(value);
    }
    
    return data;
  }

  /**
   * Recursively serialize complex values
   */
  private static serializeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }
    
    // Arrays
    if (Array.isArray(value)) {
      return value.map(v => this.serializeValue(v));
    }
    
    // Objects with toJSON
    if (typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') {
      return value.toJSON();
    }
    
    // Plain objects
    if (typeof value === 'object' && value.constructor === Object) {
      const result: Record<string, any> = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          result[key] = this.serializeValue(value[key]);
        }
      }
      return result;
    }
    
    // Primitives and other types
    return value;
  }

  /**
   * Apply migrations to upgrade component data
   */
  private static applyMigrations(serialized: SerializedComponent): SerializedComponent {
    const migrations = this.migrators.get(serialized.type);
    if (!migrations || !serialized.version) {
      return serialized;
    }

    let currentData = { ...serialized };
    
    // Apply each migration in sequence
    // This is simplified - in production you'd want a more sophisticated migration path finder
    for (const [key, migrator] of migrations.entries()) {
      const [fromVersion] = key.split('->');
      if (currentData.version === fromVersion) {
        currentData.data = migrator(currentData.data);
        // Update version (extract toVersion from key)
        const toVersion = key.split('->')[1];
        currentData.version = toVersion;
      }
    }
    
    return currentData;
  }

  /**
   * Check if component implements ISerializable
   */
  private static isSerializable(component: any): component is ISerializable {
    return (
      'toJSON' in component &&
      typeof component.toJSON === 'function' &&
      'fromJSON' in component &&
      typeof component.fromJSON === 'function'
    );
  }

  /**
   * Clear all registered factories (useful for testing)
   */
  static clear(): void {
    this.factories.clear();
    this.migrators.clear();
  }

  /**
   * Get statistics about registered components
   */
  static getStats(): { totalFactories: number; totalMigrations: number } {
    let totalMigrations = 0;
    for (const migrations of this.migrators.values()) {
      totalMigrations += migrations.size;
    }
    
    return {
      totalFactories: this.factories.size,
      totalMigrations
    };
  }
}
