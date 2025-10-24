/**
 * RenderableComponent
 * 
 * Component for entities that can be rendered using PixiJS Graphics.
 * Manages a Graphics object and provides rendering properties like visibility and z-index.
 * 
 * @example
 * ```typescript
 * const renderable = new RenderableComponent({ zIndex: 10 });
 * renderable.graphics.beginFill(0xFF0000);
 * renderable.graphics.drawCircle(0, 0, 50);
 * renderable.setVisible(true);
 * ```
 */

import { Component } from '../ecs/Component';
import { Graphics, Container } from 'pixi.js';

export interface RenderableOptions {
  /** Initial visibility state */
  visible?: boolean;
  /** Z-index for render ordering */
  zIndex?: number;
  /** Alpha transparency (0-1) */
  alpha?: number;
  /** Tint color (0xRRGGBB) */
  tint?: number;
}

export class RenderableComponent extends Component {
  /** PixiJS Graphics object for drawing */
  public readonly graphics: Graphics;
  
  /** Whether the entity should be rendered */
  public visible: boolean;
  
  /** Z-index for rendering order (higher = rendered on top) */
  public zIndex: number;
  
  /** Alpha transparency (0 = fully transparent, 1 = fully opaque) */
  public alpha: number;
  
  /** Color tint to apply to the graphics */
  public tint: number;

  /**
   * Create a new RenderableComponent
   * @param options - Rendering options
   */
  constructor(options?: RenderableOptions) {
    super();
    this.graphics = new Graphics();
    this.visible = options?.visible ?? true;
    this.zIndex = options?.zIndex ?? 0;
    this.alpha = options?.alpha ?? 1;
    this.tint = options?.tint ?? 0xFFFFFF;
    
    // Apply initial properties to graphics
    this.graphics.visible = this.visible;
    this.graphics.alpha = this.alpha;
    this.graphics.tint = this.tint;
  }

  public getType(): string {
    return 'Renderable';
  }

  /**
   * Set the visibility of the graphics
   * @param visible - Whether the graphics should be visible
   */
  public setVisible(visible: boolean): this {
    this.visible = visible;
    this.graphics.visible = visible;
    return this;
  }

  /**
   * Set the alpha transparency
   * @param alpha - Alpha value between 0 (transparent) and 1 (opaque)
   */
  public setAlpha(alpha: number): this {
    this.alpha = Math.max(0, Math.min(1, alpha));
    this.graphics.alpha = this.alpha;
    return this;
  }

  /**
   * Set the color tint
   * @param tint - Hex color value (e.g., 0xFF0000 for red)
   */
  public setTint(tint: number): this {
    this.tint = tint;
    this.graphics.tint = tint;
    return this;
  }

  /**
   * Set the z-index for render ordering
   * @param zIndex - Z-index value (higher values render on top)
   */
  public setZIndex(zIndex: number): this {
    this.zIndex = zIndex;
    this.graphics.zIndex = zIndex;
    return this;
  }

  /**
   * Show the graphics (shorthand for setVisible(true))
   */
  public show(): this {
    return this.setVisible(true);
  }

  /**
   * Hide the graphics (shorthand for setVisible(false))
   */
  public hide(): this {
    return this.setVisible(false);
  }

  /**
   * Toggle visibility
   */
  public toggle(): this {
    return this.setVisible(!this.visible);
  }

  /**
   * Clear all graphics drawings
   */
  public clear(): this {
    this.graphics.clear();
    return this;
  }

  /**
   * Add graphics to a container
   * @param container - PixiJS Container to add graphics to
   */
  public addTo(container: Container): this {
    container.addChild(this.graphics);
    return this;
  }

  /**
   * Remove graphics from its parent container
   */
  public removeFromParent(): this {
    if (this.graphics.parent) {
      this.graphics.parent.removeChild(this.graphics);
    }
    return this;
  }

  /**
   * Check if graphics is added to a container
   */
  public hasParent(): boolean {
    return this.graphics.parent !== null;
  }

  /**
   * Fade in animation helper
   * @param duration - Duration in milliseconds
   * @param onComplete - Callback when fade completes
   */
  public fadeIn(duration: number, onComplete?: () => void): void {
    const startAlpha = 0;
    const endAlpha = 1;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.setAlpha(startAlpha + (endAlpha - startAlpha) * progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    };
    
    this.setVisible(true);
    animate();
  }

  /**
   * Fade out animation helper
   * @param duration - Duration in milliseconds
   * @param onComplete - Callback when fade completes
   */
  public fadeOut(duration: number, onComplete?: () => void): void {
    const startAlpha = this.alpha;
    const endAlpha = 0;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.setAlpha(startAlpha + (endAlpha - startAlpha) * progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.setVisible(false);
        if (onComplete) {
          onComplete();
        }
      }
    };
    
    animate();
  }

  /**
   * Cleanup graphics resources
   */
  public destroy(): void {
    // Remove from parent container first
    this.removeFromParent();
    // Then destroy the graphics object
    this.graphics.destroy();
  }

  public override toString(): string {
    return `${super.toString()}\nVisible: ${this.visible}\nZ-Index: ${this.zIndex}\nAlpha: ${this.alpha.toFixed(2)}\nTint: 0x${this.tint.toString(16).padStart(6, '0').toUpperCase()}`;
  }
}
