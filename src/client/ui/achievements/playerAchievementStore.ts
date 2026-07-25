// @ts-nocheck
import { listAchievementDefinitions } from '../../../shared/achievements/achievementCatalog.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
const STORAGE_KEY = 'altercadia.achievements.v1';
function readPersisted() {
    if (typeof localStorage === 'undefined') {
        return { unlocked: [], counters: {} };
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { unlocked: [], counters: {} };
        const parsed = JSON.parse(raw);
        const unlocked = Array.isArray(parsed.unlocked)
            ? parsed.unlocked.filter((row) => row
                && typeof row.achievementId === 'string'
                && typeof row.unlockedAt === 'number')
            : [];
        const counters = parsed.counters && typeof parsed.counters === 'object'
            ? { ...parsed.counters }
            : {};
        return { unlocked: [...unlocked], counters };
    }
    catch {
        return { unlocked: [], counters: {} };
    }
}
function writePersisted(unlocked, counters) {
    if (typeof localStorage === 'undefined')
        return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked, counters }));
    }
    catch {
        // quota / private mode
    }
}
class PlayerAchievementStore {
    unlocked = [];
    counters = {};
    listeners = new Set();
    constructor() {
        const persisted = readPersisted();
        this.unlocked = persisted.unlocked;
        this.counters = persisted.counters;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => {
            this.listeners.delete(listener);
        };
    }
    getSnapshot() {
        return {
            unlocked: [...this.unlocked],
            counters: { ...this.counters },
        };
    }
    isUnlocked(achievementId) {
        return this.unlocked.some((row) => row.achievementId === achievementId);
    }
    getUnlock(achievementId) {
        return this.unlocked.find((row) => row.achievementId === achievementId);
    }
    getCounter(key) {
        return this.counters[key] ?? 0;
    }
    /** Incrementa contador e desbloqueia conquistas com target atingido. */
    bumpCounter(key, delta = 1, nowMs = Date.now()) {
        const next = (this.counters[key] ?? 0) + delta;
        this.counters[key] = next;
        writePersisted(this.unlocked, this.counters);
        this.emit();
        for (const def of listAchievementDefinitions()) {
            if (!def.targetCount)
                continue;
            if (def.id === 'pve_victories_5' && key === 'pve_victories' && next >= def.targetCount) {
                this.unlock(def.id, nowMs);
            }
        }
    }
    unlock(achievementId, nowMs = Date.now()) {
        if (this.isUnlocked(achievementId))
            return false;
        if (!listAchievementDefinitions().some((d) => d.id === achievementId))
            return false;
        const record = { achievementId, unlockedAt: nowMs };
        this.unlocked = [record, ...this.unlocked];
        writePersisted(this.unlocked, this.counters);
        this.emit();
        uiEvents.emit(UIEventType.ACHIEVEMENT_UNLOCKED, { achievementId, unlockedAt: nowMs });
        return true;
    }
    reset() {
        this.unlocked = [];
        this.counters = {};
        writePersisted(this.unlocked, this.counters);
        this.emit();
    }
    emit() {
        const snap = this.getSnapshot();
        for (const listener of this.listeners)
            listener(snap);
    }
}
let store = null;
export function getPlayerAchievementStore() {
    if (!store)
        store = new PlayerAchievementStore();
    return store;
}
export function resetPlayerAchievementStore() {
    store?.reset();
    store = null;
}
