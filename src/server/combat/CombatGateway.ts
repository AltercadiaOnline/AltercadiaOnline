import type { ActionRequest, CombatEvent } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';
import { CombatEngine } from '../engine/CombatEngine.js';
import { getCombatBalanceVersion } from '../engine/combatBalanceConfig.js';
import { mapEventsForClient } from '../engine/combatEventCompat.js';

export type DispatchResult = {
  readonly events: readonly CombatEvent[];
  readonly state: CombatState;
  readonly balanceVersion: string;
};

/**
 * Gateway autoritativo de combate no servidor.
 * O cliente envia intenções (Dispatch/ActionRequest); o servidor responde com eventos + snapshot.
 */
export class CombatGateway {
  private readonly engine: CombatEngine;

  constructor(initial: CombatState) {
    this.engine = new CombatEngine(initial);
  }

  public static create(initial: CombatState): CombatGateway {
    return new CombatGateway(initial);
  }

  public getBalanceVersion(): string {
    return getCombatBalanceVersion();
  }

  public getState(): CombatState {
    return this.engine.getState();
  }

  public startBattle(activeActorId: string): DispatchResult {
    return this.toDispatchResult(this.engine.startChoosing(activeActorId));
  }

  /** Dispatch de intenção do jogador (protocolo atual). */
  public dispatchAction(action: ActionRequest): DispatchResult {
    return this.toDispatchResult(this.engine.applyAction(action));
  }

  public resolveTurnBatch(actions: readonly ActionRequest[]): DispatchResult {
    return this.toDispatchResult(this.engine.resolveTurn(actions));
  }

  private toDispatchResult(rawEvents: readonly CombatEvent[]): DispatchResult {
    return {
      events: mapEventsForClient(rawEvents),
      state: this.engine.getState(),
      balanceVersion: this.getBalanceVersion(),
    };
  }
}
