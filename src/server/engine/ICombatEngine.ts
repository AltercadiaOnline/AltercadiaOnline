import type { ActionRequest, CombatEvent } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';

/** Contrato público estável consumido pelo gateway e pelo front (via eventos). */
export interface ICombatEngine {
  getConfigVersion(): string;
  getState(): CombatState;
  startChoosing(activeActorId: string): CombatEvent[];
  computeEffectiveSpeed(actorId: string): number;
  resolveTurnOrder(requests: readonly ActionRequest[]): readonly ActionRequest[];
  applyAction(request: ActionRequest): CombatEvent[];
  resolveTurn(requests: readonly ActionRequest[]): CombatEvent[];
}
