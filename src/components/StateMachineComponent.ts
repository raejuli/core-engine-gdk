/**
 * StateMachineComponent
 * 
 * Component that wraps a StateMachine for entity behavior management.
 * Allows entities to have complex state-based behaviors managed by the ECS.
 * 
 * @example
 * ```typescript
 * interface EnemyContext {
 *   health: number;
 *   target: Entity | null;
 * }
 * 
 * const stateMachine = new StateMachineComponent<EnemyContext>({ health: 100, target: null });
 * stateMachine.stateMachine.addState('idle', idleState);
 * stateMachine.stateMachine.addState('chasing', chasingState);
 * stateMachine.stateMachine.transition('idle');
 * ```
 */

import { Component } from '../ecs/Component';
import { StateMachine } from '../state/StateMachine';

export interface StateMachineOptions<TContext> {
  /** Initial context for the state machine */
  context: TContext;
  /** Initial state name to transition to */
  initialState?: string;
  /** Enable debug logging */
  debug?: boolean;
}

export class StateMachineComponent<TContext = any> extends Component {
  /** The wrapped state machine instance */
  public readonly stateMachine: StateMachine<TContext>;
  
  /** Whether debug logging is enabled */
  public debug: boolean;

  /**
   * Create a new StateMachineComponent
   * @param context - Initial context object for the state machine
   * @param options - Additional options
   */
  constructor(context: TContext, options?: Omit<StateMachineOptions<TContext>, 'context'>);
  constructor(options: StateMachineOptions<TContext>);
  constructor(contextOrOptions: TContext | StateMachineOptions<TContext>, options?: Omit<StateMachineOptions<TContext>, 'context'>) {
    super();
    
    // Handle both constructor signatures
    let context: TContext;
    let opts: Omit<StateMachineOptions<TContext>, 'context'> | undefined;
    
    if (this.isOptions(contextOrOptions)) {
      context = contextOrOptions.context;
      opts = {
        initialState: contextOrOptions.initialState,
        debug: contextOrOptions.debug
      };
    } else {
      context = contextOrOptions;
      opts = options;
    }
    
    this.stateMachine = new StateMachine<TContext>(context);
    this.debug = opts?.debug ?? false;
    
    // Set initial state if provided
    if (opts?.initialState) {
      this.stateMachine.setState(opts.initialState);
    }
    
    if (this.debug) {
      console.log(`🎭 StateMachineComponent created with context:`, context);
    }
  }

  private isOptions(value: any): value is StateMachineOptions<TContext> {
    return value && typeof value === 'object' && 'context' in value;
  }

  public getType(): string {
    return 'StateMachine';
  }

  /**
   * Get the current state name
   */
  public getCurrentState(): string | null {
    return this.stateMachine.getCurrentStateName();
  }

  /**
   * Get the state machine context (access via stateMachine if needed)
   */
  public getContext(): TContext {
    return this.stateMachine['_context'];
  }

  /**
   * Update the state machine (should be called each frame)
   * @param deltaTime - Time elapsed since last update
   */
  public update(deltaTime: number): void {
    this.stateMachine.update(deltaTime);
    
    if (this.debug) {
      const currentState = this.getCurrentState();
      if (currentState) {
        console.log(`🎭 State: ${currentState}, dt: ${deltaTime.toFixed(3)}`);
      }
    }
  }

  /**
   * Transition to a new state
   * @param stateName - Name of the state to transition to
   * @returns True if transition was successful
   */
  public transition(stateName: string): boolean {
    if (this.debug) {
      const from = this.getCurrentState();
      console.log(`🎭 Transitioning: ${from || 'none'} -> ${stateName}`);
    }
    return this.stateMachine.setState(stateName);
  }

  /**
   * Check if currently in a specific state
   * @param stateName - State name to check
   */
  public isInState(stateName: string): boolean {
    return this.getCurrentState() === stateName;
  }

  /**
   * Check if a state exists in the state machine
   * @param stateName - State name to check
   */
  public hasState(stateName: string): boolean {
    return this.stateMachine.hasState(stateName);
  }

  /**
   * Get all registered state names
   */
  public getStateNames(): string[] {
    return this.stateMachine.getStateNames();
  }

  /**
   * Get count of registered states
   */
  public getStateCount(): number {
    return this.stateMachine.getStateNames().length;
  }

  /**
   * Enable debug logging
   */
  public enableDebug(): this {
    this.debug = true;
    return this;
  }

  /**
   * Disable debug logging
   */
  public disableDebug(): this {
    this.debug = false;
    return this;
  }

  public override toString(): string {
    const currentState = this.getCurrentState();
    const stateCount = this.getStateCount();
    const states = this.getStateNames().join(', ');
    
    return `${super.toString()}\nCurrent State: ${currentState || 'None'}\nTotal States: ${stateCount}\nStates: [${states}]\nDebug: ${this.debug}`;
  }
}
