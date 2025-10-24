/**
 * InteractableComponent
 * 
 * Component for entities that can receive user input events like clicks and hovers.
 * Provides bounds checking and event callback support.
 * 
 * @example
 * ```typescript
 * const interactable = new InteractableComponent(100, 50, {
 *   onClick: (x, y) => console.log('Clicked at', x, y),
 *   shape: 'circle'
 * });
 * ```
 */

import { Component } from '../ecs/Component';

/** Callback function for interaction events */
export type InteractionCallback = (x: number, y: number, event?: PointerEvent) => void;

/** Shape type for bounds checking */
export type InteractionShape = 'rectangle' | 'circle';

export interface InteractableOptions {
  /** Callback when entity is clicked */
  onClick?: InteractionCallback;
  /** Callback when entity is hovered */
  onHover?: InteractionCallback;
  /** Callback when pointer enters bounds */
  onPointerEnter?: InteractionCallback;
  /** Callback when pointer leaves bounds */
  onPointerLeave?: InteractionCallback;
  /** Whether the entity is currently interactive */
  interactive?: boolean;
  /** Shape for bounds checking */
  shape?: InteractionShape;
  /** X offset from entity position */
  offsetX?: number;
  /** Y offset from entity position */
  offsetY?: number;
}

export class InteractableComponent extends Component {
  /** Click event callback */
  public onClick: InteractionCallback | null = null;
  
  /** Hover event callback */
  public onHover: InteractionCallback | null = null;
  
  /** Pointer enter callback */
  public onPointerEnter: InteractionCallback | null = null;
  
  /** Pointer leave callback */
  public onPointerLeave: InteractionCallback | null = null;
  
  /** Width of the interactive area (or radius for circle) */
  public readonly width: number;
  
  /** Height of the interactive area (ignored for circle) */
  public readonly height: number;
  
  /** Whether interaction is currently enabled */
  public interactive: boolean;
  
  /** Shape type for bounds checking */
  public shape: InteractionShape;
  
  /** X offset from entity position */
  public offsetX: number;
  
  /** Y offset from entity position */
  public offsetY: number;
  
  /** Whether pointer is currently over this entity */
  private _isHovered: boolean = false;

  /**
   * Create a new InteractableComponent
   * @param width - Width of interactive area (or radius for circle)
   * @param height - Height of interactive area (defaults to width for square)
   * @param options - Interaction options
   */
  constructor(width: number, height?: number, options?: InteractableOptions) {
    super();
    this.width = width;
    this.height = height ?? width;
    this.interactive = options?.interactive ?? true;
    this.shape = options?.shape ?? 'rectangle';
    this.offsetX = options?.offsetX ?? 0;
    this.offsetY = options?.offsetY ?? 0;
    
    if (options?.onClick) this.onClick = options.onClick;
    if (options?.onHover) this.onHover = options.onHover;
    if (options?.onPointerEnter) this.onPointerEnter = options.onPointerEnter;
    if (options?.onPointerLeave) this.onPointerLeave = options.onPointerLeave;
  }

  public getType(): string {
    return 'Interactable';
  }

  /**
   * Check if a point is inside the interactive bounds
   * @param x - Point X coordinate
   * @param y - Point Y coordinate
   * @param entityX - Entity X position
   * @param entityY - Entity Y position
   * @returns True if point is inside bounds
   */
  public isPointInside(x: number, y: number, entityX: number, entityY: number): boolean {
    if (!this.interactive) {
      return false;
    }

    const localX = entityX + this.offsetX;
    const localY = entityY + this.offsetY;

    if (this.shape === 'circle') {
      // Circle collision (width is used as radius)
      const dx = x - localX;
      const dy = y - localY;
      const distanceSquared = dx * dx + dy * dy;
      return distanceSquared <= this.width * this.width;
    } else {
      // Rectangle collision (AABB)
      return (
        x >= localX &&
        x <= localX + this.width &&
        y >= localY &&
        y <= localY + this.height
      );
    }
  }

  /**
   * Handle click event
   * @param x - Click X coordinate
   * @param y - Click Y coordinate
   * @param event - Original pointer event
   */
  public handleClick(x: number, y: number, event?: PointerEvent): void {
    if (this.interactive && this.onClick) {
      this.onClick(x, y, event);
    }
  }

  /**
   * Handle hover event
   * @param x - Hover X coordinate
   * @param y - Hover Y coordinate
   * @param event - Original pointer event
   */
  public handleHover(x: number, y: number, event?: PointerEvent): void {
    if (this.interactive && this.onHover) {
      this.onHover(x, y, event);
    }
  }

  /**
   * Handle pointer enter event
   * @param x - Pointer X coordinate
   * @param y - Pointer Y coordinate
   * @param event - Original pointer event
   */
  public handlePointerEnter(x: number, y: number, event?: PointerEvent): void {
    if (this.interactive && !this._isHovered) {
      this._isHovered = true;
      if (this.onPointerEnter) {
        this.onPointerEnter(x, y, event);
      }
    }
  }

  /**
   * Handle pointer leave event
   * @param x - Pointer X coordinate
   * @param y - Pointer Y coordinate
   * @param event - Original pointer event
   */
  public handlePointerLeave(x: number, y: number, event?: PointerEvent): void {
    if (this._isHovered) {
      this._isHovered = false;
      if (this.onPointerLeave) {
        this.onPointerLeave(x, y, event);
      }
    }
  }

  /**
   * Get whether pointer is currently hovering
   */
  public isHovered(): boolean {
    return this._isHovered;
  }

  /**
   * Enable interaction
   */
  public enable(): this {
    this.interactive = true;
    return this;
  }

  /**
   * Disable interaction
   */
  public disable(): this {
    this.interactive = false;
    this._isHovered = false;
    return this;
  }

  /**
   * Toggle interaction state
   */
  public toggle(): this {
    this.interactive = !this.interactive;
    if (!this.interactive) {
      this._isHovered = false;
    }
    return this;
  }

  /**
   * Set the shape for bounds checking
   * @param shape - 'rectangle' or 'circle'
   */
  public setShape(shape: InteractionShape): this {
    this.shape = shape;
    return this;
  }

  /**
   * Set the offset from entity position
   * @param x - X offset
   * @param y - Y offset
   */
  public setOffset(x: number, y: number): this {
    this.offsetX = x;
    this.offsetY = y;
    return this;
  }

  /**
   * Get the bounds as a rectangle (for debugging/visualization)
   * @param entityX - Entity X position
   * @param entityY - Entity Y position
   */
  public getBounds(entityX: number, entityY: number): { x: number; y: number; width: number; height: number } {
    return {
      x: entityX + this.offsetX,
      y: entityY + this.offsetY,
      width: this.width,
      height: this.height
    };
  }

  public override toString(): string {
    return `${super.toString()}\nInteractive: ${this.interactive}\nShape: ${this.shape}\nSize: ${this.width}x${this.height}\nOffset: (${this.offsetX}, ${this.offsetY})\nHovered: ${this._isHovered}`;
  }
}
