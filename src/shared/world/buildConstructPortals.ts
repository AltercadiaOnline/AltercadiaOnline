import {
  PORTAL_ARRIVAL_FALLBACK_TILE,
  PORTAL_CATALOG,
  type PortalCatalogEntry,
} from './portalCatalog.js';
import {
  constructPortalArrivalTile,
  constructPortalToTriggerTiles,
  findConstructPortalPlacement,
} from './constructPortalPlacements.js';
import { CONSTRUCT_FARM_MAIN_LAYOUT } from './constructFarmLayoutConstants.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';
import type { Portal, PortalPosition } from './portals.js';

function resolveArrivalTile(entry: PortalCatalogEntry): PortalPosition {
  const arrival = findConstructPortalPlacement(
    entry.arrivalPortalId,
    entry.targetConstructLayout,
  );
  if (arrival) {
    return constructPortalArrivalTile(arrival, entry.arrivalOffset);
  }
  const fallback = PORTAL_ARRIVAL_FALLBACK_TILE[entry.targetConstructLayout];
  if (fallback) return fallback;
  throw new Error(
    `[buildConstructPortals] Chegada ausente para ${entry.portalId} → ${entry.targetConstructLayout}`,
  );
}

function buildPortalFromCatalog(entry: PortalCatalogEntry): Portal | null {
  const source = findConstructPortalPlacement(entry.portalId, entry.sourceConstructLayout);
  if (!source) return null;

  const trigger = constructPortalToTriggerTiles(source);
  return {
    id: entry.portalId,
    mapId: source.mapId,
    label: entry.label,
    direction: entry.direction,
    tileX: trigger.tileX,
    tileY: trigger.tileY,
    tileW: trigger.tileW,
    tileH: trigger.tileH,
    targetMapId: entry.targetMapId,
    targetPosition: resolveArrivalTile(entry),
    sourceConstructLayout: entry.sourceConstructLayout,
    targetConstructLayout: entry.targetConstructLayout,
    ...(entry.targetZoneId !== undefined ? { targetZoneId: entry.targetZoneId } : {}),
  };
}

export function buildPortalsForMap(mapId: MapId): readonly Portal[] {
  const portals: Portal[] = [];
  for (const entry of PORTAL_CATALOG) {
    const source = findConstructPortalPlacement(entry.portalId, entry.sourceConstructLayout);
    if (!source || source.mapId !== mapId) continue;
    const portal = buildPortalFromCatalog(entry);
    if (portal) portals.push(portal);
  }
  return portals;
}

/** Portais interativos no layout farm ativo (subzonas 1 / 1a / 1b / 1c). */
export function getPortalsForActiveLayout(
  mapId: MapId,
  constructFarmLayout: string = CONSTRUCT_FARM_MAIN_LAYOUT,
): readonly Portal[] {
  const all = buildPortalsForMap(mapId);
  if (mapId !== FARM_ZONE_01_ID) return all;
  return all.filter((portal) => portal.sourceConstructLayout === constructFarmLayout);
}
