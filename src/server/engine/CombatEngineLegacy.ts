// @ts-nocheck
import { CombatEventType } from '../../shared/events.js';
function getHp(c) {
    return c.hpCurrent ?? c.hp;
}
function getMaxHp(c) {
    return c.hpMax ?? c.maxHp;
}
function withHp(c, hp) {
    const maxHp = getMaxHp(c);
    return { ...c, hp, hpCurrent: hp, maxHp, hpMax: maxHp };
}
function cloneCombatants(input) {
    const out = {};
    for (const [id, c] of Object.entries(input)) {
        out[id] = { ...c, hp: getHp(c), maxHp: getMaxHp(c), hpCurrent: getHp(c), hpMax: getMaxHp(c), skills: [...c.skills] };
    }
    return out;
}
function pickNextActorId(current, order) {
    if (order.length === 0)
        return null;
    if (current === null)
        return order[0] ?? null;
    const idx = order.indexOf(current);
    return order[(idx + 1) % order.length] ?? null;
}
function legacySpeed(actor) {
    return actor.speedProfile?.flowSpeedBase ?? 0;
}
/**
 * Motor legado (pré-V1.2): prioridade linear, speed base, dano flat.
 * Usado quando combatV12Enabled=false.
 */
export class CombatEngineLegacy {
    state;
    constructor(initial) {
        this.state = { ...initial, combatants: cloneCombatants(initial.combatants) };
    }
    getConfigVersion() {
        return 'legacy';
    }
    getState() {
        return { ...this.state, combatants: cloneCombatants(this.state.combatants) };
    }
    startChoosing(activeActorId) {
        this.state = { ...this.state, phase: 'CHOOSING', activeActorId };
        return [
            { type: CombatEventType.BATTLE_START, payload: { battleId: this.state.battleId, combatants: this.state.combatants } },
            { type: CombatEventType.TURN_START, payload: this.toTurnUpdate() },
        ];
    }
    computeEffectiveSpeed(actorId) {
        const actor = this.state.combatants[actorId];
        return actor ? legacySpeed(actor) : 0;
    }
    resolveTurnOrder(requests) {
        const ranked = requests
            .filter((r) => r.battleId === this.state.battleId && r.turn === this.state.turn)
            .map((r) => {
            const actor = this.state.combatants[r.actorId];
            const skill = r.skillId && actor ? actor.skills.find((s) => s.id === r.skillId) : null;
            const priority = r.priorityHint ?? skill?.priority ?? 1;
            return { request: r, priority, speed: actor ? legacySpeed(actor) : 0 };
        })
            .sort((a, b) => b.priority - a.priority || b.speed - a.speed);
        return ranked.map((r) => r.request);
    }
    applyAction(request) {
        const invalid = this.validateAction(request);
        if (invalid)
            return [{ type: CombatEventType.ACTION_REJECTED, payload: { ...request, reason: invalid } }];
        this.state = { ...this.state, phase: 'RESOLVING' };
        const events = this.executeAction(request);
        this.finishTurn(request.actorId);
        events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
        return events;
    }
    resolveTurn(requests) {
        if (this.state.phase !== 'CHOOSING') {
            return requests.map((r) => ({
                type: CombatEventType.ACTION_REJECTED,
                payload: { ...r, reason: 'NOT_IN_CHOOSING_PHASE' },
            }));
        }
        this.state = { ...this.state, phase: 'RESOLVING' };
        const ordered = this.resolveTurnOrder(requests);
        const events = [];
        for (const req of ordered) {
            const invalid = this.validateAction(req, true);
            if (invalid) {
                events.push({ type: CombatEventType.ACTION_REJECTED, payload: { ...req, reason: invalid } });
                continue;
            }
            events.push(...this.executeAction(req));
            if (this.hasBattleEnded())
                break;
        }
        this.finishTurn();
        events.push({ type: CombatEventType.TURN_START, payload: this.toTurnUpdate() });
        return events;
    }
    validateAction(request, ignoreOwner = false) {
        if (request.battleId !== this.state.battleId)
            return 'INVALID_BATTLE';
        if (!ignoreOwner && (this.state.phase !== 'CHOOSING' || this.state.activeActorId !== request.actorId)) {
            return 'NOT_YOUR_TURN';
        }
        if (request.turn !== this.state.turn)
            return 'STALE_TURN';
        if (!(request.actorId in this.state.combatants))
            return 'INVALID_ACTOR';
        const actor = this.state.combatants[request.actorId];
        if (!actor)
            return 'INVALID_ACTOR';
        if (request.skillId !== null && !actor.skills.some((s) => s.id === request.skillId))
            return 'INVALID_SKILL';
        return null;
    }
    executeAction(request) {
        const events = [
            { type: CombatEventType.ACTION_ACCEPTED, payload: request },
            {
                type: CombatEventType.COMBAT_LOG,
                battleId: request.battleId,
                line: request.skillId ? `Actor ${request.actorId} used ${request.skillId}` : `Actor ${request.actorId} passed`,
                ts: Date.now(),
            },
        ];
        const actor = this.state.combatants[request.actorId];
        if (!actor)
            return events;
        const order = Object.keys(this.state.combatants);
        const targetId = pickNextActorId(request.actorId, order);
        if (!targetId)
            return events;
        const target = this.state.combatants[targetId];
        if (!target)
            return events;
        const skill = request.skillId ? actor.skills.find((s) => s.id === request.skillId) : null;
        const damage = skill?.damage ?? 0;
        if (damage <= 0)
            return events;
        const hpAfter = Math.max(0, getHp(target) - damage);
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
                amount: damage,
                hpAfter,
            },
        });
        return events;
    }
    hasBattleEnded() {
        return Object.values(this.state.combatants).some((c) => getHp(c) <= 0);
    }
    finishTurn(lastActorId) {
        const order = Object.keys(this.state.combatants);
        const ended = this.hasBattleEnded();
        this.state = {
            ...this.state,
            turn: this.state.turn + 1,
            phase: ended ? 'ENDED' : 'CHOOSING',
            activeActorId: ended ? null : pickNextActorId(lastActorId ?? this.state.activeActorId, order),
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
