/**
 * Sessão PVP rankeada 1v1 — dois connections humanos, turnos alternados, payload por peer.
 */

import { extractCombatActionIntentResult } from '../../../shared/combat/combatIntentFeedback.js';
import { buildCombatVisualFeedback } from '../../../shared/combat/combatVisualFeedback.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../../../shared/combatWire.js';
import type { CombatRuleManifest } from '../../../shared/combat/combatRuleManifest.js';
import { CombatEventType, type ActionRequest, type CombatEvent, type ResolvedCombatAction } from '../../../shared/events.js';
import { sanitizeCombatActionIntent } from '../../../shared/combat/combatActionIntent.js';
import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import type { CombatState } from '../../../shared/types.js';
import { isReactiveConsumableAction } from '../../../shared/combat/potionSaturation.js';
import { isClassMoveId } from '../../../shared/combat/classMovesetCatalog.js';
import { CombatGateway, type DispatchResult } from '../CombatGateway.js';
import { BattleManager } from '../../../shared/combat/BattleEngine.js';
import { consumeConsumableInCombat } from '../../../Economy/economyGateway.js';
import { computeConsumableHeal } from '../buildCombatantFromLoadout.js';
import { loadCombatBalanceConfig } from '../../engine/combatBalanceConfig.js';
import { validateCombatActionAgainstPersistence } from '../combatActionIntentGateway.js';
import {
  cloneManifest,
  remainingRuneCharges,
  resolveSkillRuneTrigger,
  tryConsumeRuneCharge,
  type MutableCombatRuleManifest,
} from '../runeCombat.js';

const MAX_TRACKED_REQUEST_IDS = 256;

export type RankedPvpPeer = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly actorId: string;
  readonly loadout: PlayerCombatLoadout;
};

export type RankedPvpSessionRejectReason =
  | 'NOT_YOUR_ACTOR'
  | 'INVALID_BATTLE'
  | 'DUPLICATE_REQUEST'
  | 'BATTLE_ENDED'
  | 'INVALID_CONSUMABLE'
  | 'INVALID_SKILL'
  | 'UNKNOWN_PEER';

export type RankedPvpPeerPayloads = ReadonlyMap<string, CombatDispatchPayload>;

export type RankedPvpSessionResult =
  | { readonly ok: true; readonly payloads: RankedPvpPeerPayloads }
  | { readonly ok: false; readonly reason: RankedPvpSessionRejectReason };

export type RankedPvpCombatSessionOptions = {
  readonly matchId: string;
  readonly peerA: RankedPvpPeer;
  readonly peerB: RankedPvpPeer;
  readonly ruleManifest?: CombatRuleManifest;
  readonly firstActorId: string;
};

export class RankedPvpCombatSession {
  private readonly gateway: CombatGateway;
  private readonly matchId: string;
  private readonly peersByConnection = new Map<string, RankedPvpPeer>();
  private readonly peersByActor = new Map<string, RankedPvpPeer>();
  private readonly ruleManifest: MutableCombatRuleManifest;
  private readonly battleManager: BattleManager;
  private readonly processedRequestIds = new Set<string>();
  private readonly movesUsedByActor = new Map<string, string[]>();
  private pendingRuneSpeed: {
    readonly actorId: string;
    readonly amount: number;
    readonly appliesOnTurn: number;
  } | null = null;
  private runeSpeedApplied: { readonly actorId: string; readonly turn: number } | null = null;

  constructor(initial: CombatState, options: RankedPvpCombatSessionOptions) {
    this.matchId = options.matchId;
    this.peersByConnection.set(options.peerA.connectionId, options.peerA);
    this.peersByConnection.set(options.peerB.connectionId, options.peerB);
    this.peersByActor.set(options.peerA.actorId, options.peerA);
    this.peersByActor.set(options.peerB.actorId, options.peerB);
    this.ruleManifest = cloneManifest(options.ruleManifest ?? []);
    this.gateway = CombatGateway.create(initial, options.peerA.actorId);
    this.battleManager = new BattleManager(options.peerA.actorId);
    this.movesUsedByActor.set(options.peerA.actorId, []);
    this.movesUsedByActor.set(options.peerB.actorId, []);
    this._firstActorId = options.firstActorId;
  }

  private readonly _firstActorId: string;

  getMatchId(): string {
    return this.matchId;
  }

  getBattleId(): string {
    return this.gateway.getState().battleId;
  }

  getState(): CombatState {
    return this.gateway.getState();
  }

  listPeers(): readonly RankedPvpPeer[] {
    return [...this.peersByConnection.values()];
  }

  getPeerByConnection(connectionId: string): RankedPvpPeer | undefined {
    return this.peersByConnection.get(connectionId);
  }

  getPeerByActor(actorId: string): RankedPvpPeer | undefined {
    return this.peersByActor.get(actorId);
  }

  getOpponentPeer(connectionId: string): RankedPvpPeer | undefined {
    for (const peer of this.peersByConnection.values()) {
      if (peer.connectionId !== connectionId) return peer;
    }
    return undefined;
  }

  getMovesUsedInBattle(actorId: string): readonly string[] {
    return [...(this.movesUsedByActor.get(actorId) ?? [])];
  }

  start(): RankedPvpPeerPayloads {
    const result = this.gateway.startBattle(this._firstActorId);
    return this.toPeerPayloads(result);
  }

  async dispatchAction(
    connectionId: string,
    rawAction: ActionRequest,
  ): Promise<RankedPvpSessionResult> {
    const peer = this.peersByConnection.get(connectionId);
    if (!peer) return { ok: false, reason: 'UNKNOWN_PEER' };

    const sanitized = sanitizeCombatActionIntent(rawAction, { logRejectedFields: false });
    if (!sanitized) return { ok: false, reason: 'INVALID_BATTLE' };

    const gate = this.validateActorAction(sanitized, peer.actorId);
    if (!gate.ok) return gate;

    const persistenceGate = validateCombatActionAgainstPersistence(
      peer.playerId,
      peer.characterId,
      sanitized,
      this.gateway.getState(),
      peer.actorId,
    );
    if (!persistenceGate.ok) {
      return { ok: false, reason: persistenceGate.reason };
    }

    let resolvedAction: ResolvedCombatAction = sanitized;
    if (sanitized.consumableId) {
      const consumed = await consumeConsumableInCombat({
        playerId: peer.playerId,
        characterId: peer.characterId,
        itemId: sanitized.consumableId,
      });
      if (!consumed.ok) return { ok: false, reason: 'INVALID_CONSUMABLE' };
      const actor = this.gateway.getState().combatants[peer.actorId];
      resolvedAction = {
        ...sanitized,
        consumableHeal: actor ? computeConsumableHeal(actor, sanitized.consumableId) : 0,
      };
    }

    this.applyPendingRuneSpeedIfDue();
    const runePatch = this.applyRuneModifiers(resolvedAction, peer.actorId);
    resolvedAction = runePatch.action;
    this.rememberRequestId(sanitized.requestId);

    if (sanitized.skillId && isClassMoveId(sanitized.skillId)) {
      this.movesUsedByActor.get(peer.actorId)?.push(sanitized.skillId);
    }

    const opponent = this.getOpponentPeer(connectionId);
    if (!opponent) return { ok: false, reason: 'UNKNOWN_PEER' };

    const round = this.resolveAlternatingRound(resolvedAction, opponent.actorId);
    return {
      ok: true,
      payloads: this.toPeerPayloads({
        events: [...runePatch.events, ...round.events],
        state: round.state,
        balanceVersion: round.balanceVersion,
      }),
    };
  }

  async forfeit(connectionId: string): Promise<RankedPvpSessionResult> {
    const peer = this.peersByConnection.get(connectionId);
    if (!peer) return { ok: false, reason: 'UNKNOWN_PEER' };
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') return { ok: false, reason: 'BATTLE_ENDED' };
    const last = this.gateway.forfeit(peer.actorId);
    return { ok: true, payloads: this.toPeerPayloads(last) };
  }

  private resolveAlternatingRound(
    actingAction: ResolvedCombatAction,
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
      result = { ...result, state: this.gateway.getState() };
    }
    return result;
  }

  private validateActorAction(
    action: ActionRequest,
    actorId: string,
  ): RankedPvpSessionResult | { readonly ok: true } {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') return { ok: false, reason: 'BATTLE_ENDED' };
    if (state.activeActorId !== actorId) return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    if (action.actorId !== actorId) return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    if (action.battleId !== state.battleId) return { ok: false, reason: 'INVALID_BATTLE' };
    if (this.processedRequestIds.has(action.requestId)) {
      return { ok: false, reason: 'DUPLICATE_REQUEST' };
    }
    if (action.skillId && action.targetTile) {
      const gridCheck = this.battleManager.validatePlayerGridAction(state, {
        skillId: action.skillId,
        targetTile: action.targetTile,
      });
      if (!gridCheck.ok) return { ok: false, reason: 'INVALID_BATTLE' };
    }
    return { ok: true };
  }

  private applyPendingRuneSpeedIfDue(): void {
    if (!this.pendingRuneSpeed) return;
    const state = this.gateway.getState();
    if (state.turn !== this.pendingRuneSpeed.appliesOnTurn) return;
    this.gateway.setRuneSpeedFlatConditional(
      this.pendingRuneSpeed.actorId,
      this.pendingRuneSpeed.amount,
    );
    this.runeSpeedApplied = {
      actorId: this.pendingRuneSpeed.actorId,
      turn: state.turn,
    };
    this.pendingRuneSpeed = null;
  }

  private clearExpiredRuneSpeed(turn: number): void {
    if (this.runeSpeedApplied && turn > this.runeSpeedApplied.turn) {
      this.gateway.setRuneSpeedFlatConditional(this.runeSpeedApplied.actorId, 0);
      this.runeSpeedApplied = null;
    }
  }

  private applyRuneModifiers(
    action: ResolvedCombatAction,
    actorId: string,
  ): { action: ResolvedCombatAction; events: CombatEvent[] } {
    const trigger = resolveSkillRuneTrigger(action.skillId);
    if (!trigger) return { action, events: [] };
    const entry = tryConsumeRuneCharge(this.ruleManifest, trigger);
    if (!entry) return { action, events: [] };

    const state = this.gateway.getState();
    const chargesLeft = remainingRuneCharges(this.ruleManifest);
    const runeId = state.combatants[actorId]?.runeInstance?.runeId ?? 'unknown';
    this.gateway.updateRuneCharges(actorId, chargesLeft);

    if (entry.effectType === 'SPEED_NEXT_TURN') {
      this.pendingRuneSpeed = {
        actorId,
        amount: entry.value,
        appliesOnTurn: state.turn + 1,
      };
    }

    const events: CombatEvent[] = [{
      type: CombatEventType.RUNE_TRIGGERED,
      payload: {
        battleId: state.battleId,
        actorId,
        runeId,
        trigger,
        chargesLeft,
      },
    }];

    const patched: ResolvedCombatAction = {
      ...action,
      ...(entry.effectType === 'CRIT_BONUS' ? { runeCritBonus: entry.value } : {}),
      ...(entry.effectType === 'REFLECT_DMG' ? { runeReflectRatio: entry.value } : {}),
    };
    return { action: patched, events };
  }

  private rememberRequestId(requestId: string): void {
    this.processedRequestIds.add(requestId);
    if (this.processedRequestIds.size > MAX_TRACKED_REQUEST_IDS) {
      const oldest = this.processedRequestIds.values().next().value;
      if (oldest !== undefined) this.processedRequestIds.delete(oldest);
    }
  }

  private toPeerPayloads(result: DispatchResult): RankedPvpPeerPayloads {
    this.clearExpiredRuneSpeed(result.state.turn);
    const feedback = buildCombatVisualFeedback(result.events);
    const map = new Map<string, CombatDispatchPayload>();
    for (const peer of this.peersByConnection.values()) {
      const actionResult = extractCombatActionIntentResult(result.events, {
        playerActorId: peer.actorId,
      });
      map.set(peer.connectionId, {
        events: result.events,
        state: result.state,
        balanceVersion: result.balanceVersion,
        ui: buildCombatUiHints(result.state, peer.actorId),
        feedback,
        ...(actionResult ? { actionResult } : {}),
      });
    }
    return map;
  }
}
