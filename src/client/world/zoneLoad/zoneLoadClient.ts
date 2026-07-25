// @ts-nocheck
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../../../shared/world/maps/farm_zone_01.js';
import { HUNT_ZONE_MAP_IDS, isCityMapId, isHuntZoneMapId, } from '../../../shared/world/zoneLoad/zoneLoadTypes.js';
import { ensureHuntZoneLoaded } from '../../../shared/world/worldMonsterInstances.js';
import { listZone1CreatureIds } from '../../../shared/world/zone1CreatureRegistry.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getGameMode } from '../../runtime/gameMode.js';
import { preloadCreatureWorldSprites } from '../creatureWorldImageLoader.js';
import { getZoneMapPreloader } from '../zoneMapPreloader.js';
const phaseByMap = new Map();
const ensureInFlight = new Set();
export function getClientZoneLoadPhase(mapId) {
    return phaseByMap.get(mapId) ?? 'idle';
}
function markPhase(mapId, phase) {
    phaseByMap.set(mapId, phase);
}
/** Warm local: colisão/layout + sprites Zone1 (hunt). */
function warmClientZoneModules(mapId) {
    getZoneMapPreloader()?.ensureReady(mapId);
    if (mapId === FARM_ZONE_01_ID || isHuntZoneMapId(mapId)) {
        ensureHuntZoneLoaded(mapId);
        preloadCreatureWorldSprites(listZone1CreatureIds());
    }
}
/**
 * Garante zona no cliente + pede ensure autoritativo (online).
 * Idempotente; fire-and-forget no intent (warm silencioso).
 */
export function ensureClientZone(mapId) {
    if (phaseByMap.get(mapId) === 'ready' || ensureInFlight.has(mapId)) {
        warmClientZoneModules(mapId);
        return;
    }
    ensureInFlight.add(mapId);
    markPhase(mapId, 'loading');
    warmClientZoneModules(mapId);
    const mode = getGameMode();
    if (mode === 'local') {
        markPhase(mapId, 'ready');
        ensureInFlight.delete(mapId);
        return;
    }
    const result = getActionDispatcher().dispatch({
        type: 'ZONE_ENSURE',
        payload: { mapId },
    });
    if (result.ok && result.status === 'applied') {
        markPhase(mapId, 'ready');
        ensureInFlight.delete(mapId);
        return;
    }
    if (result.ok && result.status === 'pending') {
        markPhase(mapId, 'ready');
        ensureInFlight.delete(mapId);
        return;
    }
    markPhase(mapId, 'failed');
    ensureInFlight.delete(mapId);
    console.warn('[ZoneLoad] ensure falhou:', mapId, result.ok === false ? result.reason : '');
}
/**
 * Após Construct `cidade_01` layout-ready — aquece hunt em background.
 * Se o jogador já está na farm, ensure farm imediatamente (sem esperar cidade).
 */
export function onExplorationMapLayoutReady(mapId) {
    if (isCityMapId(mapId)) {
        markPhase(CITY_01_ID, 'ready');
        for (const huntId of HUNT_ZONE_MAP_IDS) {
            ensureClientZone(huntId);
        }
        return;
    }
    if (isHuntZoneMapId(mapId)) {
        ensureClientZone(mapId);
    }
}
export function resetClientZoneLoadState() {
    phaseByMap.clear();
    ensureInFlight.clear();
}
