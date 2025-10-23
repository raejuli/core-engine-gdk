/**
 * World-based Game Engine
 * 
 * A game engine implementation that uses the class-based ECS (World, Entity, System).
 * Provides game loop management, PixiJS integration, and lifecycle events.
 */

import { Application } from 'pixi.js';
import { World } from '../ecs/World';
import { EventBus } from '../events/EventBus';
import { InputManager } from '../input/InputManager';
import { ResourceManager } from '../services/ResourceManager';

export interface WorldEngineOptions {
  width?: number;
  height?: number;
  backgroundColor?: number | string;
  antialias?: boolean;
  debug?: boolean;
}

/**
 * Engine lifecycle events
 */
export interface EngineUpdateEvent {
  deltaTime: number;
  timestamp: number;
}

/**
 * WorldEngine - Game engine for class-based ECS architecture
 * 
 * Features:
 * - Automatic game loop management
 * - PixiJS Application integration
 * - World and System lifecycle management
 * - Event bus for decoupled communication
 * - Resource storage
 * 
 * Lifecycle Events:
 * - 'engine:preUpdate' - Fired before world update
 * - 'engine:postUpdate' - Fired after world update
 * - 'engine:preRender' - Fired before rendering
 * - 'engine:postRender' - Fired after rendering
 * - 'engine:started' - Fired when engine starts
 * - 'engine:stopped' - Fired when engine stops
 */
export class WorldEngine {
  public readonly app: Application;
  public readonly world: World;
  public readonly events: EventBus;
  public readonly input: InputManager;
  public readonly resources: ResourceManager;
  
  private running = false;
  private lastTime = 0;
  private frameHandle = 0;
  public debug = false;

  constructor(options: WorldEngineOptions = {}) {
    this.app = new Application();
    this.world = new World();
    this.events = new EventBus();
    this.input = new InputManager();
    this.resources = new ResourceManager();
    this.debug = options.debug ?? false;
    
    if (this.debug) {
      console.log('🎮 WorldEngine initialized in debug mode');
    }
  }

  /**
   * Initialize the engine with a container element
   */
  public async initialize(container: HTMLElement, options?: WorldEngineOptions): Promise<void> {
    const width = options?.width ?? 800;
    const height = options?.height ?? 600;
    const backgroundColor = options?.backgroundColor ?? 0x1a1a2e;
    const antialias = options?.antialias ?? false;

    // Initialize PixiJS application
    await this.app.init({
      width,
      height,
      backgroundColor,
      antialias,
      resolution: window.devicePixelRatio || 1,
    });

    // Enable sorting by z-index
    this.app.stage.sortableChildren = true;

    // Append canvas to container
    container.appendChild(this.app.canvas);

    // Store app as a resource
    this.resources.set('pixiApp', this.app);
    this.resources.set('pixiStage', this.app.stage);

    if (this.debug) {
      console.log(`🎮 WorldEngine initialized: ${width}x${height}`);
    }
  }

  /**
   * Start the game loop
   */
  public start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTime = performance.now();
    this.input.listen(window);
    this.loop(this.lastTime);

    // Emit started event
    this.events.emit('engine:started', {});

    if (this.debug) {
      console.log('▶️ WorldEngine started');
    }
  }

  /**
   * Stop the game loop
   */
  public stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    cancelAnimationFrame(this.frameHandle);
    this.input.stopListening(window);

    // Emit stopped event
    this.events.emit('engine:stopped', {});

    if (this.debug) {
      console.log('⏸️ WorldEngine stopped');
    }
  }

  /**
   * Main game loop
   */
  private loop = (timestamp: number): void => {
    if (!this.running) {
      return;
    }

    this.frameHandle = requestAnimationFrame(this.loop);
    
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Update input state
    this.input.beginFrame();

    // Emit pre-update event
    const updateEvent: EngineUpdateEvent = { deltaTime, timestamp };
    this.events.emit('engine:preUpdate', updateEvent);

    // Update world (which updates all systems)
    this.world.update(deltaTime);

    // Emit post-update event
    this.events.emit('engine:postUpdate', updateEvent);

    // Emit pre-render event
    this.events.emit('engine:preRender', updateEvent);

    // Render
    this.app.renderer.render(this.app.stage);

    // Emit post-render event
    this.events.emit('engine:postRender', updateEvent);

    // End frame
    this.input.endFrame();
  };

  /**
   * Resize the canvas
   */
  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
    
    if (this.debug) {
      console.log(`🔄 WorldEngine resized: ${width}x${height}`);
    }
  }

  /**
   * Destroy the engine and cleanup
   */
  public destroy(): void {
    this.stop();
    this.world.destroy();
    this.app.destroy(true, { children: true, texture: true });
    this.events.clear();
    this.input.clear();
    this.resources.clear();

    if (this.debug) {
      console.log('🗑️ WorldEngine destroyed');
    }
  }

  /**
   * Get engine statistics
   */
  public getStats(): {
    entities: number;
    activeEntities: number;
    systems: number;
    running: boolean;
  } {
    const worldStats = this.world.getStats();
    return {
      ...worldStats,
      running: this.running,
    };
  }
}
