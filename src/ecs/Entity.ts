/**
 * Core ECS Architecture - Entity
 * 
 * An Entity is a unique identifier with a collection of Components.
 * Entities are processed by Systems based on their Component composition.
 */

import { Component } from './Component';
import type { World } from './World';

let nextEntityId = 0;

/**
 * Entity - Container for components with unique ID
 */
export class Entity {
  public readonly id: number;
  public name: string;
  public active: boolean = true;
  private _components: Map<string, Component> = new Map();
  private _componentsByType: Map<string, Component[]> = new Map();
  private _world: World | null = null;

  constructor(name: string = 'Entity') {
    this.id = nextEntityId++;
    this.name = name;
  }

  /**
   * Set the world reference (called by World when entity is added)
   */
  public setWorld(world: World): void {
    this._world = world;
    // Update all existing components
    for (const component of this._components.values()) {
      component.setWorld(world);
    }
  }

  /**
   * Get the world reference
   */
  public getWorld(): World | null {
    return this._world;
  }

  /**
   * Add a component to this entity
   */
  public addComponent<T extends Component>(component: T): T {
    const type = component.getType();
    component.entityId = this.id;

    // Set world reference on component if we have one
    if (this._world) {
      component.setWorld(this._world);
    }

    this._components.set(component.id.toString(), component);

    if (!this._componentsByType.has(type)) {
      this._componentsByType.set(type, []);
    }
    this._componentsByType.get(type)!.push(component);

    return component;
  }

  /**
   * Get a component by type (returns first match)
   */
  public getComponent<T extends Component>(type: string): T | undefined {
    const components = this._componentsByType.get(type);
    return components?.[0] as T | undefined;
  }

  /**
   * Get all components of a specific type
   */
  public getComponents<T extends Component>(type: string): T[] {
    return (this._componentsByType.get(type) as T[]) || [];
  }

  /**
   * Check if entity has a component of type
   */
  public hasComponent(type: string): boolean {
    return this._componentsByType.has(type) && this._componentsByType.get(type)!.length > 0;
  }

  /**
   * Remove a component
   */
  public removeComponent(component: Component): void {
    const type = component.getType();
    this._components.delete(component.id.toString());

    const typeComponents = this._componentsByType.get(type);
    if (typeComponents) {
      const index = typeComponents.indexOf(component);
      if (index > -1) {
        typeComponents.splice(index, 1);
      }
      if (typeComponents.length === 0) {
        this._componentsByType.delete(type);
      }
    }
  }

  /**
   * Remove all components of a specific type
   */
  public removeComponentsByType(type: string): void {
    const components = this._componentsByType.get(type);
    if (components) {
      for (const component of [...components]) {
        this.removeComponent(component);
      }
    }
  }

  /**
   * Get all components
   */
  public getAllComponents(): Component[] {
    return Array.from(this._components.values());
  }

  /**
   * Destroy entity - cleanup all components
   */
  public destroy(): void {
    // Destroy all components first
    for (const component of this._components.values()) {
      component.destroy();
    }

    this._world!.removeEntity(this);

    this._components.clear();
    this._componentsByType.clear();
    this.active = false;
    this._world = null;
  }

  /**
   * Convert entity to string representation
   */
  public toString(): string {
    const componentTypes = Array.from(this._componentsByType.keys()).join(', ');
    return `Entity "${this.name}" [ID: ${this.id}, Active: ${this.active}, Components: ${componentTypes}]`;
  }
}
