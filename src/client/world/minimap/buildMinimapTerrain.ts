import { buildCity01PlaceholderScene } from '../city01PlaceholderLayout.js';
import { PLACEHOLDER_COLORS } from '../placeholderRenderer.js';
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../../../shared/world/maps/farm_zone_01.js';
import {
  FARM_ZONE_01_ALLEY_MAX,
  FARM_ZONE_01_ALLEY_MIN,
} from '../../../shared/world/maps/farmZone01LayoutConstants.js';
import { getMapDefinition, type MapId } from '../../../shared/world/mapRegistry.js';
import { TileType } from '../../../shared/world/tileTypes.js';
import type { MinimapTerrain } from './minimapTypes.js';

const FARM_PALETTE = {
  alley: '#2e3238',
  sidewalk: '#4a4e54',
  wall: '#6b3530',
} as const;

function buildCity01Terrain(): MinimapTerrain {
  const scene = buildCity01PlaceholderScene();
  const colors: string[][] = [];

  for (let y = 0; y < scene.mapTiles; y++) {
    const row: string[] = [];
    for (let x = 0; x < scene.mapTiles; x++) {
      const cell = scene.cells[y]?.[x];
      if (!cell) {
        row.push(PLACEHOLDER_COLORS.grass);
        continue;
      }
      if (cell.road) {
        row.push(PLACEHOLDER_COLORS.road);
      } else if (cell.ground === 'plaza') {
        row.push(PLACEHOLDER_COLORS.plaza);
      } else {
        row.push(PLACEHOLDER_COLORS.grass);
      }
    }
    colors.push(row);
  }

  return {
    mapId: CITY_01_ID,
    tilesWide: scene.mapTiles,
    tilesHigh: scene.mapTiles,
    colors,
  };
}

function tileToFarmColor(tile: number, tileX: number): string {
  switch (tile) {
    case TileType.Wall:
      return FARM_PALETTE.wall;
    case TileType.Stairs:
    case TileType.Obstacle:
      return FARM_PALETTE.alley;
    default: {
      const isSidewalk = tileX === FARM_ZONE_01_ALLEY_MIN - 1 || tileX === FARM_ZONE_01_ALLEY_MAX + 1;
      return isSidewalk ? FARM_PALETTE.sidewalk : FARM_PALETTE.alley;
    }
  }
}

function buildFarmZoneTerrain(): MinimapTerrain {
  const definition = getMapDefinition(FARM_ZONE_01_ID);
  if (!definition) {
    throw new Error('[Minimap] Mapa farm_zone_01 não registrado.');
  }

  const mapData = definition.generateData();
  const colors = mapData.map((row) => row.map((tile, x) => tileToFarmColor(tile, x)));

  return {
    mapId: FARM_ZONE_01_ID,
    tilesWide: definition.tilesWide,
    tilesHigh: definition.tilesHigh,
    colors,
  };
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
    const definition = getMapDefinition(mapId);
    if (!definition) {
      throw new Error(`[Minimap] Mapa desconhecido: ${mapId}`);
    }
    const mapData = definition.generateData();
    const colors = mapData.map((row) =>
      row.map((tile) => (tile === TileType.Wall ? '#1a1410' : PLACEHOLDER_COLORS.grass)),
    );
    terrain = {
      mapId,
      tilesWide: definition.tilesWide,
      tilesHigh: definition.tilesHigh,
      colors,
    };
  }

  terrainCache.set(mapId, terrain);
  return terrain;
}

export function clearMinimapTerrainCache(): void {
  terrainCache.clear();
}
