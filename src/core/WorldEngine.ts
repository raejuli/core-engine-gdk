/**
 * World-based Game Engine
 * 
 * A game engine implementation that uses the class-based ECS (World, Entity, System).
 * Provides game loop management, PixiJS integration, and lifecycle events.
 */

import { Application, Container } from 'pixi.js';
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
  safeWidth?: number;
  safeHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
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
  
  public root!: Container; // View container for scaling/centering
  public stage!: Container; // The actual game stage
  
  private canvasElement!: HTMLCanvasElement;
  private safeWidth: number = 1280;
  private safeHeight: number = 960;
  private maxWidth: number = 1920;
  private maxHeight: number = 1080;
  private resizeObserver?: ResizeObserver;
  private parentElement: HTMLElement | null = null;
  private readonly handleResizeListener = () => this.handleResize();
  
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
    const width = options?.width ?? this.safeWidth;
    const height = options?.height ?? this.safeHeight;
    const backgroundColor = options?.backgroundColor ?? 0x1a1a2e;
    const antialias = options?.antialias ?? false;
    
    // Set safe area and max dimensions from options
    this.safeWidth = options?.safeWidth ?? width;
    this.safeHeight = options?.safeHeight ?? height;
    this.maxWidth = options?.maxWidth ?? this.safeWidth * 1.5;
    this.maxHeight = options?.maxHeight ?? this.safeHeight * 1.125;

    // Initialize PixiJS application with max dimensions
    await this.app.init({
      width: this.maxWidth,
      height: this.maxHeight,
      backgroundColor,
      antialias,
      resolution: window.devicePixelRatio || 1,
    });

    // Enable sorting by z-index
    this.app.stage.sortableChildren = true;

    // Create a container for scaling/centering
    const viewContainer = new Container();
    this.app.stage.addChild(viewContainer);
    this.root = viewContainer;

    // Create the actual game stage and add to container
    const gameStage = new Container();
    viewContainer.addChild(gameStage);
    this.stage = gameStage;
    
    // Store canvas element
    this.canvasElement = this.app.canvas as HTMLCanvasElement;

    // Append canvas to container
    container.appendChild(this.canvasElement);
    this.parentElement = this.canvasElement.parentElement;

    if (typeof ResizeObserver !== 'undefined' && this.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.parentElement);
    }

    // Store app as a resource
    this.resources.set('pixiApp', this.app);
    this.resources.set('pixiStage', this.stage);
    this.resources.set('pixiRoot', this.root);

    // Set up resize handling
    window.addEventListener('resize', this.handleResizeListener);
    window.addEventListener('orientationchange', this.handleResizeListener);
    this.handleResize();

    if (this.debug) {
      console.log(`🎮 WorldEngine initialized: Safe=${this.safeWidth}x${this.safeHeight}, Max=${this.maxWidth}x${this.maxHeight}`);
    }
  }

  /**
   * Handle window resize - scales and centers the game
   */
  private handleResize(): void {
    if (!this.canvasElement.parentElement) return;
    
    const parent = this.canvasElement.parentElement;
    const containerWidth = parent.clientWidth;
    const containerHeight = parent.clientHeight;
    
    if (containerWidth <= 0 || containerHeight <= 0) return;
    
    this.app.renderer.resize(containerWidth, containerHeight);

    // Calculate scale to fit safe area
    const scaleX = containerWidth / this.safeWidth;
    const scaleY = containerHeight / this.safeHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    // Calculate visible area (overdraw)
    const visibleWidth = Math.min(containerWidth / scale, this.maxWidth);
    const visibleHeight = Math.min(containerHeight / scale, this.maxHeight);

    // Center the root container in the viewport
    this.root.scale.set(scale, scale);
    this.root.x = (containerWidth - visibleWidth * scale) / 2;
    this.root.y = (containerHeight - visibleHeight * scale) / 2;

    // Center the stage (safe area) within the visible area
    this.stage.x = (visibleWidth - this.safeWidth) / 2;
    this.stage.y = (visibleHeight - this.safeHeight) / 2;

    // Update input manager with coordinate transformation
    // Input needs to account for: root offset + stage offset + scale
    const totalOffsetX = this.root.x + this.stage.x * scale;
    const totalOffsetY = this.root.y + this.stage.y * scale;
    this.input.setCoordinateTransform(scale, totalOffsetX, totalOffsetY);

    if (this.debug) {
      console.log(`🔄 Resize: ${containerWidth}x${containerHeight}, scale=${scale.toFixed(2)}`);
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
    
    // Listen for input on the canvas (for both keyboard and mouse)
    this.input.listen(this.app.canvas as HTMLCanvasElement);
    
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
    this.input.stopListening(this.app.canvas as HTMLCanvasElement);

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

    // Render (renders app.stage which contains root and stage)
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
    window.removeEventListener('resize', this.handleResizeListener);
    window.removeEventListener('orientationchange', this.handleResizeListener);
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.parentElement = null;
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
