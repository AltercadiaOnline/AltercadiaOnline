import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { MapId } from './mapRegistry.js';
import type { PortalPosition } from './portals.js';
import { CONSTRUCT_PORTAL_PLACEMENTS_GENERATED } from './constructPortalPlacements.generated.js';

/**
 * Markers de teleporte Construct — dados em constructPortalPlacements.generated.ts.
 * Não importa city01/farm_zone_01 (evita ciclo).
 */
export type ConstructPortalPlacement = {
  readonly mapId: MapId;
  readonly portalId: string;
  readonly constructX: number;
  readonly constructY: number;
  readonly widthPx: number;
  readonly heightPx: number;
};

export const CONSTRUCT_PORTAL_PLACEMENTS: Readonly<
  Record<'city_portal_north' | 'farm_portal_south', ConstructPortalPlacement>
> = CONSTRUCT_PORTAL_PLACEMENTS_GENERATED;

export type PortalTriggerTiles = {
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
};

export function constructPortalToTriggerTiles(
  placement: ConstructPortalPlacement,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): PortalTriggerTiles {
  const centerTileX = Math.floor(placement.constructX / tileSize);
  const centerTileY = Math.floor(placement.constructY / tileSize);
  const tileW = Math.max(1, Math.ceil(placement.widthPx / tileSize));
  const tileH = Math.max(1, Math.ceil(placement.heightPx / tileSize));
  return {
    tileX: centerTileX - Math.floor(tileW / 2),
    tileY: Math.max(0, centerTileY - Math.floor(tileH / 2)),
    tileW,
    tileH,
  };
}

export function constructPortalArrivalTile(
  placement: ConstructPortalPlacement,
  offsetTiles: { readonly dx: number; readonly dy: number },
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): PortalPosition {
  return {
    x: Math.floor(placement.constructX / tileSize) + offsetTiles.dx,
    y: Math.floor(placement.constructY / tileSize) + offsetTiles.dy,
  };
}
