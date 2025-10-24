/**
 * SceneSerializer
 * 
 * Handles serialization and deserialization of complete scenes.
 * A scene contains metadata, configuration, and all entities in the world.
 * Improved with better validation, versioning, and flexible schema support.
 * 
 * @example
 * ```typescript
 * // Serialize current world as a scene
 * const scene = SceneSerializer.serializeWorld(world, metadata, config);
 * 
 * // Save to JSON
 * const json = SceneSerializer.toJSON(scene, { prettyPrint: true });
 * 
 * // Load from JSON
 * const scene = SceneSerializer.fromJSON(json);
 * 
 * // Deserialize into world
 * SceneSerializer.deserializeIntoWorld(world, scene);
 * ```
 */

import { World } from '../ecs/World';
import {
  SerializedScene,
  SceneMetadata,
  SerializationOptions,
  DeserializationOptions,
  SerializationError
} from './types';
import { EntitySerializer } from './EntitySerializer';

export interface SceneSerializerConfig {
  /** Validate scenes on load */
  validateOnLoad?: boolean;
  
  /** Validate scenes on save */
  validateOnSave?: boolean;
  
  /** Enable debug logging */
  debug?: boolean;
  
  /** Default schema version */
  defaultVersion?: string;
}

export class SceneSerializer {
  private static config: SceneSerializerConfig = {
    validateOnLoad: true,
    validateOnSave: true,
    debug: false,
    defaultVersion: '1.0.0'
  };

  /**
   * Configure the serializer
   */
  static configure(config: Partial<SceneSerializerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Serialize a world into a scene
   */
  static serializeWorld<TConfig = any>(
    world: World,
    metadata: Partial<SceneMetadata>,
    config?: TConfig,
    options?: SerializationOptions
  ): SerializedScene<TConfig> {
    try {
      // Serialize all entities in the world
      const entities = EntitySerializer.serializeMany(
        world.getAllEntities(),
        options
      );

      // Build complete metadata
      const completeMetadata: SceneMetadata = {
        id: metadata.id || this.generateId(),
        name: metadata.name || 'Untitled Scene',
        description: metadata.description || '',
        version: metadata.version || this.config.defaultVersion!,
        createdAt: metadata.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...metadata
      };

      const scene: SerializedScene<TConfig> = {
        metadata: completeMetadata,
        config: config as TConfig,
        entities
      };

      // Validate if configured
      if (this.config.validateOnSave && options?.validate !== false) {
        this.validate(scene);
      }

      return scene;
    } catch (error) {
      throw new SerializationError(
        `Failed to serialize world: ${error}`,
        'serialize',
        { error }
      );
    }
  }

  /**
   * Deserialize a scene into a world
   */
  static deserializeIntoWorld<TConfig = any>(
    world: World,
    scene: SerializedScene<TConfig>,
    options?: DeserializationOptions
  ): { entities: any[]; metadata: SceneMetadata; config: TConfig } {
    try {
      // Validate if configured
      if (this.config.validateOnLoad && options?.validate !== false) {
        this.validate(scene);
      }

      // Clear existing world if needed
      // Note: This is optional - caller might want to merge scenes
      // world.clear();

      // Deserialize all entities
      const entities = EntitySerializer.deserializeMany(
        world,
        scene.entities,
        options
      );

      if (this.config.debug) {
        console.log(`📦 Loaded scene "${scene.metadata.name}" with ${entities.length} entities`);
      }

      return {
        entities,
        metadata: scene.metadata,
        config: scene.config
      };
    } catch (error) {
      throw new SerializationError(
        `Failed to deserialize scene: ${error}`,
        'deserialize',
        { scene, error }
      );
    }
  }

  /**
   * Convert scene to JSON string
   */
  static toJSON<TConfig = any>(
    scene: SerializedScene<TConfig>,
    options?: SerializationOptions
  ): string {
    const indent = options?.prettyPrint ? (options?.indent ?? 2) : undefined;
    return JSON.stringify(scene, undefined, indent);
  }

  /**
   * Parse scene from JSON string
   */
  static fromJSON<TConfig = any>(
    json: string,
    options?: DeserializationOptions
  ): SerializedScene<TConfig> {
    try {
      const scene = JSON.parse(json, options?.reviver);
      
      // Validate if configured
      if (this.config.validateOnLoad && options?.validate !== false) {
        this.validate(scene);
      }
      
      return scene;
    } catch (error) {
      throw new SerializationError(
        `Failed to parse scene JSON: ${error}`,
        'deserialize',
        { json, error }
      );
    }
  }

  /**
   * Load a scene from a URL (fetch from server/file)
   */
  static async loadFromURL<TConfig = any>(
    url: string,
    options?: DeserializationOptions
  ): Promise<SerializedScene<TConfig>> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const json = await response.text();
      return this.fromJSON<TConfig>(json, options);
    } catch (error) {
      throw new SerializationError(
        `Failed to load scene from ${url}: ${error}`,
        'deserialize',
        { url, error }
      );
    }
  }

  /**
   * Validate a scene's structure
   */
  static validate<TConfig = any>(
    scene: SerializedScene<TConfig>
  ): boolean {
    const errors: string[] = [];

    // Validate metadata
    if (!scene.metadata) {
      errors.push('Missing metadata');
    } else {
      if (!scene.metadata.id) errors.push('metadata.id is required');
      if (!scene.metadata.name) errors.push('metadata.name is required');
      if (!scene.metadata.version) errors.push('metadata.version is required');
    }

    // Validate entities
    if (!Array.isArray(scene.entities)) {
      errors.push('entities must be an array');
    } else {
      scene.entities.forEach((entity, index) => {
        if (!entity.id) errors.push(`Entity ${index}: missing id`);
        if (!entity.name) errors.push(`Entity ${index}: missing name`);
        if (!entity.type) errors.push(`Entity ${index}: missing type`);
        if (!Array.isArray(entity.components)) {
          errors.push(`Entity ${index}: components must be an array`);
        }
      });
    }

    if (errors.length > 0) {
      const errorMessage = `Scene validation failed:\n${errors.join('\n')}`;
      throw new SerializationError(errorMessage, 'validate', { scene, errors });
    }

    return true;
  }

  /**
   * Create an empty scene template
   */
  static createTemplate<TConfig = any>(
    id: string,
    name: string,
    config?: TConfig
  ): SerializedScene<TConfig> {
    return {
      metadata: {
        id,
        name,
        description: 'A new scene',
        version: this.config.defaultVersion!,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: []
      },
      config: config ?? ({} as TConfig),
      entities: []
    };
  }

  /**
   * Merge multiple scenes into one
   */
  static merge<TConfig = any>(
    scenes: SerializedScene<TConfig>[],
    metadata: Partial<SceneMetadata>
  ): SerializedScene<TConfig> {
    if (scenes.length === 0) {
      throw new Error('Cannot merge empty scene array');
    }

    // Use first scene as base
    const base = scenes[0]!;
    
    // Collect all entities from all scenes
    const allEntities = scenes.flatMap(s => s.entities);

    // Merge configs (later scenes override earlier ones)
    const mergedConfig = Object.assign({}, ...scenes.map(s => s.config));

    return {
      metadata: {
        ...base.metadata,
        ...metadata,
        updatedAt: new Date().toISOString()
      },
      config: mergedConfig,
      entities: allEntities
    };
  }

  /**
   * Clone a scene (deep copy)
   */
  static clone<TConfig = any>(
    scene: SerializedScene<TConfig>,
    newId?: string,
    newName?: string
  ): SerializedScene<TConfig> {
    const json = this.toJSON(scene);
    const cloned = this.fromJSON<TConfig>(json);
    
    if (newId) cloned.metadata.id = newId;
    if (newName) cloned.metadata.name = newName;
    cloned.metadata.createdAt = new Date().toISOString();
    cloned.metadata.updatedAt = new Date().toISOString();
    
    return cloned;
  }

  /**
   * Get scene statistics
   */
  static getStats<TConfig = any>(
    scene: SerializedScene<TConfig>
  ): {
    entityCount: number;
    componentCount: number;
    entityTypes: Record<string, number>;
    size: number;
  } {
    const entityTypes: Record<string, number> = {};
    let componentCount = 0;

    for (const entity of scene.entities) {
      entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
      componentCount += entity.components.length;
    }

    const json = this.toJSON(scene);
    const size = new Blob([json]).size;

    return {
      entityCount: scene.entities.length,
      componentCount,
      entityTypes,
      size
    };
  }

  /**
   * Generate a unique scene ID
   */
  private static generateId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
