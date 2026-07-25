// @ts-nocheck
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { MAP_REGISTRY } from '../../../shared/world/mapRegistry.js';
import { defaultModulesForZone, } from '../../../shared/world/zoneLoad/zoneLoadTypes.js';
import { getZoneLoadGateway } from '../../world/ZoneLoadGateway.js';
function isMapId(value) {
    return typeof value === 'string' && value in MAP_REGISTRY;
}
export class ZoneEnsureHandler extends BaseIntentHandler {
    actionType = 'ZONE_ENSURE';
    async execute(playerId, payload, intentId) {
        if (!isMapId(payload?.mapId)) {
            this.sendResponse(playerId, intentId, false, 'INVALID_MAP_ID');
            return;
        }
        const modules = payload.modules?.length
            ? payload.modules
            : defaultModulesForZone(payload.mapId);
        const result = getZoneLoadGateway().ensure(payload.mapId, modules);
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.error);
            return;
        }
        this.sendResponse(playerId, intentId, true, result.data);
    }
}
let zoneEnsureHandler = null;
export function getZoneEnsureHandler() {
    if (!zoneEnsureHandler)
        zoneEnsureHandler = new ZoneEnsureHandler();
    return zoneEnsureHandler;
}
