import { consumeConsumableInCombat } from '../../Economy/economyGateway.js';
import { extractCombatActionIntentResult } from '../../shared/combat/combatIntentFeedback.js';
import { buildCombatVisualFeedback } from '../../shared/combat/combatVisualFeedback.js';
import { buildCombatUiHints, type CombatDispatchPayload } from '../../shared/combatWire.js';
import type { CombatRuleManifest } from '../../shared/combat/combatRuleManifest.js';
import { CombatEventType, type ActionRequest, type CombatEvent, type ResolvedCombatAction } from '../../shared/events.js';
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
import {
  sanitizeCombatActionIntent,
  validateCombatActionAgainstPersistence,
} from './combatActionIntentGateway.js';
import { CombatGateway, type DispatchResult } from './CombatGateway.js';
import { BattleManager } from '../../shared/combat/BattleEngine.js';
import { isClassMoveId } from '../../shared/combat/classMovesetCatalog.js';
import { createBattleLogEvent } from '../../shared/combat/battleCombatLog.js';
import {
  formatPvePackStaggerLog,
  pvePackMemberReadyOnCycle,
  resolvePveEnemyPackIndex,
} from '../../shared/combat/pveEncounterPack.js';
import { MarcoCombatTelemetryAccumulator } from '../../shared/progression/marcoCombatTelemetryCore.js';
import type { MarcoProgressEvent } from '../../shared/progression/marcoProgressEngine.js';
import { isMirrorBotActorId } from '../../shared/combat/mirrorPlayerConfig.js';
import {
  AGILITY_EXTRA_GRANT_LOG,
  AGILITY_EXTRA_STRIKE_LOG,
  agilityTempoScoreFromCombatant,
  shouldGrantAgilityExtraAction,
} from '../../shared/combat/agilityTempo.js';
import {
  buildMirrorInjectedState,
  buildMirrorPlayerCombatant,
} from './buildMirrorPlayerCombatant.js';
import {
  cloneManifest,
  remainingRuneCharges,
  resolveSkillRuneTrigger,
  isPersistentImpactCritBonus,
  peekRuneCharge,
  tryConsumeRuneCharge,
  type MutableCombatRuleManifest,
} from './runeCombat.js';

const MAX_TRACKED_REQUEST_IDS = 256;

export type CombatSessionRejectReason =
  | 'NOT_YOUR_ACTOR'
  | 'INVALID_BATTLE'
  | 'DUPLICATE_REQUEST'
  | 'BATTLE_ENDED'
  | 'INVALID_CONSUMABLE'
  | 'INVALID_SKILL';

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
  private readonly marcoTelemetry: MarcoCombatTelemetryAccumulator;
  private mirrorActorId: string | null = null;
  private pendingRuneSpeed: { readonly amount: number; readonly appliesOnTurn: number } | null = null;
  private runeSpeedAppliedTurn: number | null = null;
  /** Quantas reações de bando já passaram (0 = só o 1º rato age). */
  private pvePackReactionCycle = 0;

  constructor(playerActorId: string, initial: CombatState, options: CombatSessionOptions = {}) {
    this.playerActorId = playerActorId;
    this.characterId = options.characterId ?? 1;
    this.loadout = options.loadout ?? null;
    this.monsterInstanceId = options.monsterInstanceId ?? null;
    this.ruleManifest = cloneManifest(options.ruleManifest ?? []);
    this.gateway = CombatGateway.create(initial, playerActorId);
    this.battleManager = new BattleManager(playerActorId);
    this.marcoTelemetry = new MarcoCombatTelemetryAccumulator(playerActorId);
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

  public getMarcoProgressEvents(victory: boolean): readonly MarcoProgressEvent[] {
    return this.marcoTelemetry.toProgressEvents(victory);
  }

  public getCombatClassId(): NonNullable<PlayerCombatLoadout['classId']> {
    return this.loadout?.classId ?? 'IMPETUS';
  }

  public getState(): CombatState {
    return this.gateway.getState();
  }

  public getMirrorActorId(): string | null {
    return this.mirrorActorId;
  }

  /** Dev — substitui inimigo PVE por jogador espelho (duelo PVP de teste). */
  public injectMirrorPlayer(): CombatSessionResult {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    if (this.mirrorActorId) {
      return { ok: false, reason: 'INVALID_BATTLE' };
    }

    const mirror = buildMirrorPlayerCombatant();
    const nextState = buildMirrorInjectedState(state, mirror, this.playerActorId);
    this.mirrorActorId = mirror.id;
    this.gateway.replaceState(nextState);
    this.gateway.ensureChoosingActor(this.playerActorId);

    const events: CombatEvent[] = [{
      type: CombatEventType.BATTLE_START,
      payload: {
        battleId: nextState.battleId,
        combatants: this.gateway.getState().combatants,
      },
    }];

    return {
      ok: true,
      payload: this.toPayload({
        events,
        state: this.gateway.getState(),
        balanceVersion: this.gateway.getBalanceVersion(),
      }),
    };
  }

  public async dispatchMirrorAction(rawAction: ActionRequest): Promise<CombatSessionResult> {
    const mirrorActorId = this.mirrorActorId;
    if (!mirrorActorId) {
      return { ok: false, reason: 'INVALID_BATTLE' };
    }

    const sanitized = sanitizeCombatActionIntent(rawAction, { logRejectedFields: false });
    if (!sanitized) {
      return { ok: false, reason: 'INVALID_BATTLE' };
    }

    const gate = this.validateMirrorAction(sanitized, mirrorActorId);
    if (!gate.ok) return gate;

    this.rememberRequestId(sanitized.requestId);
    const round = this.resolveMirrorDuelRound(sanitized, this.playerActorId);
    return {
      ok: true,
      payload: this.toPayload(round),
    };
  }

  public start(): CombatDispatchPayload {
    return this.toPayload(this.gateway.startBattle(this.playerActorId));
  }

  public async dispatchPlayerAction(rawAction: ActionRequest): Promise<CombatSessionResult> {
    const sanitized = sanitizeCombatActionIntent(rawAction, { logRejectedFields: false });
    if (!sanitized) {
      return { ok: false, reason: 'INVALID_BATTLE' };
    }
    const gate = this.validatePlayerAction(sanitized);
    if (!gate.ok) return gate;

    const persistenceGate = validateCombatActionAgainstPersistence(
      this.playerActorId,
      this.characterId,
      sanitized,
      this.gateway.getState(),
      this.playerActorId,
    );
    if (!persistenceGate.ok) {
      return { ok: false, reason: persistenceGate.reason };
    }

    let resolvedAction: ResolvedCombatAction = sanitized;

    if (sanitized.consumableId) {
      const consumed = await consumeConsumableInCombat({
        playerId: this.playerActorId,
        characterId: this.characterId,
        itemId: sanitized.consumableId,
      });
      if (!consumed.ok) {
        return { ok: false, reason: 'INVALID_CONSUMABLE' };
      }
      const actor = this.gateway.getState().combatants[this.playerActorId];
      resolvedAction = {
        ...sanitized,
        consumableHeal: actor ? computeConsumableHeal(actor, sanitized.consumableId) : 0,
      };
    }

    this.applyPendingRuneSpeedIfDue();
    const runePatch = this.applyRuneModifiers(resolvedAction);
    resolvedAction = runePatch.action;

    this.rememberRequestId(sanitized.requestId);
    if (sanitized.skillId && isClassMoveId(sanitized.skillId)) {
      this.movesUsedInBattle.push(sanitized.skillId);
    }

    const mergedEvents: CombatEvent[] = [...runePatch.events];
    this.battleManager.markPlayerTurnComplete();

    const round = this.mirrorActorId
      ? this.resolveMirrorDuelRound(resolvedAction, this.mirrorActorId)
      : this.resolvePveRound(resolvedAction);
    mergedEvents.push(...round.events);
    this.marcoTelemetry.recordCombatEvents(mergedEvents);

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

  private resolveMirrorDuelRound(
    actingAction: ResolvedCombatAction,
    nextActorId: string,
  ): DispatchResult {
    if (this.isReactivePotionAction(actingAction)) {
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

  private validateMirrorAction(
    action: ActionRequest,
    mirrorActorId: string,
  ): CombatSessionResult | { readonly ok: true } {
    const state = this.gateway.getState();
    if (state.phase === 'ENDED') {
      return { ok: false, reason: 'BATTLE_ENDED' };
    }
    if (state.activeActorId !== mirrorActorId) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (action.actorId !== mirrorActorId || !isMirrorBotActorId(action.actorId)) {
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
  private resolvePveRound(playerAction: ResolvedCombatAction): DispatchResult {
    const state = this.gateway.getState();
    if (battleUsesPetTurnQueue(state.combatants)) {
      return this.resolvePveAllianceCycleRound(playerAction);
    }
    return this.resolvePveClassicRound(playerAction);
  }

  private resolvePveClassicRound(playerAction: ResolvedCombatAction): DispatchResult {
    if (this.isReactivePotionAction(playerAction)) {
      return this.resolveReactiveConsumableRound(playerAction);
    }

    const extraSkip = this.consumeAgilityExtraSkip();
    const extraEvents: CombatEvent[] = extraSkip
      ? [this.buildAgilityLog(AGILITY_EXTRA_STRIKE_LOG)]
      : [];
    const preEvents: CombatEvent[] = [...extraEvents];
    const batch: ResolvedCombatAction[] = [playerAction];

    if (!extraSkip) {
      batch.push(...this.collectPvePackEnemyActions(preEvents));
    }

    let result = this.gateway.resolveTurnBatch(batch);

    if (result.state.phase !== 'ENDED') {
      this.gateway.ensureChoosingActor(this.playerActorId);
      result = {
        ...result,
        state: this.gateway.getState(),
      };
    }

    result = {
      ...result,
      events: [...preEvents, ...result.events],
    };

    if (!extraSkip) {
      this.advancePvePackReactionCycle();
      result = this.maybeGrantAgilityExtra(result);
    }

    return result;
  }

  /**
   * PvE com pet coadjuvante: jogador + inimigo a cada jogada; pet após 3→4→5→6→8 jogadas do jogador.
   */
  private resolvePveAllianceCycleRound(playerAction: ResolvedCombatAction): DispatchResult {
    if (this.isReactivePotionAction(playerAction)) {
      return this.resolveReactiveConsumableRound(playerAction);
    }

    const extraSkip = this.consumeAgilityExtraSkip();
    const preEvents: CombatEvent[] = extraSkip
      ? [this.buildAgilityLog(AGILITY_EXTRA_STRIKE_LOG)]
      : [];
    const beforeState = this.gateway.getState();

    let result: DispatchResult;
    if (extraSkip) {
      const extraRound = this.gateway.resolveTurnBatch([playerAction]);
      result = {
        ...extraRound,
        events: [...preEvents, ...extraRound.events],
      };
    } else {
      result = this.resolveAllyEnemyBatch([playerAction], preEvents);
    }

    if (result.state.phase === 'ENDED') {
      return result;
    }

    if (shouldRunPetAlliancePhase(beforeState)) {
      const petPhase = this.resolvePetAlliancePhase(extraSkip);
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

    if (!extraSkip) {
      this.advancePvePackReactionCycle();
      result = this.maybeGrantAgilityExtra(result);
    }

    return result;
  }

  private resolveAllyEnemyBatch(
    allyActions: readonly ResolvedCombatAction[],
    preEvents: CombatEvent[],
    logPackStagger = true,
  ): DispatchResult {
    const batch: ResolvedCombatAction[] = [
      ...allyActions,
      ...this.collectPvePackEnemyActions(preEvents, logPackStagger),
    ];

    const result = this.gateway.resolveTurnBatch(batch);
    return {
      ...result,
      events: [...preEvents, ...result.events],
    };
  }

  /** Inimigos prontos no ciclo atual; o resto só posiciona (log, sem golpe). */
  private collectPvePackEnemyActions(
    preEvents: CombatEvent[],
    logPackStagger = true,
  ): ResolvedCombatAction[] {
    const actions: ResolvedCombatAction[] = [];
    const battleId = this.gateway.getState().battleId;

    for (const enemyId of this.listEnemyActorIds()) {
      const turnState = this.gateway.getState();
      const monster = turnState.combatants[enemyId];
      if (!monster || (monster.hpCurrent ?? monster.hp) <= 0) continue;

      const packIndex = resolvePveEnemyPackIndex(enemyId);
      if (!pvePackMemberReadyOnCycle(packIndex, this.pvePackReactionCycle)) {
        if (logPackStagger) {
          preEvents.push(createBattleLogEvent(battleId, formatPvePackStaggerLog(monster.name)));
        }
        continue;
      }

      const monsterTurn = this.battleManager.processMonsterTurn(turnState, enemyId);
      preEvents.push(...monsterTurn.events);
      if (monsterTurn.action) {
        actions.push(monsterTurn.action);
      }
    }

    return actions;
  }

  private advancePvePackReactionCycle(): void {
    this.pvePackReactionCycle += 1;
  }

  private resolvePetAlliancePhase(skipEnemies = false): DispatchResult {
    const preEvents: CombatEvent[] = [];
    const batch: ResolvedCombatAction[] = [];
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

    if (skipEnemies) {
      const extraPet = this.gateway.resolveTurnBatch(batch);
      return {
        ...extraPet,
        events: [...preEvents, ...extraPet.events],
      };
    }

    return this.resolveAllyEnemyBatch(batch, preEvents, false);
  }

  private listEnemyActorIds(): string[] {
    return [...listEnemyActorIds(this.gateway.getState().combatants, this.playerActorId)];
  }

  private buildAgilityLog(line: string): CombatEvent {
    return {
      type: CombatEventType.COMBAT_LOG,
      battleId: this.gateway.getState().battleId,
      line,
      ts: Date.now(),
    };
  }

  private consumeAgilityExtraSkip(): boolean {
    const state = this.gateway.getState();
    if (!state.agilitySkipEnemyReaction) return false;
    this.gateway.setAgilityTempoProgress({
      agilitySkipEnemyReaction: false,
      agilityLastExtraTurn: state.agilityLastExtraTurn ?? null,
    });
    return true;
  }

  private maybeGrantAgilityExtra(result: DispatchResult): DispatchResult {
    if (result.state.phase === 'ENDED') return result;
    const player = result.state.combatants[this.playerActorId];
    if (!player) return result;

    let foeMaxScore = 0;
    let livingFoes = 0;
    for (const enemyId of listEnemyActorIds(result.state.combatants, this.playerActorId)) {
      const enemy = result.state.combatants[enemyId];
      if (!enemy) continue;
      const hp = enemy.hpCurrent ?? enemy.hp;
      if (hp <= 0) continue;
      livingFoes += 1;
      foeMaxScore = Math.max(foeMaxScore, agilityTempoScoreFromCombatant(enemy));
    }
    if (livingFoes <= 0) return result;

    const granted = shouldGrantAgilityExtraAction({
      battleId: result.state.battleId,
      turn: result.state.turn,
      playerScore: agilityTempoScoreFromCombatant(player),
      foeMaxScore,
      lastExtraTurn: result.state.agilityLastExtraTurn ?? null,
      alreadySkipping: Boolean(result.state.agilitySkipEnemyReaction),
    });
    if (!granted) return result;

    this.gateway.setAgilityTempoProgress({
      agilitySkipEnemyReaction: true,
      agilityLastExtraTurn: result.state.turn,
    });
    return {
      ...result,
      state: this.gateway.getState(),
      events: [
        ...result.events,
        this.buildAgilityLog(AGILITY_EXTRA_GRANT_LOG),
      ],
    };
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

  private applyRuneModifiers(action: ResolvedCombatAction): { action: ResolvedCombatAction; events: CombatEvent[] } {
    const trigger = resolveSkillRuneTrigger(action.skillId);
    if (!trigger) return { action, events: [] };

    const pending = peekRuneCharge(this.ruleManifest, trigger);
    if (!pending) return { action, events: [] };
    if (isPersistentImpactCritBonus(pending)) {
      return { action, events: [] };
    }

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

    const patched: ResolvedCombatAction = {
      ...action,
      ...(entry.effectType === 'CRIT_BONUS' ? { runeCritBonus: entry.value } : {}),
      ...(entry.effectType === 'REFLECT_DMG' ? { runeReflectRatio: entry.value } : {}),
    };

    return { action: patched, events };
  }

  private isReactivePotionAction(action: ResolvedCombatAction): boolean {
    return isReactiveConsumableAction(action, loadCombatBalanceConfig().consumables.potionReactive);
  }

  /** Poção/tônico reativo — não avança turno nem dispara round de inimigo. */
  private resolveReactiveConsumableRound(playerAction: ResolvedCombatAction): DispatchResult {
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
    const actionResult = extractCombatActionIntentResult(result.events, {
      playerActorId: this.playerActorId,
    });
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
