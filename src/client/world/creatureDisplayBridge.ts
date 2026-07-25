// @ts-nocheck
/**
 * Espelho visual suave das criaturas — interpola poses do state-sync (sem lógica de jogo).
 */
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { getEntityFeetWorldY } from '../../config/playerDesignAnchoring.js';
import { resolveCreatureTileWorldPoint } from './creatureWorldRenderer.js';
import { RemoteEntityInterpolator, } from './remoteEntityInterpolator.js';
const interpolator = new RemoteEntityInterpolator();
function resolveFacing(raw) {
    if (raw === 'north' || raw === 'east' || raw === 'west' || raw === 'south') {
        return raw;
    }
    return 'south';
}
function resolveFeetFromSnapshot(snapshot) {
    const tileSize = getActiveMapTileSize();
    const worldPoint = snapshot.worldX !== undefined && snapshot.worldY !== undefined
        ? { x: snapshot.worldX, y: snapshot.worldY }
        : resolveCreatureTileWorldPoint(snapshot.tileX, snapshot.tileY, tileSize);
    return {
        x: worldPoint.x,
        y: getEntityFeetWorldY(worldPoint, tileSize),
    };
}
/** Empurra poses autoritativas recebidas no sync (timestamp local = agora). */
export function pushCreatureDisplaySnapshots(snapshots, nowMs = performance.now()) {
    const alive = new Set();
    for (const snapshot of snapshots) {
        alive.add(snapshot.instanceId);
        const feet = resolveFeetFromSnapshot(snapshot);
        interpolator.pushKeyframe({
            entityId: snapshot.instanceId,
            feetX: feet.x,
            feetY: feet.y,
            facing: resolveFacing(snapshot.facing),
            serverTimeMs: nowMs,
        });
    }
    for (const id of interpolator.listEntityIds()) {
        if (!alive.has(id)) {
            interpolator.removeEntity(id);
        }
    }
}
export function sampleCreatureDisplay(instanceId, nowMs = performance.now()) {
    return interpolator.sample(instanceId, nowMs);
}
export function pruneCreatureDisplay(nowMs = performance.now()) {
    interpolator.prune(nowMs);
}
export function clearCreatureDisplay() {
    interpolator.clear();
}
