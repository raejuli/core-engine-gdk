/**
 * Input Management System
 * 
 * Handles keyboard and mouse input state tracking with frame-accurate detection
 * of key presses, releases, mouse position, and mouse button states.
 */

/**
 * Mouse button codes
 */
export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
  Back = 3,
  Forward = 4
}

/**
 * InputManager interface
 */
export interface InputManagerLike {
  isPressed(code: string): boolean;
  isJustPressed(code: string): boolean;
  isJustReleased(code: string): boolean;
  isMouseButtonPressed(button: MouseButton): boolean;
  isMouseButtonJustPressed(button: MouseButton): boolean;
  isMouseButtonJustReleased(button: MouseButton): boolean;
  getMousePosition(): { x: number; y: number };
  beginFrame(): void;
  endFrame(): void;
}

/**
 * InputManager - Tracks keyboard and mouse input state
 * 
 * Usage:
 * - Call listen() with a canvas element to start listening
 * - Call beginFrame() at the start of each frame
 * - Call endFrame() at the end of each frame
 * - Query input state using isPressed, isJustPressed, isJustReleased
 * - Query mouse state using mouse-related methods
 */
export class InputManager implements InputManagerLike {
  // Keyboard state
  private pressed = new Set<string>();
  private pressedBuffer = new Set<string>();
  private releasedBuffer = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  
  // Mouse state
  private mouseX = 0;
  private mouseY = 0;
  private mouseButtons = new Set<number>();
  private mouseButtonsBuffer = new Set<number>();
  private mouseButtonsReleasedBuffer = new Set<number>();
  private mouseButtonsJustPressed = new Set<number>();
  private mouseButtonsJustReleased = new Set<number>();
  
  private listening = false;
  private canvas: HTMLCanvasElement | null = null;
  
  // Scaling properties for coordinate transformation
  private scaleX: number = 1;
  private scaleY: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;

  /**
   * Start listening for input events
   * @param element - Window, Document for keyboard, or HTMLCanvasElement for keyboard + mouse
   */
  listen(element: Window | Document | HTMLCanvasElement): void {
    if (this.listening) {
      return;
    }

    // Keyboard events
    element.addEventListener("keydown", this.handleKeyDown as EventListener, {
      passive: true,
    });
    element.addEventListener("keyup", this.handleKeyUp as EventListener, {
      passive: true,
    });
    
    // Mouse events (only for canvas elements)
    if (element instanceof HTMLCanvasElement) {
      this.canvas = element;
      
      element.addEventListener("mousemove", this.handleMouseMove as EventListener, {
        passive: true,
      });
      element.addEventListener("mousedown", this.handleMouseDown as EventListener, {
        passive: true,
      });
      element.addEventListener("mouseup", this.handleMouseUp as EventListener, {
        passive: true,
      });
      element.addEventListener("contextmenu", this.handleContextMenu as EventListener);
    }
    
    this.listening = true;
  }

  /**
   * Stop listening for input events
   * @param element - Window, Document, or HTMLCanvasElement that was passed to listen()
   */
  stopListening(element: Window | Document | HTMLCanvasElement): void {
    if (!this.listening) {
      return;
    }

    // Keyboard events
    element.removeEventListener("keydown", this.handleKeyDown as EventListener);
    element.removeEventListener("keyup", this.handleKeyUp as EventListener);
    
    // Mouse events
    if (element instanceof HTMLCanvasElement) {
      element.removeEventListener("mousemove", this.handleMouseMove as EventListener);
      element.removeEventListener("mousedown", this.handleMouseDown as EventListener);
      element.removeEventListener("mouseup", this.handleMouseUp as EventListener);
      element.removeEventListener("contextmenu", this.handleContextMenu as EventListener);
      this.canvas = null;
    }
    
    this.listening = false;
  }

  /**
   * Call at the beginning of each frame to update input state
   */
  beginFrame(): void {
    // Keyboard
    this.justPressed = new Set(this.pressedBuffer);
    this.justReleased = new Set(this.releasedBuffer);
    this.pressedBuffer.clear();
    this.releasedBuffer.clear();
    
    // Mouse
    this.mouseButtonsJustPressed = new Set(this.mouseButtonsBuffer);
    this.mouseButtonsJustReleased = new Set(this.mouseButtonsReleasedBuffer);
    this.mouseButtonsBuffer.clear();
    this.mouseButtonsReleasedBuffer.clear();
  }

  /**
   * Call at the end of each frame (hook for future needs)
   */
  endFrame(): void {
    // Intentional no-op for compatibility; hook for future needs.
  }

  /**
   * Check if a key is currently pressed
   * @param code - KeyboardEvent.code (e.g., "KeyW", "Space")
   */
  isPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  /**
   * Check if a key was just pressed this frame
   * @param code - KeyboardEvent.code (e.g., "KeyW", "Space")
   */
  isJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  /**
   * Check if a key was just released this frame
   * @param code - KeyboardEvent.code (e.g., "KeyW", "Space")
   */
  isJustReleased(code: string): boolean {
    return this.justReleased.has(code);
  }

  /**
   * Check if any key is pressed
   */
  isAnyKeyPressed(): boolean {
    return this.pressed.size > 0;
  }

  /**
   * Get all currently pressed keys
   */
  getPressedKeys(): string[] {
    return Array.from(this.pressed);
  }

  /**
   * Check if a mouse button is currently pressed
   * @param button - Mouse button (0 = left, 1 = middle, 2 = right)
   */
  isMouseButtonPressed(button: MouseButton): boolean {
    return this.mouseButtons.has(button);
  }

  /**
   * Check if a mouse button was just pressed this frame
   * @param button - Mouse button (0 = left, 1 = middle, 2 = right)
   */
  isMouseButtonJustPressed(button: MouseButton): boolean {
    return this.mouseButtonsJustPressed.has(button);
  }

  /**
   * Check if a mouse button was just released this frame
   * @param button - Mouse button (0 = left, 1 = middle, 2 = right)
   */
  isMouseButtonJustReleased(button: MouseButton): boolean {
    return this.mouseButtonsJustReleased.has(button);
  }

  /**
   * Get the current mouse position relative to the canvas
   * @returns Object with x and y coordinates
   */
  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  /**
   * Clear all input state
   */
  clear(): void {
    // Keyboard
    this.pressed.clear();
    this.pressedBuffer.clear();
    this.releasedBuffer.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    
    // Mouse
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseButtons.clear();
    this.mouseButtonsBuffer.clear();
    this.mouseButtonsReleasedBuffer.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseButtonsJustReleased.clear();
  }

  /**
   * Set coordinate transformation for scaled/offset canvas
   * Call this when the canvas scale or position changes
   */
  setCoordinateTransform(scale: number, offsetX: number, offsetY: number): void {
    this.scaleX = scale;
    this.scaleY = scale;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown = (event: KeyboardEvent) => {
    const { code } = event;
    if (!this.pressed.has(code)) {
      this.pressedBuffer.add(code);
    }
    this.pressed.add(code);
  };

  /**
   * Handle keyup events
   */
  private handleKeyUp = (event: KeyboardEvent) => {
    const { code } = event;
    if (this.pressed.has(code)) {
      this.releasedBuffer.add(code);
    }
    this.pressed.delete(code);
  };

  /**
   * Handle mouse move events
   */
  private handleMouseMove = (event: MouseEvent) => {
    if (!this.canvas) return;
    
    const rect = this.canvas.getBoundingClientRect();
    // Get mouse position relative to canvas
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    
    // Apply inverse transformation to account for scaling and offset
    x = (x - this.offsetX) / this.scaleX;
    y = (y - this.offsetY) / this.scaleY;
    
    this.mouseX = x;
    this.mouseY = y;
  };

  /**
   * Handle mouse down events
   */
  private handleMouseDown = (event: MouseEvent) => {
    const button = event.button;
    if (!this.mouseButtons.has(button)) {
      this.mouseButtonsBuffer.add(button);
    }
    this.mouseButtons.add(button);
  };

  /**
   * Handle mouse up events
   */
  private handleMouseUp = (event: MouseEvent) => {
    const button = event.button;
    if (this.mouseButtons.has(button)) {
      this.mouseButtonsReleasedBuffer.add(button);
    }
    this.mouseButtons.delete(button);
  };

  /**
   * Prevent context menu on right click
   */
  private handleContextMenu = (event: Event) => {
    event.preventDefault();
  };
}
