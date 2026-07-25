import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import { MAP_REGISTRY } from '../../../shared/world/mapRegistry.js';
import {
  defaultModulesForZone,
  type ZoneEnsurePayload,
  type ZoneLoadModuleId,
} from '../../../shared/world/zoneLoad/zoneLoadTypes.js';
import { getZoneLoadGateway } from '../../world/ZoneLoadGateway.js';

function isMapId(value: unknown): value is MapId {
  return typeof value === 'string' && value in MAP_REGISTRY;
}

export class ZoneEnsureHandler extends BaseIntentHandler<ZoneEnsurePayload> {
  readonly actionType = 'ZONE_ENSURE';

  async execute(playerId: string, payload: ZoneEnsurePayload, intentId: string): Promise<void> {
    if (!isMapId(payload?.mapId)) {
      this.sendResponse(playerId, intentId, false, 'INVALID_MAP_ID');
      return;
    }

    const modules: readonly ZoneLoadModuleId[] = payload.modules?.length
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

let zoneEnsureHandler: ZoneEnsureHandler | null = null;

export function getZoneEnsureHandler(): ZoneEnsureHandler {
  if (!zoneEnsureHandler) zoneEnsureHandler = new ZoneEnsureHandler();
  return zoneEnsureHandler;
}
