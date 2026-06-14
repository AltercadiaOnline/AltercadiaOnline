import { consumeConsumableInCombat } from '../../Economy/economyGateway.js';
import { extractCombatActionIntentResult } from '../../shared/combat/combatIntentFeedback.js';
import { buildCombatVisualFeedback } from '../../shared/combat/combatVisualFeedback.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../../shared/combatWire.js';
import type { CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { CombatEventType, type ActionRequest, type CombatEvent } from '../../shared/events.js';
import type { PlayerCombatLoadout } from '../../shared/character/equipmentState.js';
import type { CombatState } from '../../shared/types.js';
import {
  getAlliancePlayerTurnsSincePet,
  getPetAssistCycleIndex,
  shouldRunPetAlliancePhase,
} from '../../shared/combat/allianceTurnCycle.js';
import {
  battleUsesPetTurnQueue,
  listEnemyActorIds,
  listActivePetActorIds,
} from '../../shared/combat/petTurnOrder.js';
import { computeConsumableHeal } from './buildCombatantFromLoadout.js';
import { isReactiveConsumableAction } from '../../shared/combat/potionSaturation.js';
import { loadCombatBalanceConfig } from '../engine/combatBalanceConfig.js';
import { buildPetBasicAttackRequest } from './buildPetCombatant.js';
import { CombatGateway, type DispatchResult } from './CombatGateway.js';
import { BattleManager } from '../../shared/combat/BattleEngine.js';
import { isClassMoveId } from '../../shared/combat/classMovesetCatalog.js';
import {
  cloneManifest,
  remainingRuneCharges,
  resolveSkillRuneTrigger,
  tryConsumeRuneCharge,
  type MutableCombatRuleManifest,
} from './runeCombat.js';

const MAX_TRACKED_REQUEST_IDS = 256;

export type CombatSessionRejectReason =
  | 'NOT_YOUR_ACTOR'
  | 'INVALID_BATTLE'
  | 'DUPLICATE_REQUEST'
  | 'BATTLE_ENDED'
  | 'INVALID_CONSUMABLE';

export type CombatSessionResult =
  | { readonly ok: true; readonly payload: CombatDispatchPayload }
  | { readonly ok: false; readonly reason: CombatSessionRejectReason };

export type CombatSessionOptions = {
  readonly characterId?: number;
  readonly ruleManifest?: CombatRuleManifest;
  readonly loadout?: PlayerCombatLoadout;
  readonly monsterInstanceId?: string;
};

/**
 * Sessão autoritativa: uma batalha por conexão, validação antes do gateway.
 */
export class CombatSession {
  private readonly gateway: CombatGateway;
  private readonly playerActorId: string;
  private readonly characterId: number;
  private readonly loadout: PlayerCombatLoadout | null;
  private readonly ruleManifest: MutableCombatRuleManifest;
  private readonly battleManager: BattleManager;
  private readonly monsterInstanceId: string | null;
  private readonly processedRequestIds = new Set<string>();
  /** Cada push = um uso do move na batalha (XP de domínio proporcional). */
  private readonly movesUsedInBattle: string[] = [];
  private pendingRuneSpeed: { readonly amount: number; readonly appliesOnTurn: number } | null = null;
  private runeSpeedAppliedTurn: number | null = null;

  constructor(playerActorId: string, initial: CombatState, options: CombatSessionOptions = {}) {
    this.playerActorId = playerActorId;
    this.characterId = options.characterId ?? 1;
    this.loadout = options.loadout ?? null;
    this.monsterInstanceId = options.monsterInstanceId ?? null;
    this.ruleManifest = cloneManifest(options.ruleManifest ?? []);
    this.gateway = CombatGateway.create(initial, playerActorId);
    this.battleManager = new BattleManager(playerActorId);
  }

  public getPlayerActorId(): string {
    return this.playerActorId;
  }

  public getCharacterId(): number {
    return this.characterId;
  }

  public getMonsterInstanceId(): string | null {
    return this.monsterInstanceId;
  }

  public getMovesUsedInBattle(): readonly string[] {
    return [...this.movesUsedInBattle];
  }

  public getCombatClassId(): NonNullable<PlayerCombatLoadout['classId']> {
    return this.loadout?.classId ?? 'IMPETUS';
  }

  public getState(): CombatState {
    return this.gateway.getState();
  }

  public start(): CombatDispatchPayload {
    return this.toPayload(this.gateway.startBattle(this.playerActorId));
  }

  public async dispatchPlayerAction(action: ActionRequest): Promise<CombatSessionResult> {
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
    if (action.skillId && isClassMoveId(action.skillId)) {
      this.movesUsedInBattle.push(action.skillId);
    }

    const mergedEvents: CombatEvent[] = [...runePatch.events];
    this.battleManager.markPlayerTurnComplete();

    const round = this.resolvePveRound(resolvedAction);
    mergedEvents.push(...round.events);

    this.battleManager.markMonsterTurnComplete();
    this.clearExpiredRuneSpeed(round.state.turn);
    return {
      ok: true,
      payload: this.toPayload({
        events: mergedEvents,
        state: round.state,
        balanceVersion: round.balanceVersion,
      }),
    };
  }

  /** Render-se / fugir — derrota imediata tratada como forfeit autoritativo. */
  public async forfeitPlayer(): Promise<CombatSessionResult> {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    const last = this.gateway.forfeit(this.playerActorId);
    return { ok: true, payload: this.toPayload(last) };
  }

  /**
   * PvE sem pet: jogador + reação inimiga no mesmo lote (iniciativa).
   * PvE com pet coadjuvante: jogador + inimigo por jogada; pet após 3→4→5→6→8 jogadas do jogador.
   */
  private resolvePveRound(playerAction: ActionRequest): DispatchResult {
    const state = this.gateway.getState();
    if (battleUsesPetTurnQueue(state.combatants)) {
      return this.resolvePveAllianceCycleRound(playerAction);
    }
    return this.resolvePveClassicRound(playerAction);
  }

  private resolvePveClassicRound(playerAction: ActionRequest): DispatchResult {
    if (this.isReactivePotionAction(playerAction)) {
      return this.resolveReactiveConsumableRound(playerAction);
    }

    const preEvents: CombatEvent[] = [];
    const batch: ActionRequest[] = [playerAction];

    for (const enemyId of this.listEnemyActorIds()) {
      const turnState = this.gateway.getState();
      const monsterTurn = this.battleManager.processMonsterTurn(turnState, enemyId);
      preEvents.push(...monsterTurn.events);
      if (monsterTurn.action) {
        batch.push(monsterTurn.action);
      }
    }

    let result = this.gateway.resolveTurnBatch(batch);

    if (result.state.phase !== 'ENDED') {
      this.gateway.ensureChoosingActor(this.playerActorId);
      result = {
        ...result,
        state: this.gateway.getState(),
      };
    }

    return {
      ...result,
      events: [...preEvents, ...result.events],
    };
  }

  /**
   * PvE com pet coadjuvante: jogador + inimigo a cada jogada; pet após 3→4→5→6→8 jogadas do jogador.
   */
  private resolvePveAllianceCycleRound(playerAction: ActionRequest): DispatchResult {
    if (this.isReactivePotionAction(playerAction)) {
      return this.resolveReactiveConsumableRound(playerAction);
    }

    const preEvents: CombatEvent[] = [];
    const beforeState = this.gateway.getState();

    let result = this.resolveAllyEnemyBatch([playerAction], preEvents);

    if (result.state.phase === 'ENDED') {
      return result;
    }

    if (shouldRunPetAlliancePhase(beforeState)) {
      const petPhase = this.resolvePetAlliancePhase();
      result = {
        events: [...result.events, ...petPhase.events],
        state: petPhase.state,
        balanceVersion: petPhase.balanceVersion,
      };
      this.gateway.setPetAllianceProgress({
        alliancePlayerTurnsSincePet: 0,
        petAssistCycleIndex: getPetAssistCycleIndex(beforeState) + 1,
      });
    } else {
      this.gateway.setPetAllianceProgress({
        alliancePlayerTurnsSincePet: getAlliancePlayerTurnsSincePet(beforeState) + 1,
        petAssistCycleIndex: getPetAssistCycleIndex(beforeState),
      });
    }

    if (result.state.phase !== 'ENDED') {
      this.gateway.ensureChoosingActor(this.playerActorId);
      result = {
        ...result,
        state: this.gateway.getState(),
      };
    }

    return result;
  }

  private resolveAllyEnemyBatch(
    allyActions: readonly ActionRequest[],
    preEvents: CombatEvent[],
  ): DispatchResult {
    const batch: ActionRequest[] = [...allyActions];

    for (const enemyId of this.listEnemyActorIds()) {
      const turnState = this.gateway.getState();
      const monsterTurn = this.battleManager.processMonsterTurn(turnState, enemyId);
      preEvents.push(...monsterTurn.events);
      if (monsterTurn.action) {
        batch.push(monsterTurn.action);
      }
    }

    const result = this.gateway.resolveTurnBatch(batch);
    return {
      ...result,
      events: [...preEvents, ...result.events],
    };
  }

  private resolvePetAlliancePhase(): DispatchResult {
    const preEvents: CombatEvent[] = [];
    const batch: ActionRequest[] = [];
    const state = this.gateway.getState();
    const turn = state.turn;
    const petSnapshot = this.loadout?.pet ?? null;

    for (const petId of listActivePetActorIds(state.combatants, this.playerActorId)) {
      if (!petSnapshot) continue;
      batch.push(buildPetBasicAttackRequest(
        state.battleId,
        turn,
        petId,
        petSnapshot,
        `alliance-${turn}-${Date.now()}`,
      ));
    }

    if (batch.length === 0) {
      return {
        events: [],
        state: this.gateway.getState(),
        balanceVersion: this.gateway.getBalanceVersion(),
      };
    }

    return this.resolveAllyEnemyBatch(batch, preEvents);
  }

  private listEnemyActorIds(): string[] {
    return [...listEnemyActorIds(this.gateway.getState().combatants, this.playerActorId)];
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

  private isReactivePotionAction(action: ActionRequest): boolean {
    return isReactiveConsumableAction(action, loadCombatBalanceConfig().consumables.potionReactive);
  }

  /** Poção/tônico reativo — não avança turno nem dispara round de inimigo. */
  private resolveReactiveConsumableRound(playerAction: ActionRequest): DispatchResult {
    const result = this.gateway.dispatchAction(playerAction);
    if (result.state.phase !== 'ENDED') {
      this.gateway.ensureChoosingActor(this.playerActorId);
      return {
        ...result,
        state: this.gateway.getState(),
      };
    }
    return result;
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
    const feedback = buildCombatVisualFeedback(result.events, {
      playerActorId: this.playerActorId,
      enemyActorIds: listEnemyActorIds(result.state.combatants, this.playerActorId),
    });
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
