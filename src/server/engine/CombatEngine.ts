import { CombatEventType } from '../../shared/events.js';
import type { ActionRequest, CombatEvent, TurnUpdate } from '../../shared/events.js';
import type { CombatClassId, CombatState, Combatant } from '../../shared/types.js';
import { loadCombatBalanceConfig, type CombatBalanceV12 } from './combatBalanceConfig.js';

type BalanceConfig = CombatBalanceV12;
type TurnOrderReason = 'INITIATIVE_SCORE' | 'PRIORITY' | 'EFFECTIVE_SPEED' | 'SEED';

type RankedAction = {
  readonly request: ActionRequest;
  readonly actorId: string;
  readonly skillPriority: 1 | 2 | 3;
  readonly movesetPriorityScore: number;
  readonly speedBonusTotal: number;
  readonly effectiveSpeedRaw: number;
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

function compareRankedActions(a: RankedAction, b: RankedAction): number {
  if (a.initiativeScore !== b.initiativeScore) return b.initiativeScore - a.initiativeScore;
  if (a.effectiveSpeedRaw !== b.effectiveSpeedRaw) return b.effectiveSpeedRaw - a.effectiveSpeedRaw;
  return a.tieBreakerSeed - b.tieBreakerSeed;
}

function resolveOrderReason(ranked: readonly RankedAction[]): TurnOrderReason {
  if (ranked.length <= 1) return 'SEED';
  const first = ranked[0];
  const second = ranked[1];
  if (!first || !second) return 'SEED';
  if (first.initiativeScore !== second.initiativeScore) {
    if (first.movesetPriorityScore !== second.movesetPriorityScore) return 'PRIORITY';
    if (first.speedBonusTotal !== second.speedBonusTotal) return 'INITIATIVE_SCORE';
    return 'INITIATIVE_SCORE';
  }
  if (first.effectiveSpeedRaw !== second.effectiveSpeedRaw) return 'EFFECTIVE_SPEED';
  return 'SEED';
}

export class CombatEngine {
  private readonly balance: BalanceConfig;
  private state: CombatState;
  private readonly potionLastUsedTurn = new Map<string, number>();
  private readonly potionCooldownUntilTurn = new Map<string, number>();
  private readonly potionExhaustionUntilTurn = new Map<string, number>();
  private readonly potionSpeedBuffUntilTurn = new Map<string, { untilTurn: number; amount: number }>();
  private readonly potionUsesByTurn = new Map<string, number>();
  private readonly healingHistory = new Map<string, number[]>();

  constructor(initial: CombatState, config: BalanceConfig = loadCombatBalanceConfig()) {
    this.balance = config;
    this.state = { ...initial, combatants: cloneCombatants(initial.combatants) };
  }

  public getConfigVersion(): string {
    return this.balance.version;
  }

  public getState(): CombatState {
    return { ...this.state, combatants: cloneCombatants(this.state.combatants) };
  }

  public startChoosing(activeActorId: string): CombatEvent[] {
    this.state = { ...this.state, phase: 'CHOOSING', activeActorId };
    return [
      {
        type: CombatEventType.BATTLE_START,
        payload: { battleId: this.state.battleId, combatants: this.state.combatants },
      },
      { type: CombatEventType.TURN_START, payload: this.toTurnUpdate() },
    ];
  }

  public computeEffectiveSpeed(actorId: string): number {
    const actor = this.state.combatants[actorId];
    if (!actor) return 0;
    return this.computeEffectiveSpeedRaw(actorId, actor);
  }

  public resolveTurnOrder(requests: readonly ActionRequest[]): readonly ActionRequest[] {
    return this.resolveTurnOrderV12(requests);
  }

  /** Ordem de turno V1.2 (score_based). */
  public resolveTurnOrderV12(requests: readonly ActionRequest[]): readonly ActionRequest[] {
    return this.rankActionsInternal(requests).map((r) => r.request);
  }

  public applyAction(request: ActionRequest): CombatEvent[] {
    const invalidReason = this.validateAction(request);
    if (invalidReason) return [{ type: CombatEventType.ACTION_REJECTED, payload: { ...request, reason: invalidReason } }];

    this.state = { ...this.state, phase: 'RESOLVING' };
    const events = this.executeAcceptedAction(request);
    this.finishTurn(request.actorId);
    events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
    return events;
  }

  public resolveTurn(requests: readonly ActionRequest[]): CombatEvent[] {
    if (this.state.phase !== 'CHOOSING') {
      return requests.map((request) => ({
        type: CombatEventType.ACTION_REJECTED,
        payload: { ...request, reason: 'NOT_IN_CHOOSING_PHASE' },
      }));
    }

    this.state = { ...this.state, phase: 'RESOLVING' };
    const ranked = this.rankActionsInternal(requests);
    const events: CombatEvent[] = [{
      type: CombatEventType.TURN_ORDER_RESOLVED,
      payload: {
        battleId: this.state.battleId,
        turn: this.state.turn,
        order: ranked.map((r) => r.actorId),
        reason: resolveOrderReason(ranked),
        debug: ranked.map((r) => ({
          actorId: r.actorId,
          priority: r.skillPriority,
          movesetPriorityScore: r.movesetPriorityScore,
          speedBonusTotal: r.speedBonusTotal,
          initiativeScore: r.initiativeScore,
          effectiveSpeed: r.effectiveSpeedRaw,
          tieBreakerSeed: r.tieBreakerSeed,
        })),
      },
    }];

    for (const rankedAction of ranked) {
      const invalidReason = this.validateAction(rankedAction.request, true);
      if (invalidReason) {
        events.push({
          type: CombatEventType.ACTION_REJECTED,
          payload: { ...rankedAction.request, reason: invalidReason },
        });
        continue;
      }
      events.push(...this.executeAcceptedAction(rankedAction.request));
      if (this.hasBattleEnded()) break;
    }

    this.finishTurn();
    events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
    return events;
  }

  private validateAction(request: ActionRequest, ignoreTurnOwner = false): string | null {
    if (request.battleId !== this.state.battleId) return 'INVALID_BATTLE';
    if (!ignoreTurnOwner && (this.state.phase !== 'CHOOSING' || this.state.activeActorId !== request.actorId)) {
      return 'NOT_YOUR_TURN';
    }
    if (request.turn !== this.state.turn) return 'STALE_TURN';
    const actor = this.state.combatants[request.actorId];
    if (!actor) return 'INVALID_ACTOR';
    if (request.skillId !== null && !actor.skills.some((skill) => skill.id === request.skillId)) return 'INVALID_SKILL';
    if (request.consumableId && !this.canUseConsumable(request.actorId)) return 'POTION_ON_COOLDOWN';
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
    return this.state.turn <= expiresAtTurn ? this.balance.consumables.potionReactive.exhaustionDebuff.speedFlat : 0;
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

  public applyPotionReactiveAndExhaustion(request: ActionRequest, events: CombatEvent[]): void {
    this.applyPotionReactive(request, events);
  }

  private applyPotionReactive(request: ActionRequest, events: CombatEvent[]): void {
    if (!request.consumableId || !this.balance.consumables.potionReactive.enabled) return;
    if (!this.canUseConsumable(request.actorId)) return;

    this.trackPotionUseForTurn(request.actorId);
    this.potionLastUsedTurn.set(request.actorId, this.state.turn);
    this.potionCooldownUntilTurn.set(
      request.actorId,
      this.state.turn + this.balance.consumables.potionReactive.globalCooldownTurns,
    );

    const tonic = this.balance.consumables.examples[request.consumableId as keyof typeof this.balance.consumables.examples];
    if (tonic) {
      this.potionSpeedBuffUntilTurn.set(request.actorId, {
        amount: tonic.value,
        untilTurn: this.state.turn + tonic.durationTurns,
      });
    }

    this.applyPotionExhaustion(request.actorId, events);
    events.push({
      type: CombatEventType.CONSUMABLE_USED,
      payload: {
        battleId: this.state.battleId,
        actorId: request.actorId,
        consumableId: request.consumableId,
      },
    });
    this.applyHealingDecayInternal(request.actorId, request.consumableHeal ?? 0, events);
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

  private applyHealingDecayInternal(actorId: string, baseHeal: number, events: CombatEvent[]): void {
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
    const exhaustionTurn = this.potionExhaustionUntilTurn.get(actorId);
    const exhaustionMult = exhaustionTurn && this.state.turn <= exhaustionTurn
      ? this.balance.consumables.potionReactive.exhaustionDebuff.healReceivedMultiplier
      : 1;
    const healCap = Math.floor(getMaxHp(actor) * this.balance.hpElasticity.healingReceived.instantHealCapByMaxHpRatio);
    const healed = Math.min(
      healCap,
      Math.max(0, Math.floor(baseHeal * decayMultiplier * lowHpMultiplier * exhaustionMult)),
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

  private executeAcceptedAction(request: ActionRequest): CombatEvent[] {
    const events: CombatEvent[] = [{ type: CombatEventType.ACTION_ACCEPTED, payload: request }];
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: request.battleId,
      line: request.skillId ? `Actor ${request.actorId} used ${request.skillId}` : `Actor ${request.actorId} passed`,
      ts: Date.now(),
    });

    const actor = this.state.combatants[request.actorId];
    if (!actor) {
      return [{ type: CombatEventType.ACTION_REJECTED, payload: { ...request, reason: 'INVALID_ACTOR' } }];
    }

    this.applyPotionReactive(request, events);

    const targetId = pickNextActorId(request.actorId, getActorOrder(this.state.combatants));
    if (!targetId) return events;
    const target = this.state.combatants[targetId];
    if (!target) return events;

    const selectedSkill = request.skillId === null
      ? null
      : actor.skills.find((skill) => skill.id === request.skillId) ?? null;
    const baseDamage = selectedSkill?.damage ?? 0;
    if (baseDamage <= 0) return events;

    const elasticityMultiplier = this.applyElasticity(targetId, baseDamage, events);
    const elasticDamage = Math.floor(baseDamage * elasticityMultiplier);
    const scaledDamage = this.applySuddenDeathScalingInternal(elasticDamage, events);
    const finalDamage = Math.max(this.balance.hpElasticity.guards.minDamagePerHit, scaledDamage);
    const hpAfter = Math.max(0, getHp(target) - finalDamage);
    this.state = {
      ...this.state,
      combatants: { ...this.state.combatants, [targetId]: withHp(target, hpAfter) },
    };
    events.push({
      type: CombatEventType.DAMAGE_DEALT,
      payload: {
        battleId: this.state.battleId,
        sourceId: request.actorId,
        targetId,
        amount: finalDamage,
        hpAfter,
      },
    });
    events.push({
      type: CombatEventType.COMBAT_LOG,
      battleId: request.battleId,
      line: `Damage pipeline ${request.actorId}->${targetId}: base=${baseDamage} final=${finalDamage} hpAfter=${hpAfter}`,
      ts: Date.now(),
    });
    return events;
  }

  private rankActionsInternal(requests: readonly ActionRequest[]): RankedAction[] {
    const ranked: RankedAction[] = [];
    for (const request of requests) {
      if (request.battleId !== this.state.battleId || request.turn !== this.state.turn) continue;
      const actor = this.state.combatants[request.actorId];
      if (!actor) continue;
      const skill = request.skillId === null
        ? null
        : actor.skills.find((entry) => entry.id === request.skillId) ?? null;
      const skillPriority = request.priorityHint ?? skill?.priority ?? 1;
      const movesetScore = this.balance.initiative.movesetPriorityScoreBySkillPriority[String(skillPriority) as '1' | '2' | '3'];
      const speedBonusTotal = this.computeSpeedBonusTotal(request.actorId, actor);
      const initiativeScore = (movesetScore * this.balance.initiative.weights.movesetPriorityWeight)
        + (speedBonusTotal * this.balance.initiative.weights.speedBonusWeight);
      ranked.push({
        request,
        actorId: request.actorId,
        skillPriority,
        movesetPriorityScore: movesetScore,
        speedBonusTotal,
        effectiveSpeedRaw: this.computeEffectiveSpeedRaw(request.actorId, actor),
        initiativeScore,
        tieBreakerSeed: computeSeed(`${this.state.battleId}:${this.state.turn}:${request.actorId}`),
      });
    }
    ranked.sort(compareRankedActions);
    return ranked;
  }

  private hasBattleEnded(): boolean {
    return Object.values(this.state.combatants).some((combatant) => getHp(combatant) <= 0);
  }

  private finishTurn(lastActorId?: string): void {
    const actorOrder = getActorOrder(this.state.combatants);
    const nextActorId = pickNextActorId(lastActorId ?? this.state.activeActorId, actorOrder);
    const battleEnded = this.hasBattleEnded();
    this.state = {
      ...this.state,
      turn: this.state.turn + 1,
      phase: battleEnded ? 'ENDED' : 'CHOOSING',
      activeActorId: battleEnded ? null : nextActorId,
    };
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
