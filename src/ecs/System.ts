/**
 * Core ECS Architecture - System Base
 * 
 * Systems contain the logic that operates on entities with specific components.
 * They should be stateless where possible, storing state in components instead.
 */

import type { Entity } from './Entity';
import type { World } from './World';
import type { EngineLike } from '../core/types';

/**
 * Base System class - contains logic that operates on entities with specific components
 */
export abstract class System {
  protected readonly _world: World;
  public enabled: boolean = true;
  public priority: number = 0;

  constructor(world: World) {
    this._world = world;
  }

  /**
   * Define which component types this system requires
   * Return an empty array if the system doesn't filter by components
   */
  public abstract getRequiredComponents(): string[];

  /**
   * Called once when system is initialized
   */
  public onInit(): void {}

  /**
   * Called every frame with delta time
   */
  public update(_deltaTime: number): void {}

  /**
   * Called when system is destroyed
   */
  public onDestroy(): void {}

  /**
   * Get all entities that match this system's requirements
   */
  protected getEntities(): Entity[] {
    const required = this.getRequiredComponents();
    return this._world.getEntitiesWithComponents(required);
  }

  /**
   * Get the world reference
   */
  protected getWorld(): World {
    return this._world;
  }
}

/**
 * Lightweight System interface for engine-based systems
 * Used by the Engine class (mining-web style)
 */
export interface SystemInterface {
  name: string;
  priority?: number;
  onAttach?(engine: EngineLike): void;
  update?(context: UpdateContext): void;
  render?(context: RenderContext): void;
}

/**
 * Update context passed to systems
 */
export interface UpdateContext {
  engine: EngineLike;
  delta: number;
  elapsed: number;
}

/**
 * Render context passed to systems
 */
export interface RenderContext {
  engine: EngineLike;
  delta: number;
  elapsed: number;
}
