/**
 * Core ECS Architecture - World/EntityManager
 * 
 * The World manages all entities and systems, coordinating their lifecycle
 * and providing query methods for efficient entity lookup.
 */

import { Entity } from './Entity';
import { System } from './System';

/**
 * World - Manages all entities and systems
 */
export class World {
  private _entities: Map<number, Entity> = new Map();
  private _systems: System[] = [];
  private _entitiesToAdd: Entity[] = [];
  private _entitiesToRemove: Entity[] = [];
  private _isUpdating: boolean = false;

  /**
   * Add an entity to the world
   */
  public addEntity(entity: Entity): Entity {
    entity.setWorld(this);
    if (this._isUpdating) {
      this._entitiesToAdd.push(entity);
    } else {
      this._entities.set(entity.id, entity);
    }
    return entity;
  }

  /**
   * Create and add a new entity
   */
  public createEntity(name?: string): Entity {
    const entity = new Entity(name);
    this.addEntity(entity);
    return entity;
  }

  /**
   * Remove an entity from the world
   */
  public removeEntity(entity: Entity): void {
    // Mark as inactive immediately so systems stop processing it
    entity.active = false;
    if (this._isUpdating) {
      this._entitiesToRemove.push(entity);
    } else {
      this._performEntityRemoval(entity);
    }
  }

  /**
   * Get entity by ID
   */
  public getEntity(id: number): Entity | undefined {
    return this._entities.get(id);
  }

  /**
   * Get all active entities
   */
  public getAllEntities(): Entity[] {
    return Array.from(this._entities.values()).filter(e => e.active);
  }

  /**
   * Get entities with specific components
   */
  public getEntitiesWithComponents(componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) {
      return this.getAllEntities();
    }

    return this.getAllEntities().filter(entity => {
      return componentTypes.every(type => entity.hasComponent(type));
    });
  }

  /**
   * Query entities with any of the specified components
   */
  public getEntitiesWithAnyComponent(componentTypes: string[]): Entity[] {
    if (componentTypes.length === 0) {
      return this.getAllEntities();
    }

    return this.getAllEntities().filter(entity => {
      return componentTypes.some(type => entity.hasComponent(type));
    });
  }

  /**
   * Add a system to the world
   */
  public addSystem(system: System): System {
    this._systems.push(system);
    this._systems.sort((a, b) => a.priority - b.priority);
    system.onInit();
    return system;
  }

  /**
   * Remove a system
   */
  public removeSystem(system: System): void {
    const index = this._systems.indexOf(system);
    if (index > -1) {
      system.onDestroy();
      this._systems.splice(index, 1);
    }
  }

  /**
   * Get a system by type
   */
  public getSystem<T extends System>(systemType: new (world: World, ...rest: any[]) => T): T | undefined {
    return this._systems.find(s => s instanceof systemType) as T | undefined;
  }

  /**
   * Get all systems
   */
  public getAllSystems(): System[] {
    return [...this._systems];
  }

  /**
   * Update all systems
   */
  public update(deltaTime: number): void {
    this._isUpdating = true;

    // Update all enabled systems
    for (const system of this._systems) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }

    this._isUpdating = false;

    // Process pending additions/removals
    this._processPendingChanges();
  }

  /**
   * Process pending entity additions and removals
   */
  private _processPendingChanges(): void {
    // Add new entities
    for (const entity of this._entitiesToAdd) {
      this._entities.set(entity.id, entity);
    }
    this._entitiesToAdd = [];

    // Remove entities
    for (const entity of this._entitiesToRemove) {
      this._performEntityRemoval(entity);
    }
    this._entitiesToRemove = [];
  }

  /**
   * Actually remove an entity from the world
   */
  private _performEntityRemoval(entity: Entity): void {
    entity.destroy();
    this._entities.delete(entity.id);
  }

  /**
   * Destroy the world and cleanup
   */
  public destroy(): void {
    // Destroy all systems
    for (const system of this._systems) {
      system.onDestroy();
    }
    this._systems = [];

    // Destroy all entities
    for (const entity of this._entities.values()) {
      entity.destroy();
    }
    this._entities.clear();
    this._entitiesToAdd = [];
    this._entitiesToRemove = [];
  }

  /**
   * Get statistics about the world
   */
  public getStats(): { entities: number; systems: number; activeEntities: number } {
    return {
      entities: this._entities.size,
      activeEntities: this.getAllEntities().length,
      systems: this._systems.length,
    };
  }
}
