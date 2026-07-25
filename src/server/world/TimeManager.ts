// @ts-nocheck
import { buildGameTimeSnapshot, normalizeGameHour, REAL_MS_PER_GAME_HOUR, } from '../../shared/world/gameTime.js';
/**
 * Relógio autoritativo do mundo (0–24h).
 * Avança no tick do servidor; clientes apenas espelham snapshots recebidos.
 */
export class TimeManager {
    gameHour;
    msPerGameHour;
    broadcastIntervalMs;
    lastBroadcastMs = -Infinity;
    constructor(options = {}) {
        this.gameHour = normalizeGameHour(options.initialGameHour ?? 8);
        this.msPerGameHour = options.msPerGameHour ?? REAL_MS_PER_GAME_HOUR;
        this.broadcastIntervalMs = options.broadcastIntervalMs ?? 1000;
    }
    advance(deltaMs, serverTimeMs) {
        if (deltaMs > 0) {
            const hoursDelta = deltaMs / this.msPerGameHour;
            this.gameHour = normalizeGameHour(this.gameHour + hoursDelta);
        }
        return this.getSnapshot(serverTimeMs);
    }
    getSnapshot(serverTimeMs = Date.now()) {
        return buildGameTimeSnapshot(this.gameHour, serverTimeMs);
    }
    shouldBroadcast(serverTimeMs) {
        return serverTimeMs - this.lastBroadcastMs >= this.broadcastIntervalMs;
    }
    markBroadcasted(serverTimeMs) {
        this.lastBroadcastMs = serverTimeMs;
    }
}
let worldTimeManager = null;
export function getWorldTimeManager() {
    if (!worldTimeManager) {
        worldTimeManager = new TimeManager();
    }
    return worldTimeManager;
}
export function resetWorldTimeManager() {
    worldTimeManager = null;
}
