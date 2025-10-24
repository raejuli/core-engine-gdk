/**
 * EntitySerializer
 * 
 * Handles serialization and deserialization of entire entities.
 * Works with ComponentSerializer to handle all entity data.
 * Renamed from GameObjectSerializer for clarity with ECS terminology.
 * 
 * @example
 * ```typescript
 * // Serialize an entity
 * const serialized = EntitySerializer.serialize(entity);
 * 
 * // Deserialize into a world
 * const entity = EntitySerializer.deserialize(world, serialized);
 * 
 * // Register a custom entity factory
 * EntitySerializer.register('tower', (data, world) => {
 *   return createTowerEntity(world, data);
 * });
 * ```
 */

import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import {
  SerializedEntity,
  EntityFactory,
  SerializationOptions,
  DeserializationOptions,
  SerializationError
} from './types';
import { ComponentSerializer } from './ComponentSerializer';

export interface EntitySerializerConfig {
  /** Automatically infer entity type from components */
  autoInferType?: boolean;
  
  /** Include entity metadata in serialization */
  includeMetadata?: boolean;
  
  /** Warn when no factory is found */
  warnOnMissingFactory?: boolean;
  
  /** Enable debug logging */
  debug?: boolean;
}

export class EntitySerializer {
  private static factories = new Map<string, EntityFactory>();
  private static typeInferenceFn: ((entity: Entity) => string) | null = null;
  private static config: EntitySerializerConfig = {
    autoInferType: true,
    includeMetadata: false,
    warnOnMissingFactory: true,
    debug: false
  };

  /**
   * Configure the serializer
   */
  static configure(config: Partial<EntitySerializerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register an entity type with its factory function
   * @param typeName - Entity type name
   * @param factory - Factory function to create entity from serialized data
   */
  static register(typeName: string, factory: EntityFactory): void {
    if (this.factories.has(typeName)) {
      console.warn(`⚠️ Overwriting existing factory for entity type: ${typeName}`);
    }
    
    this.factories.set(typeName, factory);
    
    if (this.config.debug) {
      console.log(`📦 Registered entity type: ${typeName}`);
    }
  }

  /**
   * Register multiple entity types at once
   */
  static registerMany(factories: Record<string, EntityFactory>): void {
    for (const [typeName, factory] of Object.entries(factories)) {
      this.register(typeName, factory);
    }
  }

  /**
   * Set custom type inference function
   */
  static setTypeInference(fn: (entity: Entity) => string): void {
    this.typeInferenceFn = fn;
  }

  /**
   * Unregister an entity type
   */
  static unregister(typeName: string): boolean {
    return this.factories.delete(typeName);
  }

  /**
   * Check if an entity type is registered
   */
  static isRegistered(typeName: string): boolean {
    return this.factories.has(typeName);
  }

  /**
   * Get all registered entity types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Serialize an entity to JSON-compatible format
   */
  static serialize(entity: Entity, options?: SerializationOptions): SerializedEntity {
    try {
      // Serialize all components
      const components = ComponentSerializer.serializeMany(
        entity.getAllComponents(),
        options
      );

      // Determine entity type
      const type = this.config.autoInferType ? this.inferType(entity) : 'generic';

      const serialized: SerializedEntity = {
        id: entity.id.toString(),
        name: entity.name,
        type,
        active: true,
        components
      };

      // Add metadata if configured
      if (this.config.includeMetadata || options?.includeMetadata) {
        serialized.metadata = {
          componentCount: components.length,
          serializedAt: new Date().toISOString()
        };
      }

      return serialized;
    } catch (error) {
      throw new SerializationError(
        `Failed to serialize entity ${entity.name}: ${error}`,
        'serialize',
        { entity, error }
      );
    }
  }

  /**
   * Deserialize an entity and add it to the world
   */
  static deserialize(
    world: World,
    serialized: SerializedEntity,
    options?: DeserializationOptions
  ): Entity | null {
    // Check for custom factory
    const factory = this.factories.get(serialized.type);
    
    if (factory) {
      try {
        return factory(serialized, { world, ...options?.context });
      } catch (error) {
        throw new SerializationError(
          `Failed to use factory for entity type ${serialized.type}: ${error}`,
          'deserialize',
          { serialized, error }
        );
      }
    }

    // Default deserialization
    try {
      const entity = world.createEntity(serialized.name);
      
      // Deserialize and add each component
      const components = ComponentSerializer.deserializeMany(
        serialized.components,
        options
      );
      
      for (const component of components) {
        entity.addComponent(component);
      }

      return entity;
    } catch (error) {
      if (options?.strict) {
        throw new SerializationError(
          `Failed to deserialize entity ${serialized.name}: ${error}`,
          'deserialize',
          { serialized, error }
        );
      }
      
      console.error(`❌ Failed to deserialize entity ${serialized.name}:`, error);
      return null;
    }
  }

  /**
   * Serialize multiple entities
   */
  static serializeMany(entities: Entity[], options?: SerializationOptions): SerializedEntity[] {
    return entities.map(entity => this.serialize(entity, options));
  }

  /**
   * Deserialize multiple entities
   */
  static deserializeMany(
    world: World,
    serialized: SerializedEntity[],
    options?: DeserializationOptions
  ): Entity[] {
    const entities: Entity[] = [];
    
    for (const data of serialized) {
      const entity = this.deserialize(world, data, options);
      if (entity) {
        entities.push(entity);
      }
    }
    
    return entities;
  }

  /**
   * Infer the type of an entity from its components
   */
  private static inferType(entity: Entity): string {
    // Use custom inference function if provided
    if (this.typeInferenceFn) {
      return this.typeInferenceFn(entity);
    }

    // Default inference based on component presence
    const componentTypes = entity.getAllComponents().map(c => c.getType());
    
    // Check for specific component combinations
    if (componentTypes.includes('Tower')) return 'tower';
    if (componentTypes.includes('Enemy')) return 'enemy';
    if (componentTypes.includes('Projectile')) return 'projectile';
    if (componentTypes.includes('Path')) return 'path';
    if (componentTypes.includes('UI')) return 'ui';
    
    // Check for common component patterns
    if (componentTypes.includes('Transform') && componentTypes.includes('Renderable')) {
      return 'visual-entity';
    }
    
    return 'generic';
  }

  /**
   * Clone an entity (serialize then deserialize)
   */
  static clone(world: World, entity: Entity, options?: SerializationOptions & DeserializationOptions): Entity | null {
    const serialized = this.serialize(entity, options);
    return this.deserialize(world, serialized, options);
  }

  /**
   * Export entities to JSON string
   */
  static toJSON(entities: Entity | Entity[], options?: SerializationOptions): string {
    const data = Array.isArray(entities)
      ? this.serializeMany(entities, options)
      : this.serialize(entities, options);
    
    const indent = options?.prettyPrint ? (options?.indent ?? 2) : undefined;
    return JSON.stringify(data, undefined, indent);
  }

  /**
   * Import entities from JSON string
   */
  static fromJSON(
    world: World,
    json: string,
    options?: DeserializationOptions
  ): Entity[] {
    try {
      const data = JSON.parse(json, options?.reviver);
      
      if (Array.isArray(data)) {
        return this.deserializeMany(world, data, options);
      } else {
        const entity = this.deserialize(world, data, options);
        return entity ? [entity] : [];
      }
    } catch (error) {
      throw new SerializationError(
        `Failed to parse JSON: ${error}`,
        'deserialize',
        { json, error }
      );
    }
  }

  /**
   * Clear all registered factories (useful for testing)
   */
  static clear(): void {
    this.factories.clear();
    this.typeInferenceFn = null;
  }

  /**
   * Get statistics about registered entities
   */
  static getStats(): { totalFactories: number } {
    return {
      totalFactories: this.factories.size
    };
  }
}
