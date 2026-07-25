// @ts-nocheck
import { emptyCombatPractice } from '../../shared/progression/combatPracticeService.js';
/** Espelho autoritativo de prática de combate — escrito apenas pelo servidor/sync. */
class PlayerCombatPracticeStore {
    practice = emptyCombatPractice();
    listeners = new Set();
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => this.listeners.delete(listener);
    }
    getSnapshot() {
        return {
            moveUsage: { ...this.practice.moveUsage },
            triggers: { ...this.practice.triggers },
            damageDealt: this.practice.damageDealt,
            damageTaken: this.practice.damageTaken,
            critsLanded: this.practice.critsLanded,
            battlesPlayed: this.practice.battlesPlayed,
        };
    }
    applyAuthoritativeSnapshot(snapshot) {
        this.practice = {
            moveUsage: { ...snapshot.moveUsage },
            triggers: { ...snapshot.triggers },
            damageDealt: snapshot.damageDealt,
            damageTaken: snapshot.damageTaken,
            critsLanded: snapshot.critsLanded,
            battlesPlayed: snapshot.battlesPlayed,
        };
        this.publish();
    }
    reset() {
        this.practice = emptyCombatPractice();
        this.publish();
    }
    publish() {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }
}
let store = null;
export function getPlayerCombatPracticeStore() {
    if (!store)
        store = new PlayerCombatPracticeStore();
    return store;
}
export function resetPlayerCombatPracticeStore() {
    store = null;
}
