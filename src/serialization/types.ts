/**
 * Serialization Types and Interfaces
 * 
 * Core types and interfaces for the game serialization system.
 * Provides type-safe serialization/deserialization for entities, components, and scenes.
 */

/**
 * Base interface for any object that can be serialized to/from JSON
 */
export interface ISerializable<T = any> {
  /**
   * Convert this object to a JSON-serializable format
   * @returns Serialized data
   */
  toJSON(): T;
  
  /**
   * Restore this object's state from JSON data
   * @param data - Serialized data to restore from
   */
  fromJSON(data: T): void;
}

/**
 * Represents a serialized entity
 */
export interface SerializedEntity {
  /** Unique identifier for the entity */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Entity type for categorization (e.g., 'tower', 'enemy', 'path') */
  type: string;
  
  /** Whether the entity is active */
  active: boolean;
  
  /** Array of serialized components */
  components: SerializedComponent[];
  
  /** Optional metadata */
  metadata?: Record<string, any>;
  
  /** Child entities for hierarchical structures */
  children?: SerializedEntity[];
}

/**
 * Represents a serialized component
 */
export interface SerializedComponent {
  /** Component type/class name */
  type: string;
  
  /** Component-specific data */
  data: Record<string, any>;
  
  /** Schema version for migration support */
  version?: string;
}

/**
 * Represents a serialized scene
 */
export interface SerializedScene<TConfig = any> {
  /** Scene metadata */
  metadata: SceneMetadata;
  
  /** Scene configuration */
  config: TConfig;
  
  /** All entities in the scene */
  entities: SerializedEntity[];
}

/**
 * Scene metadata
 */
export interface SceneMetadata {
  /** Unique scene identifier */
  id: string;
  
  /** Scene name */
  name: string;
  
  /** Scene description */
  description: string;
  
  /** Scene version for migration */
  version: string;
  
  /** Creation timestamp */
  createdAt?: string;
  
  /** Last modified timestamp */
  updatedAt?: string;
  
  /** Author information */
  author?: string;
  
  /** Tags for categorization */
  tags?: string[];
  
  /** Thumbnail URL or base64 */
  thumbnail?: string;
}

/**
 * Factory function type for creating entities from serialized data
 */
export type EntityFactory<T = any> = (data: SerializedEntity, context?: T) => any;

/**
 * Factory function type for creating components from serialized data
 */
export type ComponentFactory<T = any> = (data: SerializedComponent, context?: T) => any;

/**
 * Serialization options
 */
export interface SerializationOptions {
  /** Whether to pretty-print JSON */
  prettyPrint?: boolean;
  
  /** Custom indentation for pretty-print */
  indent?: number;
  
  /** Include metadata like timestamps */
  includeMetadata?: boolean;
  
  /** Validate data before serialization */
  validate?: boolean;
}

/**
 * Deserialization options
 */
export interface DeserializationOptions {
  /** Strict mode - fail on missing factories */
  strict?: boolean;
  
  /** Validate data after deserialization */
  validate?: boolean;
  
  /** Custom reviver function for JSON.parse */
  reviver?: (key: string, value: any) => any;
  
  /** Context to pass to factories */
  context?: any;
}

/**
 * Serialization error
 */
export class SerializationError extends Error {
  constructor(
    message: string,
    public readonly type: 'serialize' | 'deserialize' | 'validate',
    public readonly data?: any
  ) {
    super(message);
    this.name = 'SerializationError';
  }
}
