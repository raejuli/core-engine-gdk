/**
 * State Machine Implementation
 * 
 * A flexible state machine for managing game states, AI behavior, etc.
 */

/**
 * Base State class
 */
export abstract class State<T = any> {
  protected readonly _context: T;
  public readonly name: string;

  constructor(name: string, context: T) {
    this.name = name;
    this._context = context;
  }

  /**
   * Called when entering this state
   */
  public onEnter(_previousState?: State<T>): void {}

  /**
   * Called every frame while in this state
   */
  public onUpdate(_deltaTime: number): void {}

  /**
   * Called when exiting this state
   */
  public onExit(_nextState?: State<T>): void {}

  /**
   * Check if can transition to another state
   */
  public canTransitionTo(_stateName: string): boolean {
    return true;
  }

  /**
   * Get the context object
   */
  protected get context(): T {
    return this._context;
  }
}

/**
 * State Machine - Manages state transitions
 */
export class StateMachine<T = any> {
  private readonly _states: Map<string, State<T>> = new Map();
  private _currentState: State<T> | null = null;
  private readonly _context: T;
  private _transitionCallbacks: Array<(from: string | null, to: string) => void> = [];

  constructor(context: T) {
    this._context = context;
  }

  /**
   * Add a state to the machine
   */
  public addState(state: State<T>): void {
    this._states.set(state.name, state);
  }

  /**
   * Create and add a state
   */
  public createState(name: string, StateClass: new (name: string, context: T) => State<T>): State<T> {
    const state = new StateClass(name, this._context);
    this.addState(state);
    return state;
  }

  /**
   * Set the current state
   */
  public setState(stateName: string): boolean {
    const newState = this._states.get(stateName);
    if (!newState) {
      console.warn(`State ${stateName} not found`);
      return false;
    }

    if (this._currentState) {
      if (!this._currentState.canTransitionTo(stateName)) {
        return false;
      }
      this._currentState.onExit(newState);
    }

    const previousState = this._currentState;
    const previousStateName = previousState?.name || null;
    this._currentState = newState;
    this._currentState.onEnter(previousState || undefined);

    // Notify transition callbacks
    for (const callback of this._transitionCallbacks) {
      callback(previousStateName, stateName);
    }
    
    return true;
  }

  /**
   * Get current state name
   */
  public getCurrentStateName(): string | null {
    return this._currentState?.name || null;
  }

  /**
   * Get current state
   */
  public getCurrentState(): State<T> | null {
    return this._currentState;
  }

  /**
   * Update current state
   */
  public update(deltaTime: number): void {
    this._currentState?.onUpdate(deltaTime);
  }

  /**
   * Check if machine has a state
   */
  public hasState(stateName: string): boolean {
    return this._states.has(stateName);
  }

  /**
   * Get a state by name
   */
  public getState(stateName: string): State<T> | undefined {
    return this._states.get(stateName);
  }

  /**
   * Get all state names
   */
  public getStateNames(): string[] {
    return Array.from(this._states.keys());
  }

  /**
   * Register a callback for state transitions
   */
  public onTransition(callback: (from: string | null, to: string) => void): () => void {
    this._transitionCallbacks.push(callback);
    return () => {
      const index = this._transitionCallbacks.indexOf(callback);
      if (index > -1) {
        this._transitionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear all states
   */
  public clear(): void {
    if (this._currentState) {
      this._currentState.onExit();
    }
    this._currentState = null;
    this._states.clear();
  }
}
