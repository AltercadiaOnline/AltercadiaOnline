import { PLACEHOLDER_COLORS } from '../placeholderRenderer.js';
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import {
  CITY_01_COMMERCE_ZONE,
  CITY_01_MAP_TILES,
  CITY_01_PLAZA_MAX,
  CITY_01_PLAZA_MIN,
  CITY_01_RESIDENTIAL_ZONE,
  CITY_01_STRUCTURE_DEFS,
  isCity01ArenaVisualTile,
  isCity01RoadNetworkTile,
  zoneContains,
} from '../../../shared/world/maps/city01LayoutConstants.js';
import { FARM_ZONE_01_ID } from '../../../shared/world/maps/farm_zone_01.js';
import { getMapDefinition, type MapId } from '../../../shared/world/mapRegistry.js';
import { TileType } from '../../../shared/world/tileTypes.js';
import { resolveMinimapOverviewUrl } from './minimapOverviewUrls.js';
import type { MinimapTerrain } from './minimapTypes.js';

const CITY_PALETTE = {
  ground: '#1e2228',
  road: '#3a3f48',
  plaza: '#4a4550',
  residential: '#2a3540',
  commerce: '#35302a',
  arena: '#2e3a32',
  structure: '#4a3a2e',
} as const;

const FARM_PALETTE = {
  alley: '#2a2e36',
  wall: '#5c3830',
  neon: '#1a2830',
} as const;

function resolveCityTileColor(tileX: number, tileY: number): string {
  if (isCity01ArenaVisualTile(tileX, tileY)) return CITY_PALETTE.arena;
  if (
    tileX >= CITY_01_PLAZA_MIN
    && tileX <= CITY_01_PLAZA_MAX
    && tileY >= CITY_01_PLAZA_MIN
    && tileY <= CITY_01_PLAZA_MAX
  ) {
    return CITY_PALETTE.plaza;
  }
  if (isCity01RoadNetworkTile(tileX, tileY)) return CITY_PALETTE.road;
  for (const structure of CITY_01_STRUCTURE_DEFS) {
    if (zoneContains(structure, tileX, tileY)) return CITY_PALETTE.structure;
  }
  if (zoneContains(CITY_01_RESIDENTIAL_ZONE, tileX, tileY)) return CITY_PALETTE.residential;
  if (zoneContains(CITY_01_COMMERCE_ZONE, tileX, tileY)) return CITY_PALETTE.commerce;
  return CITY_PALETTE.ground;
}

/** Silhueta procedural da cidade — fallback e base do overview gerado. */
export function buildCity01TerrainColors(): string[][] {
  const colors: string[][] = [];
  for (let y = 0; y < CITY_01_MAP_TILES; y += 1) {
    const row: string[] = [];
    for (let x = 0; x < CITY_01_MAP_TILES; x += 1) {
      row.push(resolveCityTileColor(x, y));
    }
    colors.push(row);
  }
  return colors;
}

function withOverviewUrl(
  terrain: Omit<MinimapTerrain, 'overviewUrl'>,
  mapId: MapId,
): MinimapTerrain {
  const overviewUrl = resolveMinimapOverviewUrl(mapId);
  if (!overviewUrl) return terrain;
  return { ...terrain, overviewUrl };
}

function buildCity01Terrain(): MinimapTerrain {
  const colors = buildCity01TerrainColors();
  return withOverviewUrl(
    {
      mapId: CITY_01_ID,
      tilesWide: CITY_01_MAP_TILES,
      tilesHigh: CITY_01_MAP_TILES,
      colors,
    },
    CITY_01_ID,
  );
}

function tileToFarmColor(tile: number, tileX: number, tileY: number): string {
  if (tile === TileType.Wall) return FARM_PALETTE.wall;
  // Faixas verticais leves (beco / néon) para leitura no minimapa alto.
  if (tileX % 7 === 0) return FARM_PALETTE.neon;
  if ((tileX + tileY) % 11 === 0) return '#323840';
  return FARM_PALETTE.alley;
}

function buildFarmZoneTerrain(): MinimapTerrain {
  const definition = getMapDefinition(FARM_ZONE_01_ID);
  if (!definition) {
    throw new Error('[Minimap] Mapa farm_zone_01 não registrado.');
  }

  const alleyMin = Math.floor(definition.tilesWide / 2) - 2;
  const alleyMax = Math.floor(definition.tilesWide / 2) + 1;
  const colors: string[][] = [];
  for (let y = 0; y < definition.tilesHigh; y += 1) {
    const row: string[] = [];
    for (let x = 0; x < definition.tilesWide; x += 1) {
      if (x < alleyMin || x > alleyMax) {
        row.push(FARM_PALETTE.wall);
      } else {
        row.push(tileToFarmColor(TileType.Floor, x, y));
      }
    }
    colors.push(row);
  }

  return withOverviewUrl(
    {
      mapId: FARM_ZONE_01_ID,
      tilesWide: definition.tilesWide,
      tilesHigh: definition.tilesHigh,
      colors,
    },
    FARM_ZONE_01_ID,
  );
}

function buildGenericTerrain(mapId: MapId): MinimapTerrain {
  const definition = getMapDefinition(mapId);
  if (!definition) {
    throw new Error(`[Minimap] Mapa desconhecido: ${mapId}`);
  }
  const mapData = definition.generateData();
  const colors = mapData.map((row) =>
    row.map((tile) => (tile === TileType.Wall ? '#1a1410' : PLACEHOLDER_COLORS.grass)),
  );
  return withOverviewUrl(
    {
      mapId,
      tilesWide: definition.tilesWide,
      tilesHigh: definition.tilesHigh,
      colors,
    },
    mapId,
  );
}

const terrainCache = new Map<MapId, MinimapTerrain>();

export function buildMinimapTerrain(mapId: MapId): MinimapTerrain {
  const cached = terrainCache.get(mapId);
  if (cached) return cached;

  let terrain: MinimapTerrain;
  if (mapId === CITY_01_ID) {
    terrain = buildCity01Terrain();
  } else if (mapId === FARM_ZONE_01_ID) {
    terrain = buildFarmZoneTerrain();
  } else {
    terrain = buildGenericTerrain(mapId);
  }

  terrainCache.set(mapId, terrain);
  return terrain;
}

export function clearMinimapTerrainCache(): void {
  terrainCache.clear();
}
