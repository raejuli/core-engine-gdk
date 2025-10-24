/**
 * TransformComponent
 * 
 * Represents the spatial properties of an entity in 2D space.
 * Handles position, rotation, and scale transformations.
 * 
 * @example
 * ```typescript
 * const transform = new TransformComponent(100, 200);
 * transform.setPosition(150, 250);
 * transform.rotate(Math.PI / 4);
 * transform.setScale(2, 2);
 * ```
 */

import { Component } from '../ecs/Component';

export interface Vector2 {
  x: number;
  y: number;
}

export interface TransformOptions {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export class TransformComponent extends Component {
  /** X position in world space */
  public x: number;
  
  /** Y position in world space */
  public y: number;
  
  /** Rotation in radians */
  public rotation: number;
  
  /** Scale factor on X axis */
  public scaleX: number;
  
  /** Scale factor on Y axis */
  public scaleY: number;

  /**
   * Create a new TransformComponent
   * @param x - Initial X position (default: 0)
   * @param y - Initial Y position (default: 0)
   * @param options - Additional transform options
   */
  constructor(x: number = 0, y: number = 0, options?: TransformOptions) {
    super();
    this.x = options?.x ?? x;
    this.y = options?.y ?? y;
    this.rotation = options?.rotation ?? 0;
    this.scaleX = options?.scaleX ?? 1;
    this.scaleY = options?.scaleY ?? 1;
  }

  public getType(): string {
    return 'Transform';
  }

  /**
   * Set the position of the transform
   * @param x - New X position
   * @param y - New Y position
   */
  public setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Get position as a vector
   * @returns Vector2 containing x and y coordinates
   */
  public getPosition(): Vector2 {
    return { x: this.x, y: this.y };
  }

  /**
   * Translate the transform by a delta
   * @param dx - Delta X to add to current position
   * @param dy - Delta Y to add to current position
   */
  public translate(dx: number, dy: number): this {
    this.x += dx;
    this.y += dy;
    return this;
  }

  /**
   * Set the scale of the transform
   * @param x - Scale factor on X axis
   * @param y - Scale factor on Y axis (defaults to x for uniform scaling)
   */
  public setScale(x: number, y?: number): this {
    this.scaleX = x;
    this.scaleY = y ?? x;
    return this;
  }

  /**
   * Get scale as a vector
   * @returns Vector2 containing scaleX and scaleY
   */
  public getScale(): Vector2 {
    return { x: this.scaleX, y: this.scaleY };
  }

  /**
   * Set the rotation in radians
   * @param rotation - Rotation angle in radians
   */
  public setRotation(rotation: number): this {
    this.rotation = rotation;
    return this;
  }

  /**
   * Rotate by a delta angle
   * @param delta - Angle in radians to add to current rotation
   */
  public rotate(delta: number): this {
    this.rotation += delta;
    return this;
  }

  /**
   * Set rotation using degrees
   * @param degrees - Rotation angle in degrees
   */
  public setRotationDegrees(degrees: number): this {
    this.rotation = (degrees * Math.PI) / 180;
    return this;
  }

  /**
   * Get rotation in degrees
   * @returns Rotation angle in degrees
   */
  public getRotationDegrees(): number {
    return (this.rotation * 180) / Math.PI;
  }

  /**
   * Calculate distance to another transform
   * @param other - Another TransformComponent
   * @returns Distance in pixels
   */
  public distanceTo(other: TransformComponent): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster than distanceTo when exact distance not needed)
   * @param other - Another TransformComponent
   * @returns Squared distance
   */
  public distanceToSquared(other: TransformComponent): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return dx * dx + dy * dy;
  }

  /**
   * Get the forward direction vector based on rotation
   * @returns Normalized direction vector
   */
  public getForward(): Vector2 {
    return {
      x: Math.cos(this.rotation),
      y: Math.sin(this.rotation)
    };
  }

  /**
   * Look at a target position
   * @param targetX - Target X position
   * @param targetY - Target Y position
   */
  public lookAt(targetX: number, targetY: number): this {
    this.rotation = Math.atan2(targetY - this.y, targetX - this.x);
    return this;
  }

  /**
   * Copy values from another transform
   * @param other - Transform to copy from
   */
  public copyFrom(other: TransformComponent): this {
    this.x = other.x;
    this.y = other.y;
    this.rotation = other.rotation;
    this.scaleX = other.scaleX;
    this.scaleY = other.scaleY;
    return this;
  }

  /**
   * Clone this transform
   * @returns New TransformComponent with same values
   */
  public clone(): TransformComponent {
    return new TransformComponent(this.x, this.y, {
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY
    });
  }

  public override toString(): string {
    return `${super.toString()}\nPosition: (${this.x.toFixed(2)}, ${this.y.toFixed(2)})\nRotation: ${this.getRotationDegrees().toFixed(2)}°\nScale: (${this.scaleX.toFixed(2)}, ${this.scaleY.toFixed(2)})`;
  }
}
