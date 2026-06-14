import type { ActionRequest, CombatEvent, ResolvedCombatAction } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';
import { CombatEngine } from '../engine/CombatEngine.js';
import { getCombatBalanceVersion, loadCombatBalanceConfig } from '../engine/combatBalanceConfig.js';
import { mapEventsForClient } from '../engine/combatEventCompat.js';

export type DispatchResult = {
  readonly events: readonly CombatEvent[];
  readonly state: CombatState;
  readonly balanceVersion: string;
};

/**
 * Gateway autoritativo de combate no servidor.
 * Entrada mínima: IDs de intenção (skill/consumível/alvo). Validação de persistence e sessão
 * ocorre em {@link CombatSession} antes de chamar dispatchAction; o motor só recebe ações já autorizadas.
 */
export class CombatGateway {
  private readonly engine: CombatEngine;

  constructor(initial: CombatState, playerActorId: string) {
    this.engine = new CombatEngine(initial, loadCombatBalanceConfig(), playerActorId);
  }

  public static create(initial: CombatState, playerActorId: string): CombatGateway {
    return new CombatGateway(initial, playerActorId);
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

  /** Dispatch de intenção já validada pela sessão — motor aplica regras de turno/PP/cooldown. */
  public dispatchAction(action: ResolvedCombatAction): DispatchResult {
    return this.toDispatchResult(this.engine.applyAction(action));
  }

  public forfeit(actorId: string): DispatchResult {
    return this.toDispatchResult(this.engine.forfeitActor(actorId));
  }

  public resolveTurnBatch(actions: readonly ResolvedCombatAction[]): DispatchResult {
    return this.toDispatchResult(this.engine.resolveTurn(actions));
  }

  public setRuneSpeedFlatConditional(actorId: string, amount: number): void {
    this.engine.setRuneSpeedFlatConditional(actorId, amount);
  }

  public updateRuneCharges(actorId: string, chargesRemaining: number): void {
    this.engine.updateRuneCharges(actorId, chargesRemaining);
  }

  /** PvE — jogador permanece em CHOOSING após round simultâneo resolvido por iniciativa. */
  public ensureChoosingActor(actorId: string): void {
    this.engine.ensureChoosingActor(actorId);
  }

  public setPetAllianceProgress(progress: {
    readonly alliancePlayerTurnsSincePet: number;
    readonly petAssistCycleIndex: number;
  }): void {
    this.engine.setPetAllianceProgress(progress);
  }

  private toDispatchResult(rawEvents: readonly CombatEvent[]): DispatchResult {
    return {
      events: mapEventsForClient(rawEvents),
      state: this.engine.getState(),
      balanceVersion: this.getBalanceVersion(),
    };
  }
}
