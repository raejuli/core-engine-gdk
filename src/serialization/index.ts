/**
 * Serialization Module
 * 
 * Complete serialization system for entities, components, and scenes.
 * Supports versioning, migration, custom factories, and validation.
 */

export * from './types';
export * from './ComponentSerializer';
export * from './EntitySerializer';
export * from './SceneSerializer';

// Re-export for convenience
export {
  type ISerializable,
  type SerializedEntity,
  type SerializedComponent,
  type SerializedScene,
  type SceneMetadata,
  type EntityFactory,
  type ComponentFactory,
  type SerializationOptions,
  type DeserializationOptions,
  SerializationError
} from './types';
