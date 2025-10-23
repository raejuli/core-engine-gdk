/**
 * Input Management System
 * 
 * Handles keyboard and input state tracking with frame-accurate detection
 * of key presses and releases.
 */

/**
 * InputManager interface
 */
export interface InputManagerLike {
  isPressed(code: string): boolean;
  isJustPressed(code: string): boolean;
  isJustReleased(code: string): boolean;
  beginFrame(): void;
  endFrame(): void;
}

/**
 * InputManager - Tracks keyboard input state
 * 
 * Usage:
 * - Call beginFrame() at the start of each frame
 * - Call endFrame() at the end of each frame
 * - Query input state using isPressed, isJustPressed, isJustReleased
 */
export class InputManager implements InputManagerLike {
  private pressed = new Set<string>();
  private pressedBuffer = new Set<string>();
  private releasedBuffer = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();
  private listening = false;

  /**
   * Start listening for input events
   */
  listen(element: Window | Document): void {
    if (this.listening) {
      return;
    }

    element.addEventListener("keydown", this.handleKeyDown as EventListener, {
      passive: true,
    });
    element.addEventListener("keyup", this.handleKeyUp as EventListener, {
      passive: true,
    });
    this.listening = true;
  }

  /**
   * Stop listening for input events
   */
  stopListening(element: Window | Document): void {
    if (!this.listening) {
      return;
    }

    element.removeEventListener("keydown", this.handleKeyDown as EventListener);
    element.removeEventListener("keyup", this.handleKeyUp as EventListener);
    this.listening = false;
  }

  /**
   * Call at the beginning of each frame to update input state
   */
  beginFrame(): void {
    this.justPressed = new Set(this.pressedBuffer);
    this.justReleased = new Set(this.releasedBuffer);
    this.pressedBuffer.clear();
    this.releasedBuffer.clear();
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
   * Clear all input state
   */
  clear(): void {
    this.pressed.clear();
    this.pressedBuffer.clear();
    this.releasedBuffer.clear();
    this.justPressed.clear();
    this.justReleased.clear();
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
}
