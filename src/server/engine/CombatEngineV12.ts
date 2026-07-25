// @ts-nocheck
import { CombatEventType } from '../../shared/events.js';
import { loadCombatBalanceConfig } from './combatBalanceConfig.js';
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function getHp(combatant) {
    return combatant.hpCurrent ?? combatant.hp;
}
function getMaxHp(combatant) {
    return combatant.hpMax ?? combatant.maxHp;
}
function withHp(combatant, hp) {
    const maxHp = getMaxHp(combatant);
    return { ...combatant, hp, hpCurrent: hp, maxHp, hpMax: maxHp };
}
function cloneCombatants(input) {
    const out = {};
    for (const [id, c] of Object.entries(input)) {
        const clonedBase = {
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
function getActorOrder(combatants) {
    return Object.keys(combatants);
}
function pickNextActorId(currentActorId, order) {
    if (order.length === 0)
        return null;
    if (currentActorId === null)
        return order[0] ?? null;
    const currentIdx = order.indexOf(currentActorId);
    if (currentIdx === -1)
        return order[0] ?? null;
    return order[(currentIdx + 1) % order.length] ?? null;
}
function computeSeed(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function compareRankedActions(a, b) {
    if (a.initiativeScore !== b.initiativeScore)
        return b.initiativeScore - a.initiativeScore;
    if (a.effectiveSpeedRaw !== b.effectiveSpeedRaw)
        return b.effectiveSpeedRaw - a.effectiveSpeedRaw;
    return a.tieBreakerSeed - b.tieBreakerSeed;
}
function resolveOrderReason(ranked) {
    if (ranked.length <= 1)
        return 'SEED';
    const first = ranked[0];
    const second = ranked[1];
    if (!first || !second)
        return 'SEED';
    if (first.initiativeScore !== second.initiativeScore) {
        if (first.movesetPriorityScore !== second.movesetPriorityScore)
            return 'PRIORITY';
        if (first.speedBonusTotal !== second.speedBonusTotal)
            return 'INITIATIVE_SCORE';
        return 'INITIATIVE_SCORE';
    }
    if (first.effectiveSpeedRaw !== second.effectiveSpeedRaw)
        return 'EFFECTIVE_SPEED';
    return 'SEED';
}
export class CombatEngineV12 {
    balance;
    state;
    potionLastUsedTurn = new Map();
    potionCooldownUntilTurn = new Map();
    potionExhaustionUntilTurn = new Map();
    potionSpeedBuffUntilTurn = new Map();
    potionUsesByTurn = new Map();
    healingHistory = new Map();
    constructor(initial, config = loadCombatBalanceConfig()) {
        this.balance = config;
        this.state = { ...initial, combatants: cloneCombatants(initial.combatants) };
    }
    getConfigVersion() {
        return this.balance.version;
    }
    getState() {
        return { ...this.state, combatants: cloneCombatants(this.state.combatants) };
    }
    startChoosing(activeActorId) {
        this.state = { ...this.state, phase: 'CHOOSING', activeActorId };
        return [
            {
                type: CombatEventType.BATTLE_START,
                payload: { battleId: this.state.battleId, combatants: this.state.combatants },
            },
            { type: CombatEventType.TURN_START, payload: this.toTurnUpdate() },
        ];
    }
    computeEffectiveSpeed(actorId) {
        const actor = this.state.combatants[actorId];
        if (!actor)
            return 0;
        return this.computeEffectiveSpeedRaw(actorId, actor);
    }
    resolveTurnOrder(requests) {
        return this.resolveTurnOrderV12(requests);
    }
    /** Ordem de turno V1.2 (score_based). */
    resolveTurnOrderV12(requests) {
        return this.rankActionsInternal(requests).map((r) => r.request);
    }
    applyAction(request) {
        const invalidReason = this.validateAction(request);
        if (invalidReason)
            return [{ type: CombatEventType.ACTION_REJECTED, payload: { ...request, reason: invalidReason } }];
        this.state = { ...this.state, phase: 'RESOLVING' };
        const events = this.executeAcceptedAction(request);
        this.finishTurn(request.actorId);
        events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
        return events;
    }
    resolveTurn(requests) {
        if (this.state.phase !== 'CHOOSING') {
            return requests.map((request) => ({
                type: CombatEventType.ACTION_REJECTED,
                payload: { ...request, reason: 'NOT_IN_CHOOSING_PHASE' },
            }));
        }
        this.state = { ...this.state, phase: 'RESOLVING' };
        const ranked = this.rankActionsInternal(requests);
        const events = [{
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
            if (this.hasBattleEnded())
                break;
        }
        this.finishTurn();
        events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
        return events;
    }
    validateAction(request, ignoreTurnOwner = false) {
        if (request.battleId !== this.state.battleId)
            return 'INVALID_BATTLE';
        if (!ignoreTurnOwner && (this.state.phase !== 'CHOOSING' || this.state.activeActorId !== request.actorId)) {
            return 'NOT_YOUR_TURN';
        }
        if (request.turn !== this.state.turn)
            return 'STALE_TURN';
        const actor = this.state.combatants[request.actorId];
        if (!actor)
            return 'INVALID_ACTOR';
        if (request.skillId !== null && !actor.skills.some((skill) => skill.id === request.skillId))
            return 'INVALID_SKILL';
        if (request.consumableId && !this.canUseConsumable(request.actorId))
            return 'POTION_ON_COOLDOWN';
        return null;
    }
    resolveClassSpeedBias(classId, explicitBias) {
        if (explicitBias !== undefined)
            return explicitBias;
        if (!classId)
            return 0;
        return this.balance.initiative.classSpeedBias[classId];
    }
    resolveMarcoSpeed(activeMarcos, flowSpeedBase) {
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
    resolvePotionExhaustionPenalty(actorId, fallback) {
        const expiresAtTurn = this.potionExhaustionUntilTurn.get(actorId);
        if (!expiresAtTurn)
            return fallback;
        return this.state.turn <= expiresAtTurn ? this.balance.consumables.potionReactive.exhaustionDebuff.speedFlat : 0;
    }
    resolvePotionSpeedBuff(actorId) {
        const buff = this.potionSpeedBuffUntilTurn.get(actorId);
        if (!buff)
            return 0;
        return this.state.turn <= buff.untilTurn ? buff.amount : 0;
    }
    computeSpeedBonusTotal(actorId, actor) {
        const profile = actor.speedProfile;
        if (!profile)
            return 0;
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
    computeEffectiveSpeedRaw(actorId, actor) {
        const profile = actor.speedProfile;
        if (!profile)
            return 0;
        const classBias = this.resolveClassSpeedBias(actor.classId, profile.classSpeedBias);
        const speedBonusTotal = this.computeSpeedBonusTotal(actorId, actor);
        const raw = profile.flowSpeedBase + classBias + speedBonusTotal;
        const clampCfg = this.balance.initiative.effectiveSpeedRawClamp;
        return clamp(raw, clampCfg.min, clampCfg.max);
    }
    applyHpElasticity(targetId, baseDamage, events) {
        return this.applyElasticity(targetId, baseDamage, events);
    }
    applyElasticity(targetId, baseDamage, events) {
        const target = this.state.combatants[targetId];
        if (!target || baseDamage <= 0)
            return 0;
        const hpRatio = getHp(target) / Math.max(1, getMaxHp(target));
        const band = this.balance.hpElasticity.damageTakenMultiplierByHpRatio.find((entry) => hpRatio >= entry.minHpRatio && hpRatio <= entry.maxHpRatio);
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
    applyPotionReactiveAndExhaustion(request, events) {
        this.applyPotionReactive(request, events);
    }
    applyPotionReactive(request, events) {
        if (!request.consumableId || !this.balance.consumables.potionReactive.enabled)
            return;
        if (!this.canUseConsumable(request.actorId))
            return;
        this.trackPotionUseForTurn(request.actorId);
        this.potionLastUsedTurn.set(request.actorId, this.state.turn);
        this.potionCooldownUntilTurn.set(request.actorId, this.state.turn + this.balance.consumables.potionReactive.globalCooldownTurns);
        const tonic = this.balance.consumables.examples[request.consumableId];
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
    applyPotionExhaustion(actorId, events) {
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
    applyHealingDecay(actorId, baseHeal, events) {
        return this.applyHealingDecayInternal(actorId, baseHeal, events);
    }
    applyHealingDecayInternal(actorId, baseHeal, events) {
        if (baseHeal <= 0)
            return;
        const actor = this.state.combatants[actorId];
        if (!actor)
            return;
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
        const healed = Math.min(healCap, Math.max(0, Math.floor(baseHeal * decayMultiplier * lowHpMultiplier * exhaustionMult)));
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
    applySuddenDeathScaling(baseDamage, events) {
        return this.applySuddenDeathScalingInternal(baseDamage, events);
    }
    applySuddenDeathScalingInternal(baseDamage, events) {
        const sd = this.balance.antiStall.suddenDeath;
        if (this.state.turn < sd.startTurn)
            return baseDamage;
        const bonus = clamp((this.state.turn - (sd.startTurn - 1)) * sd.globalDamageIncreasePerTurn, 0, sd.globalDamageIncreaseCap);
        const scaled = Math.floor(baseDamage * (1 + bonus));
        events.push({
            type: CombatEventType.SUDDEN_DEATH_SCALING_APPLIED,
            payload: { battleId: this.state.battleId, turn: this.state.turn, damageMultiplier: 1 + bonus },
        });
        return scaled;
    }
    canUseConsumable(actorId) {
        const potion = this.balance.consumables.potionReactive;
        const key = `${actorId}:${this.state.turn}`;
        const usedThisTurn = this.potionUsesByTurn.get(key) ?? 0;
        if (usedThisTurn >= potion.maxUsesPerTurn)
            return false;
        const cooldownUntil = this.potionCooldownUntilTurn.get(actorId) ?? 0;
        if (this.state.turn <= cooldownUntil)
            return false;
        const lastTurn = this.potionLastUsedTurn.get(actorId) ?? -9999;
        if (potion.disallowConsecutiveTurns && this.state.turn === lastTurn + 1)
            return false;
        return true;
    }
    trackPotionUseForTurn(actorId) {
        const key = `${actorId}:${this.state.turn}`;
        this.potionUsesByTurn.set(key, (this.potionUsesByTurn.get(key) ?? 0) + 1);
    }
    executeAcceptedAction(request) {
        const events = [{ type: CombatEventType.ACTION_ACCEPTED, payload: request }];
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
        if (!targetId)
            return events;
        const target = this.state.combatants[targetId];
        if (!target)
            return events;
        const selectedSkill = request.skillId === null
            ? null
            : actor.skills.find((skill) => skill.id === request.skillId) ?? null;
        const baseDamage = selectedSkill?.damage ?? 0;
        if (baseDamage <= 0)
            return events;
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
    rankActionsInternal(requests) {
        const ranked = [];
        for (const request of requests) {
            if (request.battleId !== this.state.battleId || request.turn !== this.state.turn)
                continue;
            const actor = this.state.combatants[request.actorId];
            if (!actor)
                continue;
            const skill = request.skillId === null
                ? null
                : actor.skills.find((entry) => entry.id === request.skillId) ?? null;
            const skillPriority = request.priorityHint ?? skill?.priority ?? 1;
            const movesetScore = this.balance.initiative.movesetPriorityScoreBySkillPriority[String(skillPriority)];
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
    hasBattleEnded() {
        return Object.values(this.state.combatants).some((combatant) => getHp(combatant) <= 0);
    }
    finishTurn(lastActorId) {
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
    toTurnUpdate() {
        return {
            battleId: this.state.battleId,
            turn: this.state.turn,
            phase: this.state.phase === 'IDLE' ? 'CHOOSING' : this.state.phase,
            activeActorId: this.state.activeActorId,
            combatants: this.state.combatants,
        };
    }
}
