// @ts-nocheck
import { CombatEventType } from '../../shared/events.js';
import { MarcoProgressTrigger, } from '../../shared/progression/marcoProgressCatalog.js';
import { emptyCombatPractice, mergeCombatPractice, } from '../../shared/progression/combatPracticeService.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getDataStore } from '../economy/economyLayer.js';
const FLUX_MOVE_IDS = new Set(['advance', 'evasive_step', 'focus']);
/**
 * Buffer de prática por batalha — flush via RECORD_COMBAT_PRACTICE ao encerrar.
 * Leitura efetiva = persistido (IDataStore) + delta da batalha em curso.
 */
class CombatPracticeStore {
    battleDelta = emptyCombatPractice();
    playerActorId = null;
    activeBattleId = null;
    listeners = new Set();
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getEffectivePractice());
        return () => this.listeners.delete(listener);
    }
    /** Prática persistida + batalha atual (para HUD em tempo real). */
    getEffectivePractice() {
        return mergeCombatPractice(getDataStore().getCombatPractice(), this.battleDelta);
    }
    getBattleDelta() {
        return {
            moveUsage: { ...this.battleDelta.moveUsage },
            triggers: { ...this.battleDelta.triggers },
            damageDealt: this.battleDelta.damageDealt,
            damageTaken: this.battleDelta.damageTaken,
            critsLanded: this.battleDelta.critsLanded,
            battlesPlayed: this.battleDelta.battlesPlayed,
        };
    }
    setActiveBattleId(battleId) {
        this.activeBattleId = battleId;
    }
    recordCombatEvent(event) {
        switch (event.type) {
            case CombatEventType.BATTLE_START: {
                this.beginBattle();
                const combatants = event.payload.combatants;
                const playerEntry = Object.keys(combatants).find((id) => id.includes('player'));
                this.playerActorId = playerEntry ?? Object.keys(combatants)[0] ?? null;
                break;
            }
            case CombatEventType.ACTION_ACCEPTED: {
                if (event.payload.actorId !== this.playerActorId)
                    break;
                const moveId = event.payload.skillId;
                if (!moveId)
                    break;
                this.bumpMoveUsage(moveId);
                if (FLUX_MOVE_IDS.has(moveId)) {
                    this.bumpTrigger(MarcoProgressTrigger.FLUX_MOVE_USED);
                }
                break;
            }
            case CombatEventType.DAMAGE_DEALT: {
                const { sourceId, targetId, amount, isCritical } = event.payload;
                if (amount <= 0)
                    break;
                if (sourceId === this.playerActorId) {
                    this.battleDelta = {
                        ...this.battleDelta,
                        damageDealt: this.battleDelta.damageDealt + amount,
                    };
                    this.bumpTrigger(MarcoProgressTrigger.DAMAGE_DEALT);
                    if (isCritical) {
                        this.battleDelta = {
                            ...this.battleDelta,
                            critsLanded: this.battleDelta.critsLanded + 1,
                        };
                        this.bumpTrigger(MarcoProgressTrigger.CRIT_LANDED);
                    }
                }
                if (targetId === this.playerActorId) {
                    this.battleDelta = {
                        ...this.battleDelta,
                        damageTaken: this.battleDelta.damageTaken + amount,
                    };
                    this.bumpTrigger(MarcoProgressTrigger.DAMAGE_TAKEN);
                }
                break;
            }
            default:
                break;
        }
        this.publish();
    }
    /** Persiste delta da batalha no servidor (ActionDispatcher) e zera buffer local. */
    flushBattleToServer(victory, battleId) {
        this.battleDelta = {
            ...this.battleDelta,
            battlesPlayed: 1,
        };
        if (victory) {
            this.bumpTrigger(MarcoProgressTrigger.BATTLE_WON);
        }
        const delta = this.getBattleDelta();
        const hasActivity = Object.keys(delta.moveUsage).length > 0
            || delta.damageDealt > 0
            || delta.damageTaken > 0
            || delta.critsLanded > 0
            || Object.keys(delta.triggers).length > 0;
        if (hasActivity) {
            getActionDispatcher().dispatch({
                type: 'RECORD_COMBAT_PRACTICE',
                payload: {
                    delta,
                    battleId: battleId ?? this.activeBattleId ?? undefined,
                },
            });
        }
        this.beginBattle();
        this.playerActorId = null;
        this.activeBattleId = null;
        this.publish();
    }
    beginBattle() {
        this.battleDelta = emptyCombatPractice();
    }
    reset() {
        this.beginBattle();
        this.playerActorId = null;
        this.activeBattleId = null;
        this.publish();
    }
    bumpMoveUsage(moveId) {
        this.battleDelta = {
            ...this.battleDelta,
            moveUsage: {
                ...this.battleDelta.moveUsage,
                [moveId]: (this.battleDelta.moveUsage[moveId] ?? 0) + 1,
            },
        };
    }
    bumpTrigger(trigger) {
        this.battleDelta = {
            ...this.battleDelta,
            triggers: {
                ...this.battleDelta.triggers,
                [trigger]: (this.battleDelta.triggers[trigger] ?? 0) + 1,
            },
        };
    }
    publish() {
        const snapshot = this.getEffectivePractice();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
let store = null;
export function getCombatPracticeStore() {
    if (!store)
        store = new CombatPracticeStore();
    return store;
}
export function resetCombatPracticeStore() {
    store = null;
}
