/**
 * Core Engine Types
 * 
 * Type definitions for the engine's main interfaces and contracts.
 */

import type { EventBusLike } from '../events/EventBus';
import type { InputManagerLike } from '../input/InputManager';
import type { ComponentType } from '../ecs/Component';

/**
 * Engine interface - contract for engine implementations
 */
export interface EngineLike {
  readonly time: number;
  readonly delta: number;
  getInput(): InputManagerLike;
  getEvents(): EventBusLike;
  setResource<T>(key: string, value: T): void;
  getResource<T>(key: string): T | undefined;
  ensureResource<T>(key: string, factory: () => T): T;
  addEntity(): number;
  removeEntity(entity: number): void;
  addComponent<T>(entity: number, component: ComponentType<T>, initial?: Partial<T>): T;
  getComponent<T>(entity: number, component: ComponentType<T>): T | undefined;
  hasComponent(entity: number, component: ComponentType<unknown>): boolean;
  removeComponent(entity: number, component: ComponentType<unknown>): void;
  updateComponent<T>(entity: number, component: ComponentType<T>, updater: (value: T) => void): void;
  forEachEntity(components: ComponentType<unknown>[], handler: (entity: number) => void): void;
}

/**
 * Engine configuration options
 */
export interface EngineOptions {
  canvas: HTMLCanvasElement;
  background?: string;
  pixelRatio?: number;
}
