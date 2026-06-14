import { URBAN_PALETTE } from '../../assets/urban/urbanAssetManifest.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import {
  FARM_ZONE_01_PORTALS,
  FARM_ZONE_01_SOUTH_EXIT_ZONE,
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_TILES_WIDE,
} from '../../shared/world/maps/farm_zone_01.js';
import {
  FARM_ZONE_01_ALLEY_MAX,
  FARM_ZONE_01_ALLEY_MIN,
} from '../../shared/world/maps/farmZone01LayoutConstants.js';
import { portalCenterTile } from '../../shared/world/portals.js';
import type { VisualCell, VisualLandmark, VisualTileKindId } from './city01VisualLayout.js';
import { VisualTileKind } from './city01VisualLayout.js';

/** Paleta beco EUA + Tóquio — continuidade com a cidade, corredor mais escuro e úmido. */
export const FARM_ZONE_PALETTE = {
  background: '#08090d',
  alley: URBAN_PALETTE.asphalt,
  alleyWet: '#252a32',
  sidewalk: URBAN_PALETTE.concreteDark,
  wall: URBAN_PALETTE.brickDark,
  wallAccent: URBAN_PALETTE.brick,
  neonTeal: URBAN_PALETTE.neonTeal,
  neonMagenta: URBAN_PALETTE.neonMagenta,
  portal: '#00e8c8',
  portalGlow: 'rgba(0, 232, 200, 0.35)',
  gridLine: 'rgba(255,255,255,0.05)',
} as const;

export type FarmZone01VisualLayout = {
  readonly tiles: readonly (readonly VisualCell[])[];
  readonly landmarks: readonly VisualLandmark[];
  readonly mapTilesWide: number;
  readonly mapTilesHigh: number;
  readonly tileSize: number;
};

function southExitZoneContains(tileX: number, tileY: number): boolean {
  const zone = FARM_ZONE_01_SOUTH_EXIT_ZONE;
  return (
    tileX >= zone.tileX
    && tileX < zone.tileX + zone.tileW
    && tileY >= zone.tileY
    && tileY < zone.tileY + zone.tileH
  );
}

function isAlleyPathTile(tileX: number, tileY: number): boolean {
  if (southExitZoneContains(tileX, tileY)) {
    return true;
  }
  return tileX >= FARM_ZONE_01_ALLEY_MIN && tileX <= FARM_ZONE_01_ALLEY_MAX;
}

function isSidewalkTile(tileX: number, tileY: number): boolean {
  if (isAlleyPathTile(tileX, tileY)) return false;

  const westSidewalk = tileX === FARM_ZONE_01_ALLEY_MIN - 1;
  const eastSidewalk = tileX === FARM_ZONE_01_ALLEY_MAX + 1;
  return westSidewalk || eastSidewalk;
}

function isNeonAccentTile(tileX: number, tileY: number): boolean {
  if (!isSidewalkTile(tileX, tileY) && tileX !== FARM_ZONE_01_ALLEY_MIN - 2 && tileX !== FARM_ZONE_01_ALLEY_MAX + 2) {
    return false;
  }
  return tileY % 11 === 5;
}

export function buildFarmZone01VisualLayout(): FarmZone01VisualLayout {
  const landmarkById = new Map<string, VisualLandmark>();
  const tiles: VisualCell[][] = [];

  for (const portal of FARM_ZONE_01_PORTALS) {
    const center = portalCenterTile(portal);
    landmarkById.set(portal.id, {
      id: portal.id,
      label: portal.label,
      kind: 'portal',
      tileX: center.x,
      tileY: center.y,
    });
  }

  for (let y = 0; y < FARM_ZONE_01_TILES_HIGH; y++) {
    const row: VisualCell[] = [];
    for (let x = 0; x < FARM_ZONE_01_TILES_WIDE; x++) {
      const isBorder =
        y === 0 || y === FARM_ZONE_01_TILES_HIGH - 1 || x === 0 || x === FARM_ZONE_01_TILES_WIDE - 1;
      let kind: VisualTileKindId = isBorder ? VisualTileKind.Building : VisualTileKind.Grass;
      let landmarkId: string | null = null;

      if (!isBorder) {
        if (isAlleyPathTile(x, y)) {
          kind = VisualTileKind.Road;
        } else if (isSidewalkTile(x, y)) {
          kind = VisualTileKind.Plaza;
        } else if (isNeonAccentTile(x, y)) {
          kind = VisualTileKind.Arena;
        } else {
          kind = VisualTileKind.Building;
        }
      }

      row.push({ kind, landmarkId });
    }
    tiles.push(row);
  }

  return {
    tiles,
    landmarks: [...landmarkById.values()],
    mapTilesWide: FARM_ZONE_01_TILES_WIDE,
    mapTilesHigh: FARM_ZONE_01_TILES_HIGH,
    tileSize: DESIGN_CONFIG.TILE.SIZE,
  };
}
