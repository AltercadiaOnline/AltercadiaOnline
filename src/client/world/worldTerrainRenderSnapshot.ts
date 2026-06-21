import { DESIGN_CONFIG } from '../../config/designConstants.js';
import {
  isCity01ArenaSpectatorTile,
  isCity01ArenaStageStepTile,
  isCity01ArenaVisualTile,
} from '../../shared/world/maps/city01LayoutConstants.js';
import {
  isCity01TowerAreaTile,
  resolveTowerStepHeightAtTile,
} from '../../shared/world/localizedHeight.js';
import { resolveSubTileDrawLayout } from '../../config/tileGridDensity.js';
import { FARM_ZONE_01_ID } from '../../shared/world/maps/farm_zone_01.js';
import { tileToWorldPixel, VisualTileKind } from './city01VisualLayout.js';
import { sceneTileToWorld, type City01PlaceholderScene } from './city01PlaceholderLayout.js';
import { PlaceholderType, type PlaceholderTypeId } from './placeholderRenderer.js';
import { resolveGroundTileId } from './groundTileImageLoader.js';
import type { GroundTileId } from '../../assets/terrain/groundTileManifest.js';
import type { MapVisualLayout } from './mapVisualLayouts.js';

export type TerrainCameraSlice = {
  readonly x: number;
  readonly y: number;
  readonly visibleWorldWidth: number;
  readonly visibleWorldHeight: number;
};

export type WorldTerrainTileSnapshot = {
  readonly worldX: number;
  readonly worldY: number;
  readonly size: number;
  readonly placeholderType: PlaceholderTypeId;
  readonly groundTileId: GroundTileId | null;
  readonly heightLevel: number | null;
};

function resolveVisibleTileBounds(
  camera: TerrainCameraSlice,
  mapTilesWide: number,
  mapTilesHigh: number,
  tileSize: number,
): {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
} {
  const pad = 2;
  const startX = Math.max(0, Math.floor(camera.x / tileSize) - pad);
  const startY = Math.max(0, Math.floor(camera.y / tileSize) - pad);
  const endX = Math.min(
    mapTilesWide,
    Math.ceil((camera.x + camera.visibleWorldWidth) / tileSize) + pad,
  );
  const endY = Math.min(
    mapTilesHigh,
    Math.ceil((camera.y + camera.visibleWorldHeight) / tileSize) + pad,
  );
  return { startX, startY, endX, endY };
}

function pushSubdividedTerrainTiles(
  out: WorldTerrainTileSnapshot[],
  originX: number,
  originY: number,
  logicalTileSize: number,
  placeholderType: PlaceholderTypeId,
  heightLevel: number | null = null,
): void {
  const { visualTileSize, subdivisions } = resolveSubTileDrawLayout(logicalTileSize);

  for (let sy = 0; sy < subdivisions; sy += 1) {
    for (let sx = 0; sx < subdivisions; sx += 1) {
      out.push({
        worldX: originX + sx * visualTileSize,
        worldY: originY + sy * visualTileSize,
        size: visualTileSize,
        placeholderType,
        groundTileId: resolveGroundTileId(placeholderType),
        heightLevel,
      });
    }
  }
}

/** Espelha `renderCity01PlaceholderGround` — tiles visíveis para a câmera. */
export function collectCity01PlaceholderGroundTiles(
  scene: City01PlaceholderScene,
  camera: TerrainCameraSlice,
): readonly WorldTerrainTileSnapshot[] {
  const tiles: WorldTerrainTileSnapshot[] = [];
  const { mapTiles, tileSize, cells } = scene;
  const { startX, startY, endX, endY } = resolveVisibleTileBounds(
    camera,
    mapTiles,
    mapTiles,
    tileSize,
  );

  for (let y = startY; y < endY; y += 1) {
    const row = cells[y];
    if (!row) continue;

    for (let x = startX; x < endX; x += 1) {
      const cell = row[x];
      if (!cell) continue;

      const { x: px, y: py } = sceneTileToWorld(x, y, tileSize);

      if (isCity01ArenaVisualTile(x, y)) {
        pushSubdividedTerrainTiles(tiles, px, py, tileSize, PlaceholderType.ARENA_FLOOR);
        continue;
      }

      if (isCity01ArenaStageStepTile(x, y)) {
        pushSubdividedTerrainTiles(tiles, px, py, tileSize, PlaceholderType.ARENA_STEP);
        continue;
      }

      if (isCity01ArenaSpectatorTile(x, y)) {
        pushSubdividedTerrainTiles(tiles, px, py, tileSize, PlaceholderType.SPECTATOR_RING);
        continue;
      }

      if (isCity01TowerAreaTile(x, y)) {
        const stepLevel = resolveTowerStepHeightAtTile(x, y);
        pushSubdividedTerrainTiles(
          tiles,
          px,
          py,
          tileSize,
          stepLevel !== null ? PlaceholderType.TOWER_STEP : PlaceholderType.TOWER_FLOOR,
          stepLevel,
        );
        continue;
      }

      if (cell.road) {
        pushSubdividedTerrainTiles(tiles, px, py, tileSize, PlaceholderType.ROAD_TILE);
        continue;
      }

      const groundType =
        cell.ground === 'plaza' ? PlaceholderType.PLAZA : PlaceholderType.GRASS;
      pushSubdividedTerrainTiles(tiles, px, py, tileSize, groundType);
    }
  }

  return tiles;
}

function resolveLayoutGroundType(kind: string): PlaceholderTypeId {
  if (kind === VisualTileKind.Road) return PlaceholderType.ROAD_TILE;
  if (kind === VisualTileKind.Plaza) return PlaceholderType.PLAZA;
  return PlaceholderType.GRASS;
}

/** Espelha `WorldMapRenderer.renderGroundLayer` para mapas sem placeholderScene. */
export function collectVisualLayoutGroundTiles(
  layout: MapVisualLayout,
  camera: TerrainCameraSlice,
): readonly WorldTerrainTileSnapshot[] {
  const tiles: WorldTerrainTileSnapshot[] = [];
  const { tiles: grid, tileSize } = layout;
  const useFarmTiles = layout.mapId === FARM_ZONE_01_ID;

  const pad = 2;
  const startX = Math.max(0, Math.floor(camera.x / tileSize) - pad);
  const startY = Math.max(0, Math.floor(camera.y / tileSize) - pad);
  const endX = Math.min(
    layout.mapTilesWide,
    startX + DESIGN_CONFIG.VISIBLE_TILES.WIDTH + pad * 2,
  );
  const endY = Math.min(
    layout.mapTilesHigh,
    startY + DESIGN_CONFIG.VISIBLE_TILES.HEIGHT + pad * 2,
  );

  for (let y = startY; y < endY; y += 1) {
    const row = grid[y];
    if (!row) continue;

    for (let x = startX; x < endX; x += 1) {
      const cell = row[x];
      if (!cell) continue;

      const { x: px, y: py } = tileToWorldPixel(x, y, tileSize);
      const kind = cell.kind;
      const groundType = resolveLayoutGroundType(kind);

      if (useFarmTiles && (kind === VisualTileKind.Road || kind === VisualTileKind.Plaza)) {
        pushSubdividedTerrainTiles(tiles, px, py, tileSize, groundType);
        continue;
      }

      pushSubdividedTerrainTiles(tiles, px, py, tileSize, groundType);
    }
  }

  return tiles;
}

export function collectMapGroundTileSnapshots(
  layout: MapVisualLayout,
  camera: TerrainCameraSlice,
): readonly WorldTerrainTileSnapshot[] {
  if (layout.placeholderScene) {
    return collectCity01PlaceholderGroundTiles(layout.placeholderScene, camera);
  }
  return collectVisualLayoutGroundTiles(layout, camera);
}
