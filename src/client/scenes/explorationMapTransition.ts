import type { MapId } from '../../shared/world/mapRegistry.js';
import type { MapTransitionPayload } from '../../shared/world/protocol.js';
import type { MapManager } from '../managers/mapManager.js';
import type { NPCManager } from '../managers/NPCManager.js';
import type { PointClickController } from '../managers/PointClickController.js';
import type { PreloadedZoneAssets } from '../world/zoneMapPreloader.js';
import type { WorldMap } from '../world/WorldMap.js';

export type ExplorationMapTransitionDeps = {
  readonly mapManager: MapManager;
  readonly npcManager: NPCManager;
  readonly pointClickController: PointClickController;
  readonly worldMap?: WorldMap;
};

/**
 * Troca de zona usando camada ZoneLink quando disponível — swap quase instantâneo.
 */
export function applyExplorationMapTransition(
  deps: ExplorationMapTransitionDeps,
  payload: MapTransitionPayload,
  zoneLink?: PreloadedZoneAssets | null,
): void {
  const mapId = payload.mapId as MapId;
  deps.mapManager.loadMap(mapId, {
    x: payload.x,
    y: payload.y,
    skipSceneSpawn: true,
    ...(payload.facing !== undefined ? { facing: payload.facing } : {}),
    ...(payload.portalLabel !== undefined ? { portalLabel: payload.portalLabel } : {}),
    ...(zoneLink?.mapData ? { cachedMapData: zoneLink.mapData } : {}),
    ...(zoneLink?.layout ? { cachedLayout: zoneLink.layout } : {}),
  });
  deps.npcManager.setMapId(payload.mapId);
  deps.pointClickController.setMapId(mapId);
  deps.worldMap?.loadMap(mapId);
}
