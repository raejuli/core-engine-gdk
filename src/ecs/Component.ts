/**
 * Core ECS Architecture - Component Base
 * 
 * Components are pure data containers that hold state.
 * They should not contain logic - that belongs in Systems.
 */

import type { World } from './World';

let nextComponentId = 0;

/**
 * Base Component class - data containers with no logic
 */
export abstract class Component {
  public readonly id: number;
  public entityId: number = -1;
  public enabled: boolean = true;
  private _world: World | null = null;

  constructor() {
    this.id = nextComponentId++;
  }

  /**
   * Get the type identifier for this component
   */
  public abstract getType(): string;

  /**
   * Set the world reference (called by Entity when component is added)
   */
  public setWorld(world: World): void {
    this._world = world;
  }

  /**
   * Get the world reference
   */
  protected getWorld(): World | null {
    return this._world;
  }

  /**
   * Get a sibling component from the same entity
   */
  protected getSiblingComponent<T extends Component>(componentType: string): T | null {
    if (!this._world || this.entityId < 0) {
      return null;
    }
    
    const entity = this._world.getEntity(this.entityId);
    if (!entity) {
      return null;
    }
    
    return entity.getComponent(componentType) as T | null;
  }

  /**
   * Convert component to string representation
   */
  public toString(): string | undefined {
    return `${this.getType()} [ID: ${this.id}, Entity: ${this.entityId}, Enabled: ${this.enabled}]`;
  }
}

/**
 * Component Type Definition for type-safe ECS
 * Used by the lightweight ECS implementation (mining-web style)
 */
export interface ComponentType<T> {
  key: symbol;
  name: string;
  create(initial?: Partial<T>): T;
}

/**
 * Create a component type definition
 * This is an alternative to class-based components for simpler use cases
 */
export function createComponentType<T>(name: string, defaults: () => T): ComponentType<T> {
  return {
    key: Symbol(name),
    name,
    create(initial?: Partial<T>) {
      return { ...defaults(), ...(initial ?? {}) };
    },
  };
}
