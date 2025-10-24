/**
 * State Machine System
 * 
 * Updates all entities with StateMachineComponent, calling their state machine update methods.
 * This system allows entities to have complex state-based behavior managed through the ECS.
 */

import { StateMachineComponent } from '../components/StateMachineComponent';
import { System } from '../ecs/System';
import { World } from '../ecs/World';

export class StateMachineSystem extends System {
  constructor(world: World) {
    super(world);
    this.priority = 0; // Normal priority
  }

  getRequiredComponents(): string[] {
    return ['StateMachine'];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const smComponent = entity.getComponent<StateMachineComponent>('StateMachine')!;
      
      if (smComponent.enabled) {
        smComponent.stateMachine.update(deltaTime);
      }
    }
  }
}
