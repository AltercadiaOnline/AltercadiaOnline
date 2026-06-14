import { extractCombatActionIntentResult } from '../../../shared/combat/combatIntentFeedback.js';
import { buildCombatVisualFeedback } from '../../../shared/combat/combatVisualFeedback.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../../../shared/combatWire.js';
import type { CombatRuleManifest } from '../../../shared/combat/combatRuleManifest.js';
import { CombatEventType, type ActionRequest, type CombatEvent } from '../../../shared/events.js';
import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import type { CombatState } from '../../../shared/types.js';
import { CombatGateway, type DispatchResult } from '../CombatGateway.js';
import { BattleManager } from '../../../shared/combat/BattleEngine.js';
import {
  cloneManifest,
  remainingRuneCharges,
  resolveSkillRuneTrigger,
  tryConsumeRuneCharge,
  type MutableCombatRuleManifest,
} from '../runeCombat.js';
import { computeConsumableHeal } from '../buildCombatantFromLoadout.js';
import { isReactiveConsumableAction } from '../../../shared/combat/potionSaturation.js';
import { loadCombatBalanceConfig } from '../../engine/combatBalanceConfig.js';
import { consumeConsumableInCombat } from '../../../Economy/economyGateway.js';

const MAX_TRACKED_REQUEST_IDS = 256;

export type PvpCombatSessionRejectReason =
  | 'NOT_YOUR_ACTOR'
  | 'INVALID_BATTLE'
  | 'DUPLICATE_REQUEST'
  | 'BATTLE_ENDED'
  | 'INVALID_CONSUMABLE';

export type PvpCombatSessionResult =
  | { readonly ok: true; readonly payload: CombatDispatchPayload }
  | { readonly ok: false; readonly reason: PvpCombatSessionRejectReason };

export type PvpCombatSessionOptions = {
  readonly characterId?: number;
  readonly ruleManifest?: CombatRuleManifest;
  readonly loadout?: PlayerCombatLoadout;
  readonly duelistId: string;
  readonly botActorId: string;
};

/**
 * Sessão PVP 1×1 — isolada do PVE. Turnos alternados jogador ↔ bot da arena.
 */
export class PvpCombatSession {
  private readonly gateway: CombatGateway;
  private readonly playerActorId: string;
  private readonly botActorId: string;
  private readonly duelistId: string;
  private readonly characterId: number;
  private readonly loadout: PlayerCombatLoadout | null;
  private readonly ruleManifest: MutableCombatRuleManifest;
  private readonly battleManager: BattleManager;
  private readonly processedRequestIds = new Set<string>();
  private pendingRuneSpeed: { readonly amount: number; readonly appliesOnTurn: number } | null = null;
  private runeSpeedAppliedTurn: number | null = null;

  constructor(playerActorId: string, initial: CombatState, options: PvpCombatSessionOptions) {
    this.playerActorId = playerActorId;
    this.botActorId = options.botActorId;
    this.duelistId = options.duelistId;
    this.characterId = options.characterId ?? 1;
    this.loadout = options.loadout ?? null;
    this.ruleManifest = cloneManifest(options.ruleManifest ?? []);
    this.gateway = CombatGateway.create(initial, playerActorId);
    this.battleManager = new BattleManager(playerActorId);
  }

  public getPlayerActorId(): string {
    return this.playerActorId;
  }

  public getBotActorId(): string {
    return this.botActorId;
  }

  public getDuelistId(): string {
    return this.duelistId;
  }

  public getCharacterId(): number {
    return this.characterId;
  }

  public getMonsterInstanceId(): null {
    return null;
  }

  public getState(): CombatState {
    return this.gateway.getState();
  }

  public start(): CombatDispatchPayload {
    return this.toPayload(this.gateway.startBattle(this.playerActorId));
  }

  public async dispatchPlayerAction(action: ActionRequest): Promise<PvpCombatSessionResult> {
    const gate = this.validatePlayerAction(action);
    if (!gate.ok) return gate;

    let resolvedAction = action;

    if (action.consumableId) {
      const consumed = await consumeConsumableInCombat({
        playerId: this.playerActorId,
        characterId: this.characterId,
        itemId: action.consumableId,
      });
      if (!consumed.ok) {
        return { ok: false, reason: 'INVALID_CONSUMABLE' };
      }
      const actor = this.gateway.getState().combatants[this.playerActorId];
      resolvedAction = {
        ...action,
        consumableHeal: actor ? computeConsumableHeal(actor, action.consumableId) : 0,
      };
    }

    this.applyPendingRuneSpeedIfDue();
    const runePatch = this.applyRuneModifiers(resolvedAction);
    resolvedAction = runePatch.action;
    this.rememberRequestId(action.requestId);

    const round = this.resolveAlternatingRound(resolvedAction, this.botActorId);
    return {
      ok: true,
      payload: this.toPayload({
        events: [...runePatch.events, ...round.events],
        state: round.state,
        balanceVersion: round.balanceVersion,
      }),
    };
  }

  public async dispatchBotAction(action: ActionRequest): Promise<PvpCombatSessionResult> {
    const gate = this.validateBotAction(action);
    if (!gate.ok) return gate;

    this.rememberRequestId(action.requestId);
    const round = this.resolveAlternatingRound(action, this.playerActorId);
    return { ok: true, payload: this.toPayload(round) };
  }

  public async forfeitPlayer(): Promise<PvpCombatSessionResult> {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    const last = this.gateway.forfeit(this.playerActorId);
    return { ok: true, payload: this.toPayload(last) };
  }

  private resolveAlternatingRound(
    actingAction: ActionRequest,
    nextActorId: string,
  ): DispatchResult {
    if (isReactiveConsumableAction(actingAction, loadCombatBalanceConfig().consumables.potionReactive)) {
      let result = this.gateway.dispatchAction(actingAction);
      if (result.state.phase !== 'ENDED') {
        this.gateway.ensureChoosingActor(actingAction.actorId);
        result = { ...result, state: this.gateway.getState() };
      }
      return result;
    }

    let result = this.gateway.resolveTurnBatch([actingAction]);

    if (result.state.phase !== 'ENDED') {
      this.gateway.ensureChoosingActor(nextActorId);
      result = {
        ...result,
        state: this.gateway.getState(),
      };
    }

    return result;
  }

  private applyPendingRuneSpeedIfDue(): void {
    if (!this.pendingRuneSpeed) return;
    const state = this.gateway.getState();
    if (state.turn !== this.pendingRuneSpeed.appliesOnTurn) return;
    this.gateway.setRuneSpeedFlatConditional(this.playerActorId, this.pendingRuneSpeed.amount);
    this.runeSpeedAppliedTurn = state.turn;
    this.pendingRuneSpeed = null;
  }

  private clearExpiredRuneSpeed(turn: number): void {
    if (this.runeSpeedAppliedTurn !== null && turn > this.runeSpeedAppliedTurn) {
      this.gateway.setRuneSpeedFlatConditional(this.playerActorId, 0);
      this.runeSpeedAppliedTurn = null;
    }
  }

  private applyRuneModifiers(action: ActionRequest): { action: ActionRequest; events: CombatEvent[] } {
    const trigger = resolveSkillRuneTrigger(action.skillId);
    if (!trigger) return { action, events: [] };

    const entry = tryConsumeRuneCharge(this.ruleManifest, trigger);
    if (!entry) return { action, events: [] };

    const state = this.gateway.getState();
    const chargesLeft = remainingRuneCharges(this.ruleManifest);
    const runeId = state.combatants[this.playerActorId]?.runeInstance?.runeId ?? 'unknown';
    this.gateway.updateRuneCharges(this.playerActorId, chargesLeft);

    if (entry.effectType === 'SPEED_NEXT_TURN') {
      this.pendingRuneSpeed = {
        amount: entry.value,
        appliesOnTurn: state.turn + 1,
      };
    }

    const events: CombatEvent[] = [{
      type: CombatEventType.RUNE_TRIGGERED,
      payload: {
        battleId: state.battleId,
        actorId: this.playerActorId,
        runeId,
        trigger,
        chargesLeft,
      },
    }];

    const patched: ActionRequest = {
      ...action,
      ...(entry.effectType === 'CRIT_BONUS' ? { runeCritBonus: entry.value } : {}),
      ...(entry.effectType === 'REFLECT_DMG' ? { runeReflectRatio: entry.value } : {}),
    };

    return { action: patched, events };
  }

  private validateBotAction(
    action: ActionRequest,
  ): PvpCombatSessionResult | { readonly ok: true } {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    if (state.activeActorId !== this.botActorId) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (action.actorId !== this.botActorId) {
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

  private validatePlayerAction(
    action: ActionRequest,
  ): PvpCombatSessionResult | { readonly ok: true } {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    if (action.actorId !== this.playerActorId) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (action.skillId && action.targetTile) {
      const gridCheck = this.battleManager.validatePlayerGridAction(state, {
        skillId: action.skillId,
        targetTile: action.targetTile,
      });
      if (!gridCheck.ok) {
        return { ok: false, reason: 'INVALID_BATTLE' };
      }
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

  private toPayload(result: DispatchResult): CombatDispatchPayload {
    this.clearExpiredRuneSpeed(result.state.turn);
    const feedback = buildCombatVisualFeedback(result.events);
    const actionResult = extractCombatActionIntentResult(result.events);
    return {
      events: result.events,
      state: result.state,
      balanceVersion: result.balanceVersion,
      ui: buildCombatUiHints(result.state, this.playerActorId),
      feedback,
      ...(actionResult ? { actionResult } : {}),
    };
  }
}
