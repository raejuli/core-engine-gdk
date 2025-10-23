/**
 * Lightweight Game Engine
 * 
 * A minimal, performant game engine with ECS architecture, integrated with PixiJS.
 * Based on the mining-web implementation.
 */

import { EventBus } from "../events/EventBus";
import { InputManager } from "../input/InputManager";
import type { ComponentType } from "../ecs/Component";
import type { EngineLike, EngineOptions } from "./types";
import type { SystemInterface, UpdateContext, RenderContext } from "../ecs/System";

type ComponentStore = Map<number, unknown>;

/**
 * Engine - Lightweight ECS engine with PixiJS integration
 * 
 * Features:
 * - Component-based entity system
 * - System registration and execution
 * - Resource management
 * - Input handling
 * - Event bus
 * - Frame loop management
 */
export class Engine implements EngineLike {
  private readonly systems: SystemInterface[] = [];
  private readonly componentStores = new Map<symbol, ComponentStore>();
  private readonly entityComponentKeys = new Map<number, Set<symbol>>();
  private readonly resources = new Map<string, unknown>();
  private readonly input = new InputManager();
  private readonly events = new EventBus();

  private readonly canvas: HTMLCanvasElement;
  private readonly background: string;
  private readonly pixelRatio: number;
  private readonly app: any; // PixiJS Application - injected by consumer
  private readonly ready: Promise<void>;
  private desiredWidth = 0;
  private desiredHeight = 0;
  private startRequested = false;

  private entityCounter = 1;
  private running = false;
  private lastTimestamp = 0;
  private elapsed = 0;
  private frameHandle = 0;
  private currentDelta = 0;

  constructor(options: EngineOptions) {
    this.canvas = options.canvas;
    this.background = options.background ?? "#05050a";
    this.pixelRatio = options.pixelRatio ?? window.devicePixelRatio ?? 1;

    this.canvas.style.display = "block";
    this.canvas.style.imageRendering = "pixelated";

    this.desiredWidth = this.canvas.clientWidth || this.canvas.width || 640;
    this.desiredHeight = this.canvas.clientHeight || this.canvas.height || 480;

    // Note: PixiJS Application must be imported and initialized by the consuming project
    // This keeps the engine flexible about which version of PixiJS to use
    // Import Application from 'pixi.js' in your project and pass it here
    const PixiApplication = (globalThis as any).PIXI?.Application;
    if (!PixiApplication) {
      throw new Error("PixiJS Application not found. Please ensure pixi.js is loaded.");
    }
    this.app = new PixiApplication();
    this.ready = this.app
      .init({
        canvas: this.canvas,
        background: this.background,
        antialias: false,
        resolution: this.pixelRatio,
      })
      .then(() => {
        this.app.ticker.stop();
        (this.app.stage as any).sortableChildren = true;
        this.setResource("pixiApp", this.app);
        if (this.desiredWidth > 0 && this.desiredHeight > 0) {
          this.app.renderer.resize(this.desiredWidth, this.desiredHeight);
        }
      })
      .catch((error: unknown) => {
        console.error("Failed to initialise Pixi renderer", error);
      });
  }

  /**
   * Get the total elapsed time in seconds
   */
  get time(): number {
    return this.elapsed;
  }

  /**
   * Get the delta time for the current frame
   */
  get delta(): number {
    return this.currentDelta;
  }

  /**
   * Get the input manager
   */
  getInput(): InputManager {
    return this.input;
  }

  /**
   * Get the event bus
   */
  getEvents(): EventBus {
    return this.events;
  }

  /**
   * Store a resource by key
   */
  setResource<T>(key: string, value: T): void {
    this.resources.set(key, value);
  }

  /**
   * Get a resource by key
   */
  getResource<T>(key: string): T | undefined {
    return this.resources.get(key) as T | undefined;
  }

  /**
   * Get or create a resource using a factory function
   */
  ensureResource<T>(key: string, factory: () => T): T {
    let value = this.resources.get(key) as T | undefined;
    if (value === undefined) {
      value = factory();
      this.resources.set(key, value);
    }
    return value;
  }

  /**
   * Create a new entity and return its ID
   */
  addEntity(): number {
    const id = this.entityCounter++;
    this.entityComponentKeys.set(id, new Set());
    return id;
  }

  /**
   * Remove an entity and all its components
   */
  removeEntity(entity: number): void {
    const keys = this.entityComponentKeys.get(entity);
    if (!keys) {
      return;
    }

    for (const key of keys) {
      const store = this.componentStores.get(key);
      store?.delete(entity);
    }

    this.entityComponentKeys.delete(entity);
  }

  /**
   * Add a component to an entity
   */
  addComponent<T>(entity: number, component: ComponentType<T>, initial?: Partial<T>): T {
    const store = this.getOrCreateStore(component);
    const value = component.create(initial);
    store.set(entity, value);
    this.entityComponentKeys.get(entity)?.add(component.key);
    return value;
  }

  /**
   * Get a component from an entity
   */
  getComponent<T>(entity: number, component: ComponentType<T>): T | undefined {
    return this.componentStores.get(component.key)?.get(entity) as T | undefined;
  }

  /**
   * Check if an entity has a component
   */
  hasComponent(entity: number, component: ComponentType<unknown>): boolean {
    return this.componentStores.get(component.key)?.has(entity) ?? false;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entity: number, component: ComponentType<unknown>): void {
    this.componentStores.get(component.key)?.delete(entity);
    this.entityComponentKeys.get(entity)?.delete(component.key);
  }

  /**
   * Update a component on an entity
   */
  updateComponent<T>(
    entity: number,
    component: ComponentType<T>,
    updater: (value: T) => void
  ): void {
    const value = this.getComponent(entity, component);
    if (!value) {
      throw new Error(`Component ${component.name} missing on entity ${entity}`);
    }
    updater(value);
  }

  /**
   * Iterate over all entities with specific components
   */
  forEachEntity(components: ComponentType<unknown>[], handler: (entity: number) => void): void {
    if (components.length === 0) {
      for (const entity of this.entityComponentKeys.keys()) {
        handler(entity);
      }
      return;
    }

    const stores = components.map((component) => this.getOrCreateStore(component));
    let smallestStore = stores[0];

    if (!smallestStore) {
      return;
    }

    for (const store of stores) {
      if (store.size < smallestStore.size) {
        smallestStore = store;
      }
    }

    for (const entity of smallestStore.keys()) {
      let matches = true;
      for (const component of components) {
        const store = this.componentStores.get(component.key);
        if (!store?.has(entity)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        handler(entity);
      }
    }
  }

  /**
   * Register a system
   */
  registerSystem(system: SystemInterface): void {
    this.systems.push(system);
    this.systems.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    system.onAttach?.(this);
  }

  /**
   * Start the engine
   */
  start(): void {
    if (this.running || this.startRequested) {
      return;
    }

    this.startRequested = true;
    void this.ready.then(() => {
      if (this.running) {
        return;
      }

      this.running = true;
      this.lastTimestamp = performance.now();
      this.input.listen(window);
      this.loop(this.lastTimestamp);
    });
  }

  /**
   * Stop the engine
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.input.stopListening(window);
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    this.desiredWidth = width;
    this.desiredHeight = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    void this.ready.then(() => {
      this.app.renderer.resize(width, height);
    });
  }

  /**
   * Main game loop
   */
  private loop = (timestamp: number) => {
    if (!this.running) {
      return;
    }

    this.frameHandle = requestAnimationFrame(this.loop);
    this.currentDelta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.25);
    this.lastTimestamp = timestamp;
    this.elapsed += this.currentDelta;

    this.input.beginFrame();

    const updateContext: UpdateContext = {
      engine: this,
      delta: this.currentDelta,
      elapsed: this.elapsed,
    };

    for (const system of this.systems) {
      system.update?.(updateContext);
    }

    this.render(updateContext);

    this.input.endFrame();
  };

  /**
   * Render the current frame
   */
  private render(context: UpdateContext): void {
    const renderContext: RenderContext = {
      engine: this,
      delta: context.delta,
      elapsed: context.elapsed,
    };

    for (const system of this.systems) {
      system.render?.(renderContext);
    }

    if (this.app.renderer) {
      this.app.render();
    }
  }

  /**
   * Get or create a component store
   */
  private getOrCreateStore(component: ComponentType<unknown>): ComponentStore {
    let store = this.componentStores.get(component.key);
    if (!store) {
      store = new Map();
      this.componentStores.set(component.key, store);
    }
    return store;
  }
}
