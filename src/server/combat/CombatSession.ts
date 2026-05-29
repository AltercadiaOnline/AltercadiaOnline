import { buildCombatUiHints, type CombatDispatchPayload } from '../../shared/combatWire.js';
import type { ActionRequest, CombatEvent } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';
import { CombatGateway, type DispatchResult } from './CombatGateway.js';

const MAX_TRACKED_REQUEST_IDS = 256;

export type CombatSessionRejectReason =
  | 'NOT_YOUR_ACTOR'
  | 'INVALID_BATTLE'
  | 'DUPLICATE_REQUEST'
  | 'BATTLE_ENDED';

export type CombatSessionResult =
  | { readonly ok: true; readonly payload: CombatDispatchPayload }
  | { readonly ok: false; readonly reason: CombatSessionRejectReason };

/**
 * Sessão autoritativa: uma batalha por conexão, validação antes do gateway.
 */
export class CombatSession {
  private readonly gateway: CombatGateway;
  private readonly playerActorId: string;
  private readonly processedRequestIds = new Set<string>();

  constructor(playerActorId: string, initial: CombatState) {
    this.playerActorId = playerActorId;
    this.gateway = CombatGateway.create(initial);
  }

  public getPlayerActorId(): string {
    return this.playerActorId;
  }

  public start(): CombatDispatchPayload {
    return this.toPayload(this.gateway.startBattle(this.playerActorId));
  }

  public dispatchPlayerAction(action: ActionRequest): CombatSessionResult {
    const gate = this.validatePlayerAction(action);
    if (!gate.ok) return gate;

    this.rememberRequestId(action.requestId);

    const mergedEvents: CombatEvent[] = [];
    let last = this.gateway.dispatchAction(action);
    mergedEvents.push(...last.events);

    const enemyTurn = this.resolveEnemyTurns();
    if (enemyTurn) {
      mergedEvents.push(...enemyTurn.events);
      last = enemyTurn;
    }

    return {
      ok: true,
      payload: this.toPayload({
        events: mergedEvents,
        state: last.state,
        balanceVersion: last.balanceVersion,
      }),
    };
  }

  private validatePlayerAction(
    action: ActionRequest,
  ): CombatSessionResult | { readonly ok: true } {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    if (action.actorId !== this.playerActorId) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (action.battleId !== state.battleId) {
      return { ok: false, reason: 'INVALID_BATTLE' };
    }
    if (this.processedRequestIds.has(action.requestId)) {
      return { ok: false, reason: 'DUPLICATE_REQUEST' };
    }
    return { ok: true };
  }

  private rememberRequestId(requestId: string): void {
    this.processedRequestIds.add(requestId);
    if (this.processedRequestIds.size > MAX_TRACKED_REQUEST_IDS) {
      const oldest = this.processedRequestIds.values().next().value;
      if (oldest !== undefined) this.processedRequestIds.delete(oldest);
    }
  }

  /** IA mínima: inimigo usa primeira skill enquanto for a vez dele. */
  private resolveEnemyTurns(): DispatchResult | null {
    let safety = 8;
    const mergedEvents: CombatEvent[] = [];
    let last: DispatchResult | null = null;

    while (safety-- > 0) {
      const state = this.gateway.getState();
      if (state.phase !== 'CHOOSING' || state.activeActorId === null) break;
      if (state.activeActorId === this.playerActorId) break;

      const enemyId = state.activeActorId;
      const enemy = state.combatants[enemyId];
      const skill = enemy?.skills[0];
      if (!skill) break;

      const aiAction: ActionRequest = {
        battleId: state.battleId,
        actorId: enemyId,
        turn: state.turn,
        skillId: skill.id,
        requestId: `ai-${state.battleId}-${state.turn}-${enemyId}-${safety}`,
      };

      last = this.gateway.dispatchAction(aiAction);
      mergedEvents.push(...last.events);
      if (last.state.phase === 'ENDED') break;
    }

    if (!last || mergedEvents.length === 0) return null;
    return { events: mergedEvents, state: last.state, balanceVersion: last.balanceVersion };
  }

  private toPayload(result: DispatchResult): CombatDispatchPayload {
    return {
      events: result.events,
      state: result.state,
      balanceVersion: result.balanceVersion,
      ui: buildCombatUiHints(result.state, this.playerActorId),
    };
  }
}
