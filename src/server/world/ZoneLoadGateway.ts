// @ts-nocheck
import { isMapAllowedOnInstance } from '../../shared/world/serverInstanceCatalog.js';
import { defaultModulesForZone, isHuntZoneMapId, } from '../../shared/world/zoneLoad/zoneLoadTypes.js';
import { ensureHuntZoneLoaded, isZoneMonsterRuntimeLoaded } from '../../shared/world/worldMonsterInstances.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
/**
 * Autoridade de runtime por zona (processo).
 * “Permitido no shard” ≠ “seed/AI prontos” — este gateway cuida do segundo.
 */
export class ZoneLoadGateway {
    phaseByMap = new Map();
    getPhase(mapId) {
        return this.phaseByMap.get(mapId) ?? 'idle';
    }
    isReady(mapId) {
        return this.getPhase(mapId) === 'ready';
    }
    /**
     * Idempotente — seed de monstros hunt + marca ready.
     * Rejeita mapas fora da instância ativa.
     */
    ensure(mapId, modules = defaultModulesForZone(mapId)) {
        const instance = getServerInstanceContext();
        if (!isMapAllowedOnInstance(mapId, instance)) {
            this.phaseByMap.set(mapId, 'failed');
            return { ok: false, error: 'ZONE_NOT_ON_INSTANCE' };
        }
        if (this.isReady(mapId) && (!isHuntZoneMapId(mapId) || isZoneMonsterRuntimeLoaded(mapId))) {
            return {
                ok: true,
                data: { mapId, phase: 'ready', modules: [...modules] },
            };
        }
        this.phaseByMap.set(mapId, 'loading');
        try {
            if (modules.includes('monsters') || isHuntZoneMapId(mapId)) {
                ensureHuntZoneLoaded(mapId);
            }
            this.phaseByMap.set(mapId, 'ready');
            return {
                ok: true,
                data: { mapId, phase: 'ready', modules: [...modules] },
            };
        }
        catch (error) {
            this.phaseByMap.set(mapId, 'failed');
            const message = error instanceof Error ? error.message : 'ZONE_ENSURE_FAILED';
            return { ok: false, error: message };
        }
    }
    /** Portal / world-login — falha fechada se o ensure não completar. */
    ensureOrThrow(mapId) {
        const result = this.ensure(mapId);
        if (!result.ok) {
            throw new Error(result.error);
        }
    }
}
let gateway = null;
export function getZoneLoadGateway() {
    if (!gateway)
        gateway = new ZoneLoadGateway();
    return gateway;
}
/** Testes / reset de sessão de processo. */
export function resetZoneLoadGateway() {
    gateway = null;
}
