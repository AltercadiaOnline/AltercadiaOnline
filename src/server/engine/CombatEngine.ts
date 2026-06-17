import { calculateDamage } from '../../shared/combat/calculateDamage.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { CombatEventType } from '../../shared/events.js';
import type { CombatEvent, TurnUpdate } from '../../shared/events.js';
import type { ResolvedCombatAction } from '../../shared/types/combat.js';
import {
  canExecuteMove,
  computeCooldownTurnsRemaining,
  computeCooldownUntilTurn,
  resolveMoveCooldownFromCatalog,
  resolveSkillPpMax,
  skillUsesPpBudget,
} from '../../shared/combat/skillRuntime.js';
import { resolveMoveCombatMeta } from '../../shared/combat/resolveMoveCombatMeta.js';
import { resolveHitMoveDisplayName } from '../../shared/combat/moveDisplayLabels.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import { MoveEffectKind, getClassMoveById } from '../../shared/combat/classMovesetCatalog.js';
import { MoveCategory } from '../../shared/combat/moveTypes.js';
import {
  RuntimeModifierKind,
  RuntimeStatusId,
  type CombatClassId,
  type CombatState,
  type Combatant,
  type RuntimeModifier,
  type RuntimeShield,
  type RuntimeStatus,
  type SkillData,
} from '../../shared/types/combat.js';
import {
  buildGroupShield,
  buildRuntimeModifier,
  buildRuntimeStatus,
  buildSelfShield,
  formatRuntimeStatusDisplayTurns,
  isIncomingStatusBlocked,
  isPermanentRuntimeStatus,
  resolveModifierPercentFromCombatant,
} from '../../shared/combat/runtimeStatusCatalog.js';
import {
  isRuntimeEffectActive,
  isRuntimeEffectExpired,
  isRuntimeModifierActive,
  isRuntimeShieldActive,
  resolveRuntimeAppliedAtTurn,
  shouldDetonateDelayedOnActorTurnStart,
  shouldTickOnActorTurnStart,
} from '../../shared/combat/runtimeActorTiming.js';
import {
  createStatusCombatEvent,
  type StatusEventPhase,
} from '../../shared/combat/statusEvents.js';
import { loadCombatBalanceConfig, type CombatBalanceV12 } from './combatBalanceConfig.js';
import {
  battleUsesPetTurnQueue,
  orderPetTurnQueue,
  resolveAttackTargetId,
} from '../../shared/combat/petTurnOrder.js';
import {
  getCombatRole,
  isPetCombatant,
  isPetCombatantActive,
  applyPetCombatHp,
  wasPetJustDefeated,
  resolveCombatantHp,
} from '../../shared/pet/petCombatRules.js';
import {
  compareInitiativeEntries,
  computeInitiativeBreakdown,
  resolveTurnOrderReason as resolveInitiativeReason,
} from '../../shared/combat/initiativeFormula.js';
import { formatInitiativeSpeedDisplay } from '../../shared/combat/initiativeSpeedDisplay.js';
import {
  countTargetDebuffsForScaling,
  resolveDebuffScalingMultiplier,
  resolveRetaliationBonusPercent,
  resolveRetaliationMaxTrackedDamage,
  resolveRetaliationMultiplier,
  resolveStackingDamageMultiplier,
} from '../../shared/combat/movePowerScaling.js';
import {
  cloneTransferredStatus,
  findFirstTransferableDebuff,
} from '../../shared/combat/debuffTransfer.js';
import {
  resolveBonusHealAmount,
  resolveHealPower,
} from '../../shared/combat/resolveHealPower.js';
import {
  inferMoveTargetFromEffectKind,
  resolveSkillTargetId,
} from '../../shared/combat/resolveSkillTarget.js';
import {
  hasBattleEnded as resolveHasBattleEnded,
  resolveBattleWinnerId as resolveBattleWinner,
} from '../../shared/combat/battleResolution.js';
import {
  applyPotionPpDrainStepToSkills,
  isReactiveConsumableAction,
  resolvePotionHealMultiplierFromUses,
  resolvePotionSaturationPercent,
} from '../../shared/combat/potionSaturation.js';

type BalanceConfig = CombatBalanceV12;
type TurnOrderReason = 'INITIATIVE_SCORE' | 'PRIORITY' | 'EFFECTIVE_SPEED' | 'SPEED_ATTRIBUTE' | 'SEED' | 'PET_QUEUE';

type DirectDamageOptions = {
  readonly ignoreBarrierPercent?: number;
  readonly runeCritBonus?: number;
  readonly runeReflectRatio?: number;
  readonly behaviorMultiplier?: number;
  readonly skipThornsReflect?: boolean;
  readonly skipRuneReflect?: boolean;
  readonly skillId?: string;
  readonly skillName?: string;
};

type RankedAction = {
  readonly request: ResolvedCombatAction;
  readonly actorId: string;
  readonly skillPriority: 1 | 2 | 3;
  readonly movesetPriorityScore: number;
  readonly speedBonusTotal: number;
  readonly effectiveSpeedRaw: number;
  readonly speedAttributeContribution: number;
  readonly initiativeScore: number;
  readonly tieBreakerSeed: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getHp(combatant: Combatant): number {
  return combatant.hpCurrent ?? combatant.hp;
}

function getMaxHp(combatant: Combatant): number {
  return combatant.hpMax ?? combatant.maxHp;
}

function withHp(combatant: Combatant, hp: number): Combatant {
  const maxHp = getMaxHp(combatant);
  return { ...combatant, hp, hpCurrent: hp, maxHp, hpMax: maxHp };
}

function getStatuses(combatant: Combatant): readonly RuntimeStatus[] {
  return combatant.activeStatuses ?? [];
}

function getShields(combatant: Combatant): readonly RuntimeShield[] {
  return combatant.activeShields ?? [];
}

function getModifiers(combatant: Combatant): readonly RuntimeModifier[] {
  return combatant.temporaryModifiers ?? [];
}

function resolveModifierPercent(combatant: Combatant, kind: RuntimeModifierKind, currentTurn: number): number {
  return resolveModifierPercentFromCombatant(combatant, kind, currentTurn);
}

function cloneCombatants(input: Readonly<Record<string, Combatant>>): Record<string, Combatant> {
  const out: Record<string, Combatant> = {};
  for (const [id, c] of Object.entries(input)) {
    const clonedBase: Combatant = {
      ...c,
      hp: getHp(c),
      hpCurrent: getHp(c),
      maxHp: getMaxHp(c),
      hpMax: getMaxHp(c),
      skills: [...c.skills],
      statusEffects: [...(c.statusEffects ?? [])],
      activeStatuses: [...(c.activeStatuses ?? [])],
      activeShields: [...(c.activeShields ?? [])],
      temporaryModifiers: [...(c.temporaryModifiers ?? [])],
      lockedSkillIds: [...(c.lockedSkillIds ?? [])],
    };
    out[id] = c.speedProfile
      ? {
          ...clonedBase,
          speedProfile: { ...c.speedProfile, activeMarcos: [...(c.speedProfile.activeMarcos ?? [])] },
        }
      : clonedBase;
  }
  return out;
}

function getActorOrder(combatants: Readonly<Record<string, Combatant>>): string[] {
  return Object.keys(combatants);
}

function pickNextActorId(currentActorId: string | null, order: readonly string[]): string | null {
  if (order.length === 0) return null;
  if (currentActorId === null) return order[0] ?? null;
  const currentIdx = order.indexOf(currentActorId);
  if (currentIdx === -1) return order[0] ?? null;
  return order[(currentIdx + 1) % order.length] ?? null;
}

function computeSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rollPercent(seedInput: string): number {
  const seed = computeSeed(seedInput);
  return seed % 100;
}

function compareRankedActions(a: RankedAction, b: RankedAction): number {
  return compareInitiativeEntries(a, b);
}

function resolveOrderReason(ranked: readonly RankedAction[]): TurnOrderReason {
  const reason = resolveInitiativeReason(ranked);
  if (reason === 'SPEED_ATTRIBUTE') return 'SPEED_ATTRIBUTE';
  if (reason === 'PRIORITY') return 'PRIORITY';
  return 'SEED';
}

export class CombatEngine {
  private readonly balance: BalanceConfig;
  private readonly playerActorId: string | null;
  private state: CombatState;
  private readonly potionLastUsedTurn = new Map<string, number>();
  private readonly potionCooldownUntilTurn = new Map<string, number>();
  private readonly potionExhaustionUntilTurn = new Map<string, number>();
  private readonly potionSpeedBuffUntilTurn = new Map<string, { untilTurn: number; amount: number }>();
  private readonly potionUsesByTurn = new Map<string, number>();
  private readonly potionUsesInBattle = new Map<string, number>();
  private readonly healingHistory = new Map<string, number[]>();
  /** `${actorId}:${skillId}` → turno exclusivo até liberar novamente. */
  private readonly skillCooldownUntilTurn = new Map<string, number>();
  /** Cargas restantes de Passos Além-Tempo por ator. */
  private readonly marcoBeyondTimeCharges = new Map<string, number>();

  constructor(
    initial: CombatState,
    config: BalanceConfig = loadCombatBalanceConfig(),
    playerActorId: string | null = null,
  ) {
    this.balance = config;
    this.playerActorId = playerActorId;
    this.state = { ...initial, combatants: cloneCombatants(initial.combatants) };
  }

  public getConfigVersion(): string {
    return this.balance.version;
  }

  public getState(): CombatState {
    return {
      ...this.state,
      combatants: this.enrichCombatantsForClient(this.state.combatants),
    };
  }

  /** Substitui snapshot autoritativo (ex.: injeção de bot espelho em PVE). */
  public replaceState(next: CombatState): void {
    this.state = { ...next, combatants: cloneCombatants(next.combatants) };
  }

  private skillCooldownKey(actorId: string, skillId: string): string {
    return `${actorId}:${skillId}`;
  }

  private getSkillCooldownUntil(actorId: string, skillId: string): number | undefined {
    return this.skillCooldownUntilTurn.get(this.skillCooldownKey(actorId, skillId));
  }

  private enrichSkill(actorId: string, skill: SkillData): SkillData {
    const cooldownUntil = this.getSkillCooldownUntil(actorId, skill.id);
    const cooldownTurnsRemaining = computeCooldownTurnsRemaining(this.state.turn, cooldownUntil);
    return cooldownTurnsRemaining > 0 ? { ...skill, cooldownTurnsRemaining } : skill;
  }

  private enrichCombatantsForClient(combatants: Readonly<Record<string, Combatant>>): Record<string, Combatant> {
    const out: Record<string, Combatant> = {};
    for (const [id, combatant] of Object.entries(combatants)) {
      out[id] = {
        ...combatant,
        skills: combatant.skills.map((skill) => this.enrichSkill(id, skill)),
      };
    }
    return out;
  }

  private isSkillReady(actorId: string, skill: SkillData): boolean {
    const enriched = this.enrichSkill(actorId, skill);
    return canExecuteMove(enriched, this.state.turn);
  }

  private consumeSkillResources(actorId: string, skillId: string, skill: SkillData): void {
    const actor = this.state.combatants[actorId];
    if (!actor) return;

    const cooldownTurns = resolveMoveCooldownFromCatalog(skillId) || skill.cooldown;
    if (cooldownTurns > 0) {
      this.skillCooldownUntilTurn.set(
        this.skillCooldownKey(actorId, skillId),
        computeCooldownUntilTurn(this.state.turn, cooldownTurns),
      );
    }

    if (!skillUsesPpBudget(skill)) return;

    const ppMax = resolveSkillPpMax(skill);
    const ppCurrent = Math.max(0, (skill.ppCurrent ?? ppMax) - 1);
    const skills = actor.skills.map((entry) => (
      entry.id === skillId ? { ...entry, ppCurrent, ppMax: entry.ppMax ?? ppMax } : entry
    ));
    this.state = {
      ...this.state,
      combatants: {
        ...this.state.combatants,
        [actorId]: { ...actor, skills },
      },
    };
  }

  private resolveOpponentId(actorId: string): string | null {
    if (this.playerActorId) {
      return resolveAttackTargetId(actorId, this.state.combatants, this.playerActorId);
    }
    for (const id of Object.keys(this.state.combatants)) {
      if (id !== actorId) return id;
    }
    return null;
  }

  private handlePetDefeat(targetId: string, before: Combatant, after: Combatant, events: CombatEvent[]): void {
    if (!wasPetJustDefeated(before, after)) return;

    const ownerPlayerId = after.ownerPlayerId ?? this.playerActorId ?? '';
    events.push({
      type: CombatEventType.PET_STATUS_CHANGED,
      payload: {
        battleId: this.state.battleId,
        petActorId: targetId,
        ownerPlayerId,
        status: 'INACTIVE',
        hpCurrent: 0,
        hpMax: after.hpMax ?? after.maxHp,
      },
    });
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: this.state.battleId,
      line: `${after.name} foi derrotado e saiu da fila de turnos.`,
      ts: Date.now(),
    });
  }

  public startChoosing(activeActorId: string): CombatEvent[] {
    const usesPetQueue = Boolean(
      this.playerActorId && battleUsesPetTurnQueue(this.state.combatants),
    );
    this.state = {
      ...this.state,
      phase: 'CHOOSING',
      activeActorId,
      ...(usesPetQueue ? { petAssistCycleIndex: 0, alliancePlayerTurnsSincePet: 0 } : {}),
    };
    this.applyMarcoTurnStart(activeActorId);
    return [
      {
        type: CombatEventType.BATTLE_START,
        payload: { battleId: this.state.battleId, combatants: this.state.combatants },
      },
      { type: CombatEventType.TURN_START, payload: this.toTurnUpdate() },
    ];
  }

  /** Fuga/render-se — derrota imediata com HP zerado (anti-exploit). */
  public forfeitActor(actorId: string): CombatEvent[] {
    const actor = this.state.combatants[actorId];
    if (!actor) return [];

    const events: CombatEvent[] = [{
      type: CombatEventType.COMBAT_LOG,
      battleId: this.state.battleId,
      line: `${actor.name} fugiu da batalha.`,
      ts: Date.now(),
    }];

    this.state = {
      ...this.state,
      phase: 'ENDED',
      activeActorId: null,
      combatants: {
        ...this.state.combatants,
        [actorId]: withHp(actor, 0),
      },
    };
    this.pushTurnStartIfContinuing(events);
    return events;
  }

  /** Evita TURN_START fantasma após fuga ou vitória/derrota (phase ENDED). */
  private pushTurnStartIfContinuing(events: CombatEvent[]): void {
    if (this.state.phase === 'ENDED') return;
    events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
  }

  public computeEffectiveSpeed(actorId: string): number {
    const actor = this.state.combatants[actorId];
    if (!actor) return 0;
    return this.computeEffectiveSpeedRaw(actorId, actor);
  }

  public setRuneSpeedFlatConditional(actorId: string, amount: number): void {
    const actor = this.state.combatants[actorId];
    if (!actor?.speedProfile) return;
    this.state = {
      ...this.state,
      combatants: {
        ...this.state.combatants,
        [actorId]: {
          ...actor,
          speedProfile: { ...actor.speedProfile, runeSpeedFlatConditional: amount },
        },
      },
    };
  }

  public updateRuneCharges(actorId: string, chargesRemaining: number): void {
    const actor = this.state.combatants[actorId];
    if (!actor?.runeInstance) return;
    this.state = {
      ...this.state,
      combatants: {
        ...this.state.combatants,
        [actorId]: {
          ...actor,
          runeInstance: { ...actor.runeInstance, chargesRemaining },
        },
      },
    };
  }

  /** Mantém o jogador na fase de escolha após um round PvE resolvido por iniciativa. */
  public ensureChoosingActor(actorId: string): void {
    if (this.state.phase === 'ENDED') return;
    this.state = {
      ...this.state,
      phase: 'CHOOSING',
      activeActorId: actorId,
    };
  }

  public setPetAllianceProgress(progress: {
    readonly alliancePlayerTurnsSincePet: number;
    readonly petAssistCycleIndex: number;
  }): void {
    if (this.state.phase === 'ENDED') return;
    this.state = {
      ...this.state,
      alliancePlayerTurnsSincePet: Math.max(0, Math.floor(progress.alliancePlayerTurnsSincePet)),
      petAssistCycleIndex: Math.max(0, Math.floor(progress.petAssistCycleIndex)),
    };
  }

  public resolveTurnOrder(requests: readonly ResolvedCombatAction[]): readonly ResolvedCombatAction[] {
    return this.resolveTurnOrderV12(requests);
  }

  /** Ordem de turno V1.2 (score_based). */
  public resolveTurnOrderV12(requests: readonly ResolvedCombatAction[]): readonly ResolvedCombatAction[] {
    return this.rankActionsInternal(requests).map((r) => r.request);
  }

  public applyAction(request: ResolvedCombatAction): CombatEvent[] {
    if (this.isBattleClosed()) {
      return [{
        type: CombatEventType.ACTION_REJECTED,
        payload: { ...request, reason: 'BATTLE_ENDED' },
      }];
    }
    const invalidReason = this.validateAction(request);
    if (invalidReason) return this.buildActionRejectedEvents(request, invalidReason);

    this.state = { ...this.state, phase: 'RESOLVING' };
    const events: CombatEvent[] = [];
    this.prepareActorTurnStart(request.actorId, events);
    events.push(...this.executeAcceptedAction(request));
    events.push({
      type: CombatEventType.TURN_RESOLVED,
      payload: {
        battleId: this.state.battleId,
        turn: this.state.turn,
        phase: this.state.phase === 'IDLE' ? 'CHOOSING' : this.state.phase,
        activeActorId: this.state.activeActorId,
      },
    });
    if (this.isReactiveConsumableOnly(request)) {
      this.restoreChoosingAfterReactiveConsumable(request.actorId);
    } else {
      this.finishTurn(request.actorId);
    }
    this.pushTurnStartIfContinuing(events);
    return events;
  }

  public resolveTurn(requests: readonly ResolvedCombatAction[]): CombatEvent[] {
    if (this.isBattleClosed()) {
      return requests.map((request) => ({
        type: CombatEventType.ACTION_REJECTED,
        payload: { ...request, reason: 'BATTLE_ENDED' },
      }));
    }
    if (this.state.phase !== 'CHOOSING') {
      return requests.map((request) => ({
        type: CombatEventType.ACTION_REJECTED,
        payload: { ...request, reason: 'NOT_IN_CHOOSING_PHASE' },
      }));
    }

    this.state = { ...this.state, phase: 'RESOLVING' };

    const usesPetQueue = battleUsesPetTurnQueue(this.state.combatants);
    const ranked = usesPetQueue
      ? this.rankPetQueueActions(requests)
      : this.rankActionsInternal(requests);

    const events: CombatEvent[] = [{
      type: CombatEventType.TURN_ORDER_RESOLVED,
      payload: {
        battleId: this.state.battleId,
        turn: this.state.turn,
        order: ranked.map((r) => r.actorId),
        reason: usesPetQueue ? 'PET_QUEUE' : resolveOrderReason(ranked),
        debug: ranked.map((r) => {
          const actor = this.state.combatants[r.actorId];
          const speedDisplay = actor?.speedProfile
            ? formatInitiativeSpeedDisplay({
                profile: actor.speedProfile,
                ...(actor.combatStatSources ? { sources: actor.combatStatSources } : {}),
                potionSpeedBuff: this.resolvePotionSpeedBuff(r.actorId),
                effectiveSpeedRaw: r.effectiveSpeedRaw,
                speedAttributeContribution: r.speedAttributeContribution,
              })
            : null;
          return {
            actorId: r.actorId,
            priority: r.skillPriority,
            movesetPriorityScore: r.movesetPriorityScore,
            speedBonusTotal: r.speedBonusTotal,
            speedAttributeContribution: r.speedAttributeContribution,
            initiativeScore: r.initiativeScore,
            effectiveSpeed: r.effectiveSpeedRaw,
            tieBreakerSeed: r.tieBreakerSeed,
            ...(speedDisplay?.sumEquation ? { speedSumEquation: speedDisplay.sumEquation } : {}),
            ...(speedDisplay?.buildRoster ? { speedBuildRoster: speedDisplay.buildRoster } : {}),
            ...(speedDisplay?.initiativeLine ? { initiativeLine: speedDisplay.initiativeLine } : {}),
          };
        }),
      },
    }];

    for (const rankedAction of ranked) {
      const invalidReason = this.validateAction(rankedAction.request, true);
      if (invalidReason) {
        events.push(...this.buildActionRejectedEvents(rankedAction.request, invalidReason));
        continue;
      }
      this.prepareActorTurnStart(rankedAction.request.actorId, events);
      events.push(...this.executeAcceptedAction(rankedAction.request));
      if (resolveHasBattleEnded(this.state.combatants, this.playerActorId ?? undefined, this.state.battleType)) break;
    }

    events.push({
      type: CombatEventType.TURN_RESOLVED,
      payload: {
        battleId: this.state.battleId,
        turn: this.state.turn,
        phase: this.state.phase === 'IDLE' ? 'CHOOSING' : this.state.phase,
        activeActorId: this.state.activeActorId,
      },
    });

    this.finishTurn();
    this.pushTurnStartIfContinuing(events);
    return events;
  }

  private validateAction(request: ResolvedCombatAction, ignoreTurnOwner = false): string | null {
    if (this.isBattleClosed()) return 'BATTLE_ENDED';
    if (request.battleId !== this.state.battleId) return 'INVALID_BATTLE';
    if (!ignoreTurnOwner && (this.state.phase !== 'CHOOSING' || this.state.activeActorId !== request.actorId)) {
      return 'NOT_YOUR_TURN';
    }
    if (request.turn !== this.state.turn) return 'STALE_TURN';
    const actor = this.state.combatants[request.actorId];
    if (!actor) return 'INVALID_ACTOR';
    if (request.skillId !== null && !actor.skills.some((skill) => skill.id === request.skillId)) return 'INVALID_SKILL';
    if (request.skillId !== null) {
      if ((actor.lockedSkillIds ?? []).includes(request.skillId)) return 'SKILL_LOCKED';
      const skill = actor.skills.find((entry) => entry.id === request.skillId);
      if (!skill) return 'INVALID_SKILL';
      if (skillUsesPpBudget(skill) && (skill.ppCurrent ?? resolveSkillPpMax(skill)) <= 0) return 'NO_PP';
      if (!this.isSkillReady(request.actorId, skill)) return 'SKILL_ON_COOLDOWN';
    }
    if (request.consumableId && !this.canUseConsumable(request.actorId)) return 'POTION_ON_COOLDOWN';
    const actorRole = getCombatRole(actor);
    if (actorRole === 'PET' && !isPetCombatantActive(actor)) return 'PET_INACTIVE';
    const paralyze = getStatuses(actor).find((entry) => entry.id === RuntimeStatusId.Paralyze);
    if (paralyze && isRuntimeEffectActive(
      this.state.turn,
      resolveRuntimeAppliedAtTurn(paralyze),
      paralyze.turnsRemaining,
      paralyze.id,
    )) {
      const chance = paralyze.metadata?.skipTurnChance ?? 60;
      if (rollPercent(`${this.state.battleId}:${this.state.turn}:${request.actorId}:paralyze`) < chance) {
        return 'PARALYZED_TURN_SKIP';
      }
    }
    const confuse = getStatuses(actor).find((entry) => entry.id === RuntimeStatusId.Confuse);
    if (confuse && isRuntimeEffectActive(
      this.state.turn,
      resolveRuntimeAppliedAtTurn(confuse),
      confuse.turnsRemaining,
      confuse.id,
    )) {
      const chance = confuse.metadata?.failChance ?? 35;
      if (rollPercent(`${this.state.battleId}:${this.state.turn}:${request.actorId}:confuse`) < chance) {
        return 'CONFUSED_TURN_SKIP';
      }
    }
    return null;
  }

  private resolveClassSpeedBias(classId: CombatClassId | undefined, explicitBias: number | undefined): number {
    if (explicitBias !== undefined) return explicitBias;
    if (!classId) return 0;
    return this.balance.initiative.classSpeedBias[classId];
  }

  private resolveMarcoSpeed(activeMarcos: readonly string[] | undefined, flowSpeedBase: number): number {
    const marcos = this.balance.marcos.speed;
    if (activeMarcos && activeMarcos.length > 0) {
      return marcos
        .filter((marco) => activeMarcos.includes(marco.id))
        .reduce((sum, marco) => sum + marco.speedFlat, 0);
    }
    return marcos
      .filter((marco) => flowSpeedBase >= marco.unlockAtFlowSpeed)
      .reduce((sum, marco) => sum + marco.speedFlat, 0);
  }

  private resolvePotionExhaustionPenalty(actorId: string, fallback: number): number {
    const expiresAtTurn = this.potionExhaustionUntilTurn.get(actorId);
    if (!expiresAtTurn) return fallback;
    if (this.state.turn > expiresAtTurn) return 0;
    const basePenalty = this.balance.consumables.potionReactive.exhaustionDebuff.speedFlat;
    const actor = this.state.combatants[actorId];
    const reduction = actor?.marcoCombatFlags?.stableFluxExhaustionReductionPercent ?? 0;
    const scaled = basePenalty * (1 - Math.min(100, Math.max(0, reduction)) / 100);
    return Math.round(scaled);
  }

  private seedMarcoBeyondTimeCharges(actorId: string): number {
    if (!this.marcoBeyondTimeCharges.has(actorId)) {
      const actor = this.state.combatants[actorId];
      this.marcoBeyondTimeCharges.set(actorId, actor?.marcoCombatFlags?.beyondTimeStepsCharges ?? 0);
    }
    return this.marcoBeyondTimeCharges.get(actorId) ?? 0;
  }

  /** Passos Além-Tempo — burst de speed no início do turno do ator. */
  private applyMarcoTurnStart(actorId: string): void {
    const charges = this.seedMarcoBeyondTimeCharges(actorId);
    if (charges <= 0) return;

    const actor = this.state.combatants[actorId];
    if (!actor?.speedProfile) return;

    const burstSpeed = 15;
    this.updateCombatant(actorId, (current) => ({
      ...current,
      speedProfile: {
        ...current.speedProfile!,
        buffSpeedFlat: (current.speedProfile?.buffSpeedFlat ?? 0) + burstSpeed,
      },
    }));
    this.marcoBeyondTimeCharges.set(actorId, charges - 1);
  }

  private resolvePotionSpeedBuff(actorId: string): number {
    const buff = this.potionSpeedBuffUntilTurn.get(actorId);
    if (!buff) return 0;
    return this.state.turn <= buff.untilTurn ? buff.amount : 0;
  }

  private computeSpeedBonusTotal(actorId: string, actor: Combatant): number {
    const profile = actor.speedProfile;
    if (!profile) return 0;
    const caps = this.balance.initiative.speedBonusTotal.caps;
    const equip = clamp(profile.equipSpeedFlat ?? 0, 0, caps.equipSpeedFlatMax);
    const buff = clamp(profile.buffSpeedFlat ?? 0, 0, caps.buffSpeedFlatMax);
    const rune = clamp(profile.runeSpeedFlatConditional ?? 0, 0, caps.runeSpeedConditionalMax);
    const marco = profile.marcoSpeedFlat ?? this.resolveMarcoSpeed(profile.activeMarcos, profile.flowSpeedBase);
    const potionSpeedBuff = this.resolvePotionSpeedBuff(actorId);
    const potionExhaustionPenalty = this.resolvePotionExhaustionPenalty(actorId, profile.potionExhaustionPenalty ?? 0);
    const raw = equip + buff + rune + marco + potionSpeedBuff + potionExhaustionPenalty;
    const clampCfg = this.balance.initiative.speedBonusTotal.clamp;
    return clamp(raw, clampCfg.min, clampCfg.max);
  }

  private computeEffectiveSpeedRaw(actorId: string, actor: Combatant): number {
    const profile = actor.speedProfile;
    if (!profile) return 0;
    const classBias = this.resolveClassSpeedBias(actor.classId, profile.classSpeedBias);
    const speedBonusTotal = this.computeSpeedBonusTotal(actorId, actor);
    const raw = profile.flowSpeedBase + classBias + speedBonusTotal;
    const clampCfg = this.balance.initiative.effectiveSpeedRawClamp;
    return clamp(raw, clampCfg.min, clampCfg.max);
  }

  public applyHpElasticity(targetId: string, baseDamage: number, events: CombatEvent[]): number {
    return this.applyElasticity(targetId, baseDamage, events);
  }

  private applyElasticity(targetId: string, baseDamage: number, events: CombatEvent[]): number {
    const target = this.state.combatants[targetId];
    if (!target || baseDamage <= 0) return 0;
    const hpRatio = getHp(target) / Math.max(1, getMaxHp(target));
    const band = this.balance.hpElasticity.damageTakenMultiplierByHpRatio.find(
      (entry) => hpRatio >= entry.minHpRatio && hpRatio <= entry.maxHpRatio,
    );
    const maxReductionMultiplier = 1 - this.balance.hpElasticity.guards.maxTotalDamageReductionRatio;
    const multiplier = Math.max(maxReductionMultiplier, band?.multiplier ?? 1);
    events.push({
      type: CombatEventType.ELASTICITY_APPLIED,
      payload: {
        battleId: this.state.battleId,
        targetId,
        hpRatioBefore: hpRatio,
        damageMultiplier: multiplier,
      },
    });
    return multiplier;
  }

  public applyPotionReactiveAndExhaustion(request: ResolvedCombatAction, events: CombatEvent[]): void {
    this.applyPotionReactive(request, events);
  }

  private isReactiveConsumableOnly(request: ResolvedCombatAction): boolean {
    return isReactiveConsumableAction(request, this.balance.consumables.potionReactive);
  }

  private restoreChoosingAfterReactiveConsumable(actorId: string): void {
    if (this.state.phase === 'ENDED') return;
    this.state = {
      ...this.state,
      phase: 'CHOOSING',
      activeActorId: actorId,
    };
  }

  private resolvePotionSaturationStep(): number {
    return this.balance.consumables.potionReactive.saturationStepPercent
      ?? 10;
  }

  private resolvePotionSaturationCap(): number {
    return this.balance.consumables.potionReactive.saturationCapPercent
      ?? 100;
  }

  private getPotionUsesInBattle(actorId: string): number {
    return this.potionUsesInBattle.get(actorId) ?? 0;
  }

  private applyPotionReactive(request: ResolvedCombatAction, events: CombatEvent[]): void {
    if (!request.consumableId || !this.balance.consumables.potionReactive.enabled) return;
    if (!this.canUseConsumable(request.actorId)) return;

    const actor = this.state.combatants[request.actorId];
    if (!actor) return;

    const usesBefore = this.getPotionUsesInBattle(request.actorId);
    const step = this.resolvePotionSaturationStep();
    const cap = this.resolvePotionSaturationCap();
    const healMult = resolvePotionHealMultiplierFromUses(usesBefore, step);
    const usesAfter = usesBefore + 1;
    const saturationAfter = resolvePotionSaturationPercent(usesAfter, step, cap);

    this.trackPotionUseForTurn(request.actorId);
    this.potionLastUsedTurn.set(request.actorId, this.state.turn);
    const cooldownTurns = this.balance.consumables.potionReactive.globalCooldownTurns;
    if (cooldownTurns > 0) {
      this.potionCooldownUntilTurn.set(
        request.actorId,
        this.state.turn + cooldownTurns,
      );
    }

    const tonic = this.balance.consumables.examples[request.consumableId as keyof typeof this.balance.consumables.examples];
    if (tonic) {
      this.potionSpeedBuffUntilTurn.set(request.actorId, {
        amount: tonic.value,
        untilTurn: this.state.turn + tonic.durationTurns,
      });
    }

    this.potionUsesInBattle.set(request.actorId, usesAfter);
    const ppDrain = applyPotionPpDrainStepToSkills(actor.skills, step);
    this.updateCombatant(request.actorId, (current) => ({
      ...current,
      potionUsesInBattle: usesAfter,
      potionSaturationPercent: saturationAfter,
      skills: ppDrain.skills,
    }));
    for (const skill of ppDrain.skills) {
      if (!skillUsesPpBudget(skill)) continue;
      events.push({
        type: CombatEventType.PP_CHANGED,
        payload: {
          battleId: this.state.battleId,
          actorId: request.actorId,
          skillId: skill.id,
          ppCurrent: skill.ppCurrent ?? 0,
          ppMax: skill.ppMax ?? resolveSkillPpMax(skill),
        },
      });
    }

    const exhaustion = this.balance.consumables.potionReactive.exhaustionDebuff;
    if (exhaustion.durationTurns > 0) {
      this.applyPotionExhaustion(request.actorId, events);
    }

    events.push({
      type: CombatEventType.CONSUMABLE_USED,
      payload: {
        battleId: this.state.battleId,
        actorId: request.actorId,
        consumableId: request.consumableId,
      },
    });

    const baseHeal = request.consumableHeal ?? 0;
    if (baseHeal > 0) {
      this.applyHealingDecayInternal(
        request.actorId,
        baseHeal,
        events,
        healMult * this.resolveExhaustionHealMultiplier(request.actorId),
      );
    }

    const actorName = actor.name;
    const exhaustedLabels = ppDrain.exhaustedMoveIds
      .map((id) => resolveMoveCombatMeta(id)?.name ?? id);
    let logLine = saturationAfter >= cap
      ? `${actorName} saturou poções (${cap}%): cura inútil; PP do moveset esgotado.`
      : `${actorName} usou consumível — saturação ${saturationAfter}% (−${step}% PP máx. em cada move neste uso; cura futura −${step}%).`;
    if (exhaustedLabels.length > 0) {
      logLine += ` Sem PP: ${exhaustedLabels.join(', ')}.`;
    }
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: this.state.battleId,
      line: logLine,
      ts: Date.now(),
    });
  }

  private resolveExhaustionHealMultiplier(actorId: string): number {
    const exhaustionTurn = this.potionExhaustionUntilTurn.get(actorId);
    if (!exhaustionTurn || this.state.turn > exhaustionTurn) return 1;
    return this.balance.consumables.potionReactive.exhaustionDebuff.healReceivedMultiplier;
  }

  private applyPotionExhaustion(actorId: string, events: CombatEvent[]): void {
    const exhaustion = this.balance.consumables.potionReactive.exhaustionDebuff;
    const expiresAtTurn = this.state.turn + exhaustion.durationTurns;
    this.potionExhaustionUntilTurn.set(actorId, expiresAtTurn);
    events.push({
      type: CombatEventType.EXHAUSTION_APPLIED,
      payload: {
        battleId: this.state.battleId,
        actorId,
        speedPenalty: exhaustion.speedFlat,
        healReceivedMultiplier: exhaustion.healReceivedMultiplier,
        expiresAtTurn,
      },
    });
  }

  public applyHealingDecay(actorId: string, baseHeal: number, events: CombatEvent[]): void {
    return this.applyHealingDecayInternal(actorId, baseHeal, events);
  }

  private applyHealingDecayInternal(
    actorId: string,
    baseHeal: number,
    events: CombatEvent[],
    extraHealMultiplier = 1,
  ): void {
    if (baseHeal <= 0) return;
    const actor = this.state.combatants[actorId];
    if (!actor) return;

    const windowTurns = this.balance.antiStall.healingDecayWindowTurns;
    const recentTurns = (this.healingHistory.get(actorId) ?? []).filter((turn) => turn >= this.state.turn - (windowTurns - 1));
    const occurrence = recentTurns.length + 1;
    const sequence = this.balance.antiStall.healingDecaySequence;
    const decayMultiplier = occurrence <= sequence.length
      ? (sequence[occurrence - 1] ?? 1)
      : (sequence[sequence.length - 1] ?? 1);
    const hpRatio = getHp(actor) / Math.max(1, getMaxHp(actor));
    const lowHpMultiplier = hpRatio <= this.balance.hpElasticity.healingReceived.lowHpThresholdRatio
      ? this.balance.hpElasticity.healingReceived.lowHpHealingMultiplier
      : 1;
    const healCap = Math.floor(getMaxHp(actor) * this.balance.hpElasticity.healingReceived.instantHealCapByMaxHpRatio);
    const healed = Math.min(
      healCap,
      Math.max(0, Math.floor(baseHeal * decayMultiplier * lowHpMultiplier * extraHealMultiplier)),
    );
    const nextHp = Math.min(getMaxHp(actor), getHp(actor) + healed);
    this.state = {
      ...this.state,
      combatants: { ...this.state.combatants, [actorId]: withHp(actor, nextHp) },
    };
    recentTurns.push(this.state.turn);
    this.healingHistory.set(actorId, recentTurns);
    events.push({
      type: CombatEventType.HEALING_DECAY_APPLIED,
      payload: { battleId: this.state.battleId, actorId, turn: this.state.turn, decayMultiplier },
    });
    if (healed > 0) {
      events.push({
        type: CombatEventType.HEAL_APPLIED,
        payload: {
          battleId: this.state.battleId,
          actorId,
          targetId: actorId,
          amount: healed,
          hpAfter: nextHp,
        },
      });
    }
  }

  public applySuddenDeathScaling(baseDamage: number, events: CombatEvent[]): number {
    return this.applySuddenDeathScalingInternal(baseDamage, events);
  }

  private applySuddenDeathScalingInternal(baseDamage: number, events: CombatEvent[]): number {
    const sd = this.balance.antiStall.suddenDeath;
    if (this.state.turn < sd.startTurn) return baseDamage;
    const bonus = clamp((this.state.turn - (sd.startTurn - 1)) * sd.globalDamageIncreasePerTurn, 0, sd.globalDamageIncreaseCap);
    const scaled = Math.floor(baseDamage * (1 + bonus));
    events.push({
      type: CombatEventType.SUDDEN_DEATH_SCALING_APPLIED,
      payload: { battleId: this.state.battleId, turn: this.state.turn, damageMultiplier: 1 + bonus },
    });
    return scaled;
  }

  private canUseConsumable(actorId: string): boolean {
    const potion = this.balance.consumables.potionReactive;
    const key = `${actorId}:${this.state.turn}`;
    const usedThisTurn = this.potionUsesByTurn.get(key) ?? 0;
    if (usedThisTurn >= potion.maxUsesPerTurn) return false;
    const cooldownUntil = this.potionCooldownUntilTurn.get(actorId) ?? 0;
    if (this.state.turn <= cooldownUntil) return false;
    const lastTurn = this.potionLastUsedTurn.get(actorId) ?? -9999;
    if (potion.disallowConsecutiveTurns && this.state.turn === lastTurn + 1) return false;
    return true;
  }

  private trackPotionUseForTurn(actorId: string): void {
    const key = `${actorId}:${this.state.turn}`;
    this.potionUsesByTurn.set(key, (this.potionUsesByTurn.get(key) ?? 0) + 1);
  }

  private updateCombatant(combatantId: string, updater: (current: Combatant) => Combatant): Combatant | null {
    const current = this.state.combatants[combatantId];
    if (!current) return null;
    const updated = updater(current);
    this.state = {
      ...this.state,
      combatants: {
        ...this.state.combatants,
        [combatantId]: updated,
      },
    };
    return updated;
  }

  private setStatusEffectsFromRuntime(combatantId: string): void {
    const currentTurn = this.state.turn;
    this.updateCombatant(combatantId, (current) => ({
      ...current,
      statusEffects: getStatuses(current).map((entry) => (
        `${entry.name} (${formatRuntimeStatusDisplayTurns(entry, currentTurn)})`
      )),
    }));
  }

  /** Tick por Ator — expira e aplica residuals no início do turno do portador. */
  private prepareActorTurnStart(actorId: string, events: CombatEvent[]): void {
    const actor = this.state.combatants[actorId];
    if (!actor) return;

    const currentTurn = this.state.turn;
    const expiredStatusIds: string[] = [];

    for (const status of [...getStatuses(actor)]) {
      const appliedAtTurn = resolveRuntimeAppliedAtTurn(status);
      const duration = status.turnsRemaining;

      if (status.id === RuntimeStatusId.AttackEcho) {
        if ((status.stacks ?? 0) <= 0) expiredStatusIds.push(status.id);
        continue;
      }

      if (isPermanentRuntimeStatus(status)) continue;

      if (status.id === RuntimeStatusId.DelayedDetonation
        && shouldDetonateDelayedOnActorTurnStart(currentTurn, appliedAtTurn, duration)) {
        const basePower = status.metadata?.basePower ?? 0;
        const multi = status.metadata?.delayedDamageMultiplier ?? 3;
        const source = status.sourceActorId ?? actorId;
        const dmg = Math.max(1, Math.floor(basePower * multi));
        this.pushStatusEvent(events, actorId, status.id, 'tick', dmg);
        this.applyDirectDamage(source, actorId, dmg, events);
        expiredStatusIds.push(status.id);
        continue;
      }

      if (shouldTickOnActorTurnStart(currentTurn, appliedAtTurn, duration, status.id)) {
        if (status.id === RuntimeStatusId.Burn) {
          const percent = status.metadata?.burnDamagePercent ?? 5;
          const dmg = Math.max(1, Math.floor(getMaxHp(actor) * (percent / 100)));
          this.pushStatusEvent(events, actorId, status.id, 'tick', dmg);
          this.applyDirectDamage(actorId, actorId, dmg, events, { ignoreBarrierPercent: 100 });
        } else if (status.id === RuntimeStatusId.HealEcho) {
          const echo = status.metadata?.echoPercent ?? 10;
          const baseHeal = status.metadata?.baseHeal ?? 0;
          const heal = Math.max(1, Math.floor(baseHeal * (echo / 100)));
          this.pushStatusEvent(events, actorId, status.id, 'tick', heal);
          this.applyHeal(actorId, actorId, heal, events);
        } else if (status.id === RuntimeStatusId.Confuse) {
          const residualPercent = status.metadata?.residualDamagePercent ?? 10;
          const dmg = Math.max(1, Math.floor(getMaxHp(actor) * (residualPercent / 100)));
          this.pushStatusEvent(events, actorId, status.id, 'tick', dmg);
          this.applyDirectDamage(actorId, actorId, dmg, events, { ignoreBarrierPercent: 100 });
        }
      }

      if (isRuntimeEffectExpired(currentTurn, appliedAtTurn, duration, status.id)) {
        expiredStatusIds.push(status.id);
      }
    }

    if (expiredStatusIds.length > 0) {
      this.updateCombatant(actorId, (current) => {
        const nextStatuses = getStatuses(current).filter((row) => !expiredStatusIds.includes(row.id));
        const lockExpired = expiredStatusIds.includes(RuntimeStatusId.LockEnemyMoves);
        return {
          ...current,
          activeStatuses: nextStatuses,
          ...(lockExpired ? { lockedSkillIds: [] } : {}),
        };
      });
      this.setStatusEffectsFromRuntime(actorId);
      for (const statusId of expiredStatusIds) {
        this.pushStatusEvent(events, actorId, statusId, 'expired');
        events.push({
          type: CombatEventType.STATUS_EXPIRED,
          payload: { battleId: this.state.battleId, targetId: actorId, statusId },
        });
      }
    }

    this.updateCombatant(actorId, (current) => {
      const nextShields = getShields(current).filter((shield) => (
        isRuntimeShieldActive(currentTurn, shield)
      ));
      const nextModifiers = getModifiers(current).filter((mod) => (
        isRuntimeModifierActive(currentTurn, mod)
      ));
      const lockStatus = getStatuses(current).find((row) => row.id === RuntimeStatusId.LockEnemyMoves);
      return {
        ...current,
        activeShields: nextShields,
        temporaryModifiers: nextModifiers,
        lockedSkillIds: lockStatus ? (current.lockedSkillIds ?? []) : [],
      };
    });
    this.setStatusEffectsFromRuntime(actorId);
  }

  private statusAtTurn(
    id: RuntimeStatusId | string,
    name: string,
    duration: number,
    options?: {
      readonly stacks?: number;
      readonly sourceActorId?: string;
      readonly sourceSkillId?: string;
      readonly metadata?: Readonly<Record<string, number>>;
    },
  ): RuntimeStatus {
    return buildRuntimeStatus(id, name, duration, this.state.turn, options);
  }

  private addOrRefreshStatus(
    targetId: string,
    status: RuntimeStatus,
    events: CombatEvent[],
  ): void {
    const before = this.state.combatants[targetId];
    if (before && isIncomingStatusBlocked(before, status.id, this.state.turn)) {
      events.push({
        type: CombatEventType.COMBAT_LOG,
        battleId: this.state.battleId,
        line: `${before.name} resistiu a ${status.name}!`,
        ts: Date.now(),
      });
      return;
    }
    const existing = before ? getStatuses(before).find((row) => row.id === status.id) : undefined;
    const phase: StatusEventPhase = existing ? 'renewed' : 'applied';

    this.updateCombatant(targetId, (current) => {
      const prior = getStatuses(current).find((row) => row.id === status.id);
      const nextStatuses = prior
        ? getStatuses(current).map((row) => (row.id === status.id
          ? {
              ...row,
              turnsRemaining: Math.max(row.turnsRemaining, status.turnsRemaining),
              ...(status.appliedAtTurn !== undefined ? { appliedAtTurn: status.appliedAtTurn } : {}),
              stacks: Math.max(row.stacks, status.stacks),
              ...(status.metadata ? { metadata: status.metadata } : {}),
            }
          : row))
        : [...getStatuses(current), status];
      return { ...current, activeStatuses: nextStatuses };
    });
    this.setStatusEffectsFromRuntime(targetId);
    events.push({
      type: CombatEventType.STATUS_APPLIED,
      payload: {
        battleId: this.state.battleId,
        targetId,
        statusId: status.id,
        statusName: status.name,
        turnsRemaining: status.turnsRemaining,
        stacks: status.stacks,
        appliedAtTurn: status.appliedAtTurn ?? this.state.turn,
      },
    });
    this.pushStatusEvent(events, targetId, status.id, phase);
  }

  private applyModifier(
    targetId: string,
    kind: RuntimeModifierKind,
    percent: number,
    duration: number,
  ): void {
    const appliedAtTurn = this.state.turn;
    this.updateCombatant(targetId, (current) => ({
      ...current,
      temporaryModifiers: [...getModifiers(current), buildRuntimeModifier(kind, percent, duration, appliedAtTurn)],
    }));
  }

  private applyWeakenModifier(targetId: string, percent: number, turnsRemaining: number): void {
    this.applyModifier(targetId, RuntimeModifierKind.BuffWeaken, percent, turnsRemaining);
  }

  private applyAttackModifier(targetId: string, percent: number, turnsRemaining: number): void {
    this.applyModifier(targetId, RuntimeModifierKind.Attack, percent, turnsRemaining);
  }

  private applyCritModifier(targetId: string, percent: number, turnsRemaining: number): void {
    this.applyModifier(targetId, RuntimeModifierKind.CritChance, percent, turnsRemaining);
  }

  private applyIncomingReductionModifier(targetId: string, percent: number, turnsRemaining: number): void {
    this.applyModifier(targetId, RuntimeModifierKind.IncomingDamageReduction, percent, turnsRemaining);
  }

  private damageOptionsFromRequest(
    request: ResolvedCombatAction,
    extra?: DirectDamageOptions,
  ): DirectDamageOptions {
    const skillId = request.skillId ?? undefined;
    const actor = skillId ? this.state.combatants[request.actorId] : undefined;
    const skillName = skillId
      ? resolveHitMoveDisplayName(exactOptionalProps({
          skillId,
          ...(actor?.skills ? { combatantSkills: actor.skills } : {}),
        }))
      : undefined;

    return {
      ...(skillId ? { skillId } : {}),
      ...(skillName ? { skillName } : {}),
      ...(request.runeCritBonus !== undefined ? { runeCritBonus: request.runeCritBonus } : {}),
      ...(request.runeReflectRatio !== undefined ? { runeReflectRatio: request.runeReflectRatio } : {}),
      ...extra,
    };
  }

  private resolveDamageEventSkillMeta(
    sourceId: string,
    options: DirectDamageOptions,
  ): { readonly skillId?: string; readonly skillName?: string } {
    if (!options.skillId) return {};
    const actor = this.state.combatants[sourceId];
    const skillName = resolveHitMoveDisplayName(exactOptionalProps({
      skillId: options.skillId,
      skillName: options.skillName,
      ...(actor?.skills ? { combatantSkills: actor.skills } : {}),
    }));
    return {
      skillId: options.skillId,
      ...(skillName ? { skillName } : {}),
    };
  }

  private applyShield(
    targetId: string,
    shield: RuntimeShield,
    events: CombatEvent[],
  ): void {
    this.updateCombatant(targetId, (current) => ({
      ...current,
      activeShields: [...getShields(current), shield],
    }));
    events.push({
      type: CombatEventType.SHIELD_APPLIED,
      payload: {
        battleId: this.state.battleId,
        actorId: targetId,
        shieldId: shield.id,
        value: shield.value,
        turnsRemaining: shield.turnsRemaining,
      },
    });
  }

  private applyHeal(
    sourceId: string,
    targetId: string,
    baseAmount: number,
    events: CombatEvent[],
    sourceSkillId?: string,
  ): void {
    const target = this.state.combatants[targetId];
    if (!target || baseAmount <= 0) return;
    const turn = this.state.turn;
    const healBonus =
      resolveModifierPercent(target, RuntimeModifierKind.Heal, turn)
      - resolveModifierPercent(target, RuntimeModifierKind.BuffWeaken, turn);
    const finalHeal = Math.max(0, Math.floor(baseAmount * (1 + healBonus / 100)));
    const nextHp = Math.min(getMaxHp(target), getHp(target) + finalHeal);
    this.updateCombatant(targetId, (current) => withHp(current, nextHp));
    events.push({
      type: CombatEventType.HEAL_APPLIED,
      payload: {
        battleId: this.state.battleId,
        actorId: sourceId,
        targetId,
        amount: finalHeal,
        hpAfter: nextHp,
        ...(sourceSkillId ? { sourceSkillId } : {}),
      },
    });
  }

  private applyDirectDamage(
    sourceId: string,
    targetId: string,
    power: number,
    events: CombatEvent[],
    options: DirectDamageOptions = {},
  ): number {
    const actor = this.state.combatants[sourceId];
    const target = this.state.combatants[targetId];
    if (!actor || !target || power <= 0) return 0;

    const skillMeta = this.resolveDamageEventSkillMeta(sourceId, options);

    const forceCritical = actor.marcoCombatFlags?.precisionMasterReady === true;
    const damageResult = calculateDamage(actor, target, { id: 'runtime', power }, {
      turn: this.state.turn,
      forceCritical,
      defenderActiveStatuses: getStatuses(target),
      ...(options.runeCritBonus !== undefined ? { runeCritBonus: options.runeCritBonus } : {}),
      ...(options.behaviorMultiplier !== undefined ? { behaviorMultiplier: options.behaviorMultiplier } : {}),
    });
    if (forceCritical && damageResult.isCritical) {
      this.updateCombatant(sourceId, (current) => ({
        ...current,
        marcoCombatFlags: { ...current.marcoCombatFlags, precisionMasterReady: false },
      }));
    }
    if (damageResult.isCritical && target.marcoCombatFlags?.invincibleBastionEnabled) {
      this.addOrRefreshStatus(targetId, this.statusAtTurn(
        RuntimeStatusId.MarcoCcImmune,
        'Bastião Imbatível',
        1,
      ), events);
    }
    if (damageResult.blocked || damageResult.finalDamage <= 0) {
      events.push({
        type: CombatEventType.DAMAGE_DEALT,
        payload: {
          battleId: this.state.battleId,
          sourceId,
          targetId,
          amount: 0,
          hpAfter: resolveCombatantHp(target),
          isCritical: damageResult.isCritical,
          attackBreakdown: damageResult.attackBreakdown,
          defenseBreakdown: damageResult.defenseBreakdown,
          ...skillMeta,
        },
      });
      return 0;
    }
    let finalDamage = Math.max(this.balance.hpElasticity.guards.minDamagePerHit, damageResult.finalDamage);

    const turn = this.state.turn;
    const ignoreBarrierPercent = options.ignoreBarrierPercent ?? 0;
    if (ignoreBarrierPercent < 100) {
      const shields = [...getShields(target)].filter((shield) => isRuntimeShieldActive(turn, shield));
      let remaining = finalDamage;
      const nextShields: RuntimeShield[] = [];
      for (const shield of shields) {
        if (remaining <= 0) {
          nextShields.push(shield);
          continue;
        }
        const absorbed = Math.min(shield.value, remaining);
        remaining -= absorbed;
        const left = shield.value - absorbed;
        if (left > 0) nextShields.push({ ...shield, value: left });
      }
      finalDamage = remaining;
      this.updateCombatant(targetId, (current) => ({ ...current, activeShields: nextShields }));
    }

    const incomingReduction =
      resolveModifierPercent(target, RuntimeModifierKind.IncomingDamageReduction, turn)
      + resolveModifierPercent(target, RuntimeModifierKind.Defense, turn)
      + (target.combatStats?.damageReductionPercent ?? 0);
    finalDamage = Math.max(0, Math.floor(finalDamage * (1 - incomingReduction / 100)));
    const hpAfter = Math.max(0, getHp(target) - finalDamage);
    const updatedTarget = isPetCombatant(target)
      ? applyPetCombatHp(target, hpAfter)
      : withHp(target, hpAfter);
    this.updateCombatant(targetId, () => updatedTarget);
    this.handlePetDefeat(targetId, target, updatedTarget, events);
    if (finalDamage > 0) {
      this.accumulateRetaliationDamage(targetId, finalDamage, events);
    }
    events.push({
      type: CombatEventType.DAMAGE_DEALT,
      payload: {
        battleId: this.state.battleId,
        sourceId,
        targetId,
        amount: finalDamage,
        hpAfter: resolveCombatantHp(updatedTarget),
        isCritical: damageResult.isCritical,
        attackBreakdown: damageResult.attackBreakdown,
        defenseBreakdown: damageResult.defenseBreakdown,
        ...skillMeta,
      },
    });

    if (finalDamage > 0 && !options.skipThornsReflect) {
      this.maybeApplyThornsReflect(sourceId, targetId, finalDamage, events);
    }
    if (finalDamage > 0 && !options.skipRuneReflect && options.runeReflectRatio && options.runeReflectRatio > 0) {
      const reflectDamage = Math.max(1, Math.floor(finalDamage * options.runeReflectRatio));
      this.applyDirectDamage(targetId, sourceId, reflectDamage, events, {
        ignoreBarrierPercent: 100,
        skipThornsReflect: true,
        skipRuneReflect: true,
      });
    }

    return finalDamage;
  }

  private maybeApplyThornsReflect(
    sourceId: string,
    targetId: string,
    damageDealt: number,
    events: CombatEvent[],
  ): void {
    const target = this.state.combatants[targetId];
    if (!target) return;
    const thorns = getStatuses(target).find((row) => row.id === RuntimeStatusId.Thorns);
    if (!thorns || !isRuntimeEffectActive(
      this.state.turn,
      resolveRuntimeAppliedAtTurn(thorns),
      thorns.turnsRemaining,
      thorns.id,
    )) return;
    const reflectPercent = thorns.metadata?.reflectPercent ?? 50;
    const reflectDamage = Math.max(1, Math.floor(damageDealt * (reflectPercent / 100)));
    this.applyDirectDamage(targetId, sourceId, reflectDamage, events, {
      ignoreBarrierPercent: 100,
      skipThornsReflect: true,
      skipRuneReflect: true,
    });
    const attackBonusPercent = thorns.metadata?.attackBonusPercent ?? 0;
    const attackBonusTurns = Math.max(1, Math.floor(thorns.metadata?.attackBonusTurns ?? 2));
    if (attackBonusPercent > 0) {
      this.applyAttackModifier(targetId, attackBonusPercent, attackBonusTurns);
      const defender = this.state.combatants[targetId];
      events.push({
        type: CombatEventType.COMBAT_LOG,
        battleId: this.state.battleId,
        line: `${defender?.name ?? targetId} absorve o impacto — +${attackBonusPercent}% ATK por ${attackBonusTurns} turno(s).`,
        ts: Date.now(),
      });
    }
  }

  /** Dano recebido acumulado para Retribuição de Impacto (TUT_1) — persiste até usar o move. */
  private accumulateRetaliationDamage(targetId: string, amount: number, events: CombatEvent[]): void {
    if (amount <= 0) return;
    const target = this.state.combatants[targetId];
    if (!target || getCombatRole(target) !== 'PLAYER') return;

    const tut1Combat = getClassMoveById('TUT_1').combat;
    const params = tut1Combat?.effectParams ?? {};
    const step = params.retaliationDamageStep ?? 10;
    const capPercent = params.retaliationBonusCapPercent ?? 30;
    const maxTracked = resolveRetaliationMaxTrackedDamage(step, capPercent);

    const existing = getStatuses(target).find((row) => row.id === RuntimeStatusId.RetaliationCharge);
    const currentDamage = existing?.metadata?.damageAccumulated ?? 0;
    const nextDamage = Math.min(maxTracked, currentDamage + amount);
    if (nextDamage <= currentDamage) return;

    this.addOrRefreshStatus(targetId, this.statusAtTurn(
      RuntimeStatusId.RetaliationCharge,
      'Fúria',
      99,
      {
        stacks: resolveRetaliationBonusPercent(nextDamage, step, capPercent),
        sourceActorId: targetId,
        metadata: { damageAccumulated: nextDamage },
      },
    ), events);
  }

  private clearRetaliationCharge(actorId: string, events: CombatEvent[]): void {
    const actor = this.state.combatants[actorId];
    if (!actor) return;
    if (!getStatuses(actor).some((row) => row.id === RuntimeStatusId.RetaliationCharge)) return;
    this.updateCombatant(actorId, (current) => ({
      ...current,
      activeStatuses: getStatuses(current).filter((row) => row.id !== RuntimeStatusId.RetaliationCharge),
    }));
    this.pushStatusEvent(events, actorId, RuntimeStatusId.RetaliationCharge, 'expired');
    events.push({
      type: CombatEventType.STATUS_EXPIRED,
      payload: { battleId: this.state.battleId, targetId: actorId, statusId: RuntimeStatusId.RetaliationCharge },
    });
  }

  private pushStatusEvent(
    events: CombatEvent[],
    targetId: string,
    statusId: string,
    phase: StatusEventPhase,
    amount?: number,
  ): void {
    const target = this.state.combatants[targetId];
    events.push(createStatusCombatEvent({
      battleId: this.state.battleId,
      targetId,
      statusId,
      phase,
      ...(amount !== undefined ? { amount } : {}),
      ...(target?.name ? { targetLabel: target.name } : {}),
    }));
  }

  private buildActionRejectedEvents(request: ResolvedCombatAction, reason: string): CombatEvent[] {
    const events: CombatEvent[] = [{
      type: CombatEventType.ACTION_REJECTED,
      payload: { ...request, reason },
    }];
    if (reason === 'PARALYZED_TURN_SKIP') {
      this.pushStatusEvent(events, request.actorId, RuntimeStatusId.Paralyze, 'skip');
    } else if (reason === 'CONFUSED_TURN_SKIP') {
      this.pushStatusEvent(events, request.actorId, RuntimeStatusId.Confuse, 'skip');
    }
    return events;
  }

  private resolveScaledMovePower(actorId: string, skill: SkillData): number {
    const actor = this.state.combatants[actorId];
    if (!actor) return 0;
    const power = skill.basePower ?? skill.damage ?? 0;
    const turn = this.state.turn;
    const actorModifier =
      resolveModifierPercent(actor, RuntimeModifierKind.Attack, turn)
      - resolveModifierPercent(actor, RuntimeModifierKind.BuffWeaken, turn);
    return Math.max(0, Math.floor(power * (1 + actorModifier / 100)));
  }

  private shouldTriggerAttackEcho(pendingSkill: SkillData): boolean {
    const meta = resolveMoveCombatMeta(pendingSkill.id);
    if (!meta || meta.category !== MoveCategory.Attack) return false;
    const power = pendingSkill.basePower ?? pendingSkill.damage ?? 0;
    return power > 0;
  }

  private applyPendingAttackEcho(
    actorId: string,
    events: CombatEvent[],
    pendingSkill?: SkillData,
  ): void {
    const actor = this.state.combatants[actorId];
    if (!actor) return;
    const echoStatus = getStatuses(actor).find((row) => row.id === RuntimeStatusId.AttackEcho);
    if (!echoStatus || (echoStatus.stacks ?? 0) <= 0) return;

    if (pendingSkill && !this.shouldTriggerAttackEcho(pendingSkill)) return;

    const targetId = this.resolveOpponentId(actorId);
    const echoBonusPct = echoStatus.metadata?.echoBonusPercent ?? 15;
    let echoDamage = echoStatus.metadata?.echoDamage ?? 0;
    if (echoDamage <= 0 && pendingSkill) {
      const scaledPower = this.resolveScaledMovePower(actorId, pendingSkill);
      echoDamage = Math.max(1, Math.floor(scaledPower * (1 + echoBonusPct / 100)));
    }
    if (!targetId || echoDamage <= 0) return;

    const target = this.state.combatants[targetId];
    if (target && getHp(target) > 0) {
      events.push({
        type: CombatEventType.COMBAT_LOG,
        battleId: this.state.battleId,
        line: `${actor.name} libera o eco do Impulso (${echoDamage} de dano)!`,
        ts: Date.now(),
      });
      this.pushStatusEvent(events, actorId, RuntimeStatusId.AttackEcho, 'tick', echoDamage);
      this.applyDirectDamage(actorId, targetId, echoDamage, events);
    }

    const nextStacks = (echoStatus.stacks ?? 1) - 1;
    if (nextStacks <= 0) {
      this.updateCombatant(actorId, (current) => ({
        ...current,
        activeStatuses: getStatuses(current).filter((row) => row.id !== RuntimeStatusId.AttackEcho),
      }));
      this.setStatusEffectsFromRuntime(actorId);
      this.pushStatusEvent(events, actorId, RuntimeStatusId.AttackEcho, 'expired');
      events.push({
        type: CombatEventType.STATUS_EXPIRED,
        payload: {
          battleId: this.state.battleId,
          targetId: actorId,
          statusId: RuntimeStatusId.AttackEcho,
        },
      });
      return;
    }

    this.updateCombatant(actorId, (current) => ({
      ...current,
      activeStatuses: getStatuses(current).map((row) => (
        row.id === RuntimeStatusId.AttackEcho ? { ...row, stacks: nextStacks } : row
      )),
    }));
    this.setStatusEffectsFromRuntime(actorId);
  }

  private resolvePlayerActorIdForTargeting(): string {
    if (this.playerActorId) return this.playerActorId;
    for (const [id, combatant] of Object.entries(this.state.combatants)) {
      if (getCombatRole(combatant) === 'PLAYER') return id;
    }
    return Object.keys(this.state.combatants)[0] ?? '';
  }

  private executeAcceptedAction(request: ResolvedCombatAction): CombatEvent[] {
    const events: CombatEvent[] = [{ type: CombatEventType.ACTION_ACCEPTED, payload: request }];
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: request.battleId,
      line: request.skillId
        ? `Actor ${request.actorId} used ${request.skillId}`
        : request.consumableId
          ? `Actor ${request.actorId} used consumable ${request.consumableId}`
          : `Actor ${request.actorId} passed`,
      ts: Date.now(),
    });

    const actor = this.state.combatants[request.actorId];
    if (!actor) {
      return [{ type: CombatEventType.ACTION_REJECTED, payload: { ...request, reason: 'INVALID_ACTOR' } }];
    }

    this.applyPotionReactive(request, events);

    const selectedSkill = request.skillId === null
      ? null
      : actor.skills.find((skill) => skill.id === request.skillId) ?? null;

    const echoActiveAtTurnStart = selectedSkill && request.skillId
      ? getStatuses(actor).some(
        (row) => row.id === RuntimeStatusId.AttackEcho && (row.stacks ?? 0) > 0,
      )
      : false;

    if (selectedSkill && request.skillId) {
      this.applyPendingAttackEcho(request.actorId, events, selectedSkill);
      this.consumeSkillResources(request.actorId, request.skillId, selectedSkill);
      const updatedSkill = this.state.combatants[request.actorId]?.skills.find((entry) => entry.id === request.skillId);
      events.push({
        type: CombatEventType.PP_CHANGED,
        payload: {
          battleId: request.battleId,
          actorId: request.actorId,
          skillId: request.skillId,
          ppCurrent: updatedSkill?.ppCurrent ?? 0,
          ppMax: updatedSkill?.ppMax ?? 0,
        },
      });
      events.push({
        type: CombatEventType.COOLDOWN_UPDATED,
        payload: {
          battleId: request.battleId,
          actorId: request.actorId,
          skillId: request.skillId,
          cooldownTurnsRemaining: this.enrichSkill(request.actorId, selectedSkill).cooldownTurnsRemaining ?? 0,
        },
      });
      events.push({
        type: CombatEventType.SKILL_USED,
        payload: {
          battleId: request.battleId,
          turn: this.state.turn,
          actorId: request.actorId,
          skillId: request.skillId,
          ...(this.resolveOpponentId(request.actorId) ? { targetId: this.resolveOpponentId(request.actorId)! } : {}),
        },
      });
      const moveName = resolveMoveCombatMeta(request.skillId)?.name ?? selectedSkill.name;
      events.push({
        type: CombatEventType.COMBAT_LOG,
        battleId: request.battleId,
        line: `${actor.name} usou ${moveName}`,
        ts: Date.now(),
      });
    }

    if (!selectedSkill || request.skillId === null) {
      return events;
    }

    const moveMeta = resolveMoveCombatMeta(selectedSkill.id);
    const targetId = resolveSkillTargetId({
      actorId: request.actorId,
      ...(request.targetId !== undefined ? { requestedTargetId: request.targetId } : {}),
      moveTarget: moveMeta?.moveTarget ?? inferMoveTargetFromEffectKind(selectedSkill.effectKind),
      combatants: this.state.combatants,
      playerActorId: this.resolvePlayerActorIdForTargeting(),
    });
    if (!targetId) return events;
    const target = this.state.combatants[targetId];
    if (!target) return events;
    const allEnemies = Object.values(this.state.combatants).filter((entry) => entry.id !== request.actorId && getCombatRole(entry) === 'ENEMY');

    this.applySkillEffects({
      request,
      actor,
      selectedSkill,
      targetId,
      target,
      allEnemies,
      events,
      echoActiveAtTurnStart,
      powerMultiplier: 1,
      allowCopyRecursion: true,
    });

    this.updateCombatant(request.actorId, (current) => ({ ...current, lastSkillUsedId: selectedSkill.id }));
    return events;
  }

  private applySkillEffects(ctx: {
    readonly request: ResolvedCombatAction;
    readonly actor: Combatant;
    readonly selectedSkill: SkillData;
    readonly targetId: string;
    readonly target: Combatant;
    readonly allEnemies: readonly Combatant[];
    readonly events: CombatEvent[];
    readonly echoActiveAtTurnStart: boolean;
    readonly powerMultiplier: number;
    readonly allowCopyRecursion: boolean;
  }): void {
    const {
      request,
      actor,
      selectedSkill,
      targetId,
      target,
      allEnemies,
      events,
      echoActiveAtTurnStart,
      powerMultiplier,
      allowCopyRecursion,
    } = ctx;

    const kind = selectedSkill.effectKind ?? MoveEffectKind.PureDamage;
    const params = selectedSkill.effectParams ?? {};
    const power = selectedSkill.basePower ?? selectedSkill.damage ?? 0;
    const turn = this.state.turn;
    const actorModifier =
      resolveModifierPercent(actor, RuntimeModifierKind.Attack, turn)
      - resolveModifierPercent(actor, RuntimeModifierKind.BuffWeaken, turn);
    const scaledPower = Math.max(0, Math.floor(power * (1 + actorModifier / 100) * powerMultiplier));
    const dmgOpts = this.damageOptionsFromRequest(request);

    switch (kind) {
      case MoveEffectKind.PureDamage:
      case MoveEffectKind.PpDrain:
      case MoveEffectKind.RandomDamage:
      case MoveEffectKind.AttackStack:
      case MoveEffectKind.PlaceTrap:
      case MoveEffectKind.DamageMirror:
      case MoveEffectKind.OutOfTurn:
        this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        break;
      case MoveEffectKind.AttackEcho: {
        if (echoActiveAtTurnStart) {
          events.push({
            type: CombatEventType.COMBAT_LOG,
            battleId: this.state.battleId,
            line: `${actor.name} mantém o impulso — eco anterior não se renova.`,
            ts: Date.now(),
          });
          break;
        }
        const echoBonusPct = params.echoBonusPercent
          ?? (params.echoDamagePercent !== undefined && params.echoDamagePercent > 100
            ? params.echoDamagePercent - 100
            : 15);
        const echoTurns = Math.max(1, Math.floor(params.echoTurns ?? 2));
        const critBonus = Math.max(0, Math.floor(params.critBonusPercent ?? 0));

        if (scaledPower > 0) {
          const dealt = this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
          const echoDamage = Math.max(1, Math.floor(dealt * (1 + echoBonusPct / 100)));
          this.updateCombatant(request.actorId, (current) => ({
            ...current,
            activeStatuses: [
              ...getStatuses(current).filter((row) => row.id !== RuntimeStatusId.AttackEcho),
              this.statusAtTurn(
                RuntimeStatusId.AttackEcho,
                'Eco de Ataque',
                99,
                {
                  sourceActorId: request.actorId,
                  sourceSkillId: selectedSkill.id,
                  stacks: echoTurns,
                  metadata: { echoDamage, echoBonusPercent: echoBonusPct },
                },
              ),
            ],
          }));
          this.setStatusEffectsFromRuntime(request.actorId);
          this.pushStatusEvent(events, request.actorId, RuntimeStatusId.AttackEcho, 'applied', echoDamage);
          events.push({
            type: CombatEventType.STATUS_APPLIED,
            payload: {
              battleId: this.state.battleId,
              targetId: request.actorId,
              statusId: RuntimeStatusId.AttackEcho,
              statusName: 'Eco de Ataque',
              turnsRemaining: echoTurns,
              stacks: echoTurns,
              appliedAtTurn: this.state.turn,
            },
          });
          events.push({
            type: CombatEventType.COMBAT_LOG,
            battleId: this.state.battleId,
            line: `${actor.name} prepara eco de ataque (${echoTurns} turno(s), ${echoDamage} por eco).`,
            ts: Date.now(),
          });
          break;
        }

        this.updateCombatant(request.actorId, (current) => ({
          ...current,
          activeStatuses: [
            ...getStatuses(current).filter((row) => row.id !== RuntimeStatusId.AttackEcho),
            this.statusAtTurn(
              RuntimeStatusId.AttackEcho,
              'Eco de Ataque',
              99,
              {
                sourceActorId: request.actorId,
                sourceSkillId: selectedSkill.id,
                stacks: echoTurns,
                metadata: { echoBonusPercent: echoBonusPct, echoFromPendingMove: 1 },
              },
            ),
          ],
        }));
        this.setStatusEffectsFromRuntime(request.actorId);
        if (critBonus > 0) {
          this.applyCritModifier(request.actorId, critBonus, echoTurns);
        }
        this.pushStatusEvent(events, request.actorId, RuntimeStatusId.AttackEcho, 'applied');
        events.push({
          type: CombatEventType.STATUS_APPLIED,
          payload: {
            battleId: this.state.battleId,
            targetId: request.actorId,
            statusId: RuntimeStatusId.AttackEcho,
            statusName: 'Eco de Ataque',
            turnsRemaining: echoTurns,
            stacks: echoTurns,
            appliedAtTurn: this.state.turn,
          },
        });
        events.push({
          type: CombatEventType.COMBAT_LOG,
          battleId: this.state.battleId,
          line: `${actor.name} prepara impulso (${echoTurns} eco(s) +${echoBonusPct}%${critBonus > 0 ? `, +${critBonus}% crítico` : ''}).`,
          ts: Date.now(),
        });
        break;
      }
      case MoveEffectKind.StackingDamage: {
        const stackStatusId = `STACK_${selectedSkill.id}`;
        const existing = getStatuses(actor).find((row) => row.id === stackStatusId);
        const stackCap = Math.max(1, Math.floor(params.stackCap ?? 3));
        const nextStacks = Math.min(stackCap, (existing?.stacks ?? 0) + 1);
        const mult = resolveStackingDamageMultiplier(
          nextStacks,
          params.stackBonusPerUse ?? 0.15,
          stackCap,
        );
        const power = Math.max(1, Math.floor(scaledPower * mult));
        this.addOrRefreshStatus(request.actorId, {
          id: stackStatusId,
          name: 'Impulso',
          turnsRemaining: 99,
          appliedAtTurn: this.state.turn,
          stacks: nextStacks,
          sourceActorId: request.actorId,
          sourceSkillId: selectedSkill.id,
        }, events);
        events.push({
          type: CombatEventType.COMBAT_LOG,
          battleId: this.state.battleId,
          line: `${actor.name} acumula impulso (×${nextStacks}) — golpe ampliado.`,
          ts: Date.now(),
        });
        this.applyDirectDamage(request.actorId, targetId, power, events, dmgOpts);
        break;
      }
      case MoveEffectKind.DebuffScalingDamage: {
        const debuffs = countTargetDebuffsForScaling(target, this.state.turn);
        const mult = resolveDebuffScalingMultiplier(
          debuffs,
          params.debuffBonusPercent ?? 12,
          params.debuffBonusCap ?? 3,
        );
        const power = Math.max(1, Math.floor(scaledPower * mult));
        if (debuffs > 0) {
          events.push({
            type: CombatEventType.COMBAT_LOG,
            battleId: this.state.battleId,
            line: `${actor.name} explora ${debuffs} debuff(s) no alvo (+${Math.round((mult - 1) * 100)}% dano).`,
            ts: Date.now(),
          });
        }
        this.applyDirectDamage(request.actorId, targetId, power, events, dmgOpts);
        break;
      }
      case MoveEffectKind.RetaliationStrike: {
        const charge = getStatuses(actor).find((row) => row.id === RuntimeStatusId.RetaliationCharge);
        const damageTaken = charge?.metadata?.damageAccumulated ?? 0;
        const step = params.retaliationDamageStep ?? 10;
        const capPercent = params.retaliationBonusCapPercent ?? 30;
        const bonusPercent = resolveRetaliationBonusPercent(damageTaken, step, capPercent);
        const mult = resolveRetaliationMultiplier(damageTaken, step, capPercent);
        const power = Math.max(1, Math.floor(scaledPower * mult));
        if (bonusPercent > 0) {
          events.push({
            type: CombatEventType.COMBAT_LOG,
            battleId: this.state.battleId,
            line: `${actor.name} desfere retribuição (+${bonusPercent}% ATK por ${damageTaken} de dano recebido).`,
            ts: Date.now(),
          });
        }
        this.applyDirectDamage(request.actorId, targetId, power, events, dmgOpts);
        this.clearRetaliationCharge(request.actorId, events);
        break;
      }
      case MoveEffectKind.ApplyBurn:
        this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        this.addOrRefreshStatus(targetId, this.statusAtTurn(
          RuntimeStatusId.Burn,
          'Burn',
          Math.max(1, Math.floor(params.burnTurns ?? 3)),
          {
            sourceActorId: request.actorId,
            sourceSkillId: selectedSkill.id,
            metadata: { burnDamagePercent: params.burnDamagePercent ?? 5 },
          },
        ), events);
        break;
      case MoveEffectKind.AoeDamage:
        for (const enemy of allEnemies) {
          this.applyDirectDamage(request.actorId, enemy.id, Math.max(1, Math.floor(scaledPower * (params.aoeDamageMultiplier ?? 1))), events, dmgOpts);
        }
        this.applyAttackModifier(request.actorId, params.nextTurnAttackBonusPercent ?? 12, Math.max(1, Math.floor(params.nextTurnAttackBonusTurns ?? 2)));
        break;
      case MoveEffectKind.HighRiskBurst: {
        const dealt = this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        const selfDamage = Math.max(1, Math.floor(dealt * ((params.selfDamagePercent ?? 15) / 100)));
        this.applyDirectDamage(targetId, request.actorId, selfDamage, events, { ignoreBarrierPercent: 100 });
        break;
      }
      case MoveEffectKind.ApplyParalyze:
        this.addOrRefreshStatus(targetId, this.statusAtTurn(
          RuntimeStatusId.Paralyze,
          'Paralisia',
          Math.max(1, Math.floor(params.paralyzeTurns ?? 1)),
          {
            sourceActorId: request.actorId,
            sourceSkillId: selectedSkill.id,
            metadata: { skipTurnChance: params.paralyzeSkipTurnChance ?? 60 },
          },
        ), events);
        this.applyWeakenModifier(targetId, params.incomingBuffWeakenPercent ?? 20, Math.max(1, Math.floor(params.incomingBuffWeakenTurns ?? 3)));
        break;
      case MoveEffectKind.DelayedDetonation:
        this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        this.addOrRefreshStatus(targetId, this.statusAtTurn(
          RuntimeStatusId.DelayedDetonation,
          'Detonação',
          Math.max(1, Math.floor(params.delayedTurns ?? 2)),
          {
            sourceActorId: request.actorId,
            sourceSkillId: selectedSkill.id,
            metadata: { delayedDamageMultiplier: params.delayedDamageMultiplier ?? 3, basePower: scaledPower },
          },
        ), events);
        break;
      case MoveEffectKind.MovesetWeaken:
        if (scaledPower > 0) {
          this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        }
        this.applyWeakenModifier(targetId, params.weakenPercent ?? 15, Math.max(1, Math.floor(params.weakenTurns ?? 3)));
        if ((params.debuffUntilBattleEnd ?? 0) > 0) {
          const battleEndWeaken = Math.max(0, Math.floor(params.battleEndDebuffWeakenPercent ?? params.weakenPercent ?? 15));
          this.addOrRefreshStatus(targetId, this.statusAtTurn(
            RuntimeStatusId.MovesetWeaken,
            'Moveset Weaken',
            999,
            {
              sourceActorId: request.actorId,
              sourceSkillId: selectedSkill.id,
              metadata: { battleEndWeakenPercent: battleEndWeaken },
            },
          ), events);
          if (battleEndWeaken > 0) {
            this.applyWeakenModifier(targetId, battleEndWeaken, 999);
          }
        }
        break;
      case MoveEffectKind.LockEnemyMoves: {
        const toLock = target.skills
          .slice(0, Math.max(1, Math.floor(params.lockMoveCount ?? 2)))
          .map((entry) => entry.id);
        this.updateCombatant(targetId, (current) => ({ ...current, lockedSkillIds: toLock }));
        this.addOrRefreshStatus(targetId, this.statusAtTurn(
          RuntimeStatusId.LockEnemyMoves,
          'Bloqueio',
          Math.max(1, Math.floor(params.lockTurns ?? 1)),
          { sourceActorId: request.actorId, sourceSkillId: selectedSkill.id },
        ), events);
        this.applyWeakenModifier(targetId, params.debuffWeakenPercent ?? 15, Math.max(1, Math.floor(params.debuffTurns ?? 2)));
        break;
      }
      case MoveEffectKind.Heal: {
        let healAmount = resolveHealPower(actor, selectedSkill);
        const bonusChance = params.bonusHealChancePercent ?? 0;
        if (bonusChance > 0 && healAmount > 0) {
          const procSeed = `${this.state.battleId}:${this.state.turn}:${request.actorId}:${selectedSkill.id}:bonus-heal`;
          if (rollPercent(procSeed) < bonusChance) {
            const bonusPct = params.bonusHealPercent ?? 40;
            healAmount = resolveBonusHealAmount(healAmount, bonusPct);
            events.push({
              type: CombatEventType.COMBAT_LOG,
              battleId: this.state.battleId,
              line: `${actor.name} surto quântico — cura ampliada (+${bonusPct}%).`,
              ts: Date.now(),
            });
          }
        }
        this.applyHeal(request.actorId, targetId, healAmount, events, selectedSkill.id);
        if ((params.nextTurnsBaseHealEchoPercent ?? 0) > 0) {
          this.addOrRefreshStatus(targetId, this.statusAtTurn(
            RuntimeStatusId.HealEcho,
            'Eco de Cura',
            Math.max(1, Math.floor(params.nextTurnsBaseHealEchoTurns ?? 2)),
            {
              sourceActorId: request.actorId,
              sourceSkillId: selectedSkill.id,
              metadata: { echoPercent: params.nextTurnsBaseHealEchoPercent ?? 10, baseHeal: healAmount },
            },
          ), events);
        }
        break;
      }
      case MoveEffectKind.SelfShield:
        this.applyShield(request.actorId, buildSelfShield(
          Math.max(1, Math.floor(getMaxHp(actor) * ((params.shieldPercent ?? 20) / 100))),
          Math.max(1, Math.floor(params.shieldTurns ?? 2)),
          this.state.turn,
        ), events);
        break;
      case MoveEffectKind.GroupShield:
        this.applyShield(request.actorId, buildGroupShield(
          Math.max(1, Math.floor(getMaxHp(actor) * ((params.groupShieldPercent ?? 15) / 100))),
          Math.max(1, Math.floor(params.groupShieldTurns ?? 2)),
          this.state.turn,
        ), events);
        break;
      case MoveEffectKind.StatusImmunity:
        this.addOrRefreshStatus(request.actorId, this.statusAtTurn(
          RuntimeStatusId.StatusImmunity,
          'Imunidade',
          Math.max(1, Math.floor(params.statusBlockTurns ?? 2)),
          { sourceActorId: request.actorId, sourceSkillId: selectedSkill.id },
        ), events);
        this.applyIncomingReductionModifier(request.actorId, params.incomingDamageReductionPercent ?? 50, Math.max(1, Math.floor(params.damageReductionTurns ?? 1)));
        break;
      case MoveEffectKind.Thorns:
        this.addOrRefreshStatus(request.actorId, this.statusAtTurn(
          RuntimeStatusId.Thorns,
          'Espinhos',
          Math.max(1, Math.floor(params.thornsTurns ?? 2)),
          {
            sourceActorId: request.actorId,
            sourceSkillId: selectedSkill.id,
            metadata: {
              reflectPercent: params.thornsReflectPercent ?? 50,
              attackBonusPercent: params.thornsAttackBonusPercent ?? 0,
              attackBonusTurns: params.thornsAttackBonusTurns ?? 2,
            },
          },
        ), events);
        break;
      case MoveEffectKind.IgnoreBarrier:
        this.applyDirectDamage(request.actorId, targetId, scaledPower, events, {
          ...dmgOpts,
          ignoreBarrierPercent: params.ignoreBarrierPercent ?? 100,
        });
        break;
      case MoveEffectKind.InvertDebuff: {
        const swapCount = Math.max(0, Math.floor(params.swapDebuffCount ?? 0));
        for (let i = 0; i < swapCount; i += 1) {
          this.transferOneDebuffToTarget(request.actorId, targetId, selectedSkill.id, events);
        }
        this.applyWeakenModifier(
          targetId,
          params.enemyAttackDamageReductionPercent ?? 30,
          Math.max(1, Math.floor(params.enemyAttackWeakenTurns ?? 3)),
        );
        break;
      }
      case MoveEffectKind.CopyLastMove: {
        const copied = target.lastSkillUsedId
          ? target.skills.find((entry) => entry.id === target.lastSkillUsedId)
          : null;
        if (copied && allowCopyRecursion && copied.id !== selectedSkill.id) {
          events.push({
            type: CombatEventType.COMBAT_LOG,
            battleId: this.state.battleId,
            line: `${actor.name} mimetiza ${copied.name} (${Math.round((params.copyPowerMultiplier ?? 0.9) * 100)}% poder).`,
            ts: Date.now(),
          });
          this.applySkillEffects({
            request,
            actor,
            selectedSkill: copied,
            targetId,
            target,
            allEnemies,
            events,
            echoActiveAtTurnStart: false,
            powerMultiplier: params.copyPowerMultiplier ?? 0.9,
            allowCopyRecursion: false,
          });
        }
        this.applyWeakenModifier(targetId, params.copiedMoveWeakenPercent ?? 15, Math.max(1, Math.floor(params.debuffTurns ?? 2)));
        break;
      }
      case MoveEffectKind.Confuse:
        if (scaledPower > 0) {
          this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        }
        this.addOrRefreshStatus(targetId, this.statusAtTurn(
          RuntimeStatusId.Confuse,
          'Confusão',
          Math.max(1, Math.floor(params.residualTurns ?? 2)),
          {
            sourceActorId: request.actorId,
            sourceSkillId: selectedSkill.id,
            metadata: {
              failChance: params.confuseFailChance ?? 45,
              residualDamagePercent: params.residualDamageFromEnemyAttackPercent ?? 10,
            },
          },
        ), events);
        break;
      default:
        this.applyDirectDamage(request.actorId, targetId, scaledPower, events, dmgOpts);
        break;
    }
  }

  private transferOneDebuffToTarget(
    sourceId: string,
    targetId: string,
    sourceSkillId: string,
    events: CombatEvent[],
  ): void {
    const source = this.state.combatants[sourceId];
    if (!source) return;

    const transferable = findFirstTransferableDebuff(source, this.state.turn);
    if (!transferable) return;

    if (transferable.kind === 'status') {
      const { status } = transferable;
      this.updateCombatant(sourceId, (current) => ({
        ...current,
        activeStatuses: getStatuses(current).filter((row) => row.id !== status.id),
      }));
      this.setStatusEffectsFromRuntime(sourceId);
      this.pushStatusEvent(events, sourceId, status.id, 'expired');
      events.push({
        type: CombatEventType.STATUS_EXPIRED,
        payload: { battleId: this.state.battleId, targetId: sourceId, statusId: status.id },
      });

      this.addOrRefreshStatus(
        targetId,
        cloneTransferredStatus(status, this.state.turn, sourceId, sourceSkillId),
        events,
      );
      events.push({
        type: CombatEventType.COMBAT_LOG,
        battleId: this.state.battleId,
        line: `${source.name} inverte ${status.name} para ${this.state.combatants[targetId]?.name ?? targetId}.`,
        ts: Date.now(),
      });
      return;
    }

    const { modifier } = transferable;
    this.updateCombatant(sourceId, (current) => ({
      ...current,
      temporaryModifiers: getModifiers(current).filter(
        (row) => !(
          row.kind === modifier.kind
          && row.percent === modifier.percent
          && row.turnsRemaining === modifier.turnsRemaining
          && row.appliedAtTurn === modifier.appliedAtTurn
        ),
      ),
    }));
    this.applyWeakenModifier(targetId, modifier.percent, modifier.turnsRemaining);
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: this.state.battleId,
      line: `${source.name} inverte enfraquecimento (−${modifier.percent}%) para ${this.state.combatants[targetId]?.name ?? targetId}.`,
      ts: Date.now(),
    });
  }

  private rankPetQueueActions(requests: readonly ResolvedCombatAction[]): RankedAction[] {
    if (!this.playerActorId) return this.rankActionsInternal(requests);

    const ordered = orderPetTurnQueue(requests, this.state.combatants, this.playerActorId);
    const ranked: RankedAction[] = [];

    for (const request of ordered) {
      const actor = this.state.combatants[request.actorId];
      if (!actor) continue;
      const skill = request.skillId === null
        ? null
        : actor.skills.find((entry) => entry.id === request.skillId) ?? null;
      ranked.push({
        request,
        actorId: request.actorId,
        skillPriority: (request.priorityHint ?? skill?.priority ?? 1) as 1 | 2 | 3,
        movesetPriorityScore: 0,
        speedBonusTotal: 0,
        effectiveSpeedRaw: 0,
        speedAttributeContribution: 0,
        initiativeScore: 0,
        tieBreakerSeed: ranked.length,
      });
    }

    return ranked;
  }

  private rankActionsInternal(requests: readonly ResolvedCombatAction[]): RankedAction[] {
    const ranked: RankedAction[] = [];
    for (const request of requests) {
      if (request.battleId !== this.state.battleId || request.turn !== this.state.turn) continue;
      const actor = this.state.combatants[request.actorId];
      if (!actor) continue;
      const skill = request.skillId === null
        ? null
        : actor.skills.find((entry) => entry.id === request.skillId) ?? null;
      const skillPriority = (request.priorityHint ?? skill?.priority ?? 1) as 1 | 2 | 3;
      const movesetScore = this.balance.initiative.movesetPriorityScoreBySkillPriority[String(skillPriority) as '1' | '2' | '3'];
      const speedBonusTotal = this.computeSpeedBonusTotal(request.actorId, actor);
      const effectiveSpeedRaw = this.computeEffectiveSpeedRaw(request.actorId, actor);
      const breakdown = computeInitiativeBreakdown(skillPriority, effectiveSpeedRaw, {
        movesetPriorityScoreBySkillPriority: this.balance.initiative.movesetPriorityScoreBySkillPriority,
        speedAttributePercent: this.balance.initiative.speedAttributePercent,
        movesetTierScale: this.balance.initiative.movesetTierScale,
      });
      ranked.push({
        request,
        actorId: request.actorId,
        skillPriority,
        movesetPriorityScore: movesetScore,
        speedBonusTotal,
        effectiveSpeedRaw,
        speedAttributeContribution: breakdown.speedAttributeContribution,
        initiativeScore: breakdown.initiativeScore,
        tieBreakerSeed: computeSeed(`${this.state.battleId}:${this.state.turn}:${request.actorId}`),
      });
    }
    ranked.sort(compareRankedActions);
    return ranked;
  }

  private isBattleClosed(): boolean {
    return this.state.phase === 'ENDED' || this.state.battleWinnerId != null;
  }

  private finishTurn(lastActorId?: string): void {
    const playerActorId = this.playerActorId ?? undefined;
    const battleEnded = resolveHasBattleEnded(this.state.combatants, playerActorId, this.state.battleType);
    const winnerId = battleEnded
      ? (this.state.battleWinnerId ?? resolveBattleWinner(this.state.combatants, playerActorId, this.state.battleType))
      : null;
    const usesPetAlliance = Boolean(
      this.playerActorId && battleUsesPetTurnQueue(this.state.combatants),
    );
    const actorOrder = getActorOrder(this.state.combatants);
    const nextActorId = usesPetAlliance && this.playerActorId && !battleEnded
      ? this.playerActorId
      : pickNextActorId(lastActorId ?? this.state.activeActorId, actorOrder);
    this.state = {
      ...this.state,
      turn: this.state.turn + 1,
      phase: battleEnded ? 'ENDED' : 'CHOOSING',
      activeActorId: battleEnded ? null : nextActorId,
      ...(winnerId !== null ? { battleWinnerId: winnerId } : {}),
    };
    if (!battleEnded && nextActorId) {
      this.applyMarcoTurnStart(nextActorId);
    }
  }

  private toTurnUpdate(): TurnUpdate {
    return {
      battleId: this.state.battleId,
      turn: this.state.turn,
      phase: this.state.phase === 'IDLE' ? 'CHOOSING' : this.state.phase,
      activeActorId: this.state.activeActorId,
      combatants: this.state.combatants,
    };
  }
}
