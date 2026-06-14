import {
  isCity01ArenaSpectatorTile,
  isCity01ArenaStageStepTile,
  isCity01ArenaVisualTile,
} from '../../shared/world/maps/city01LayoutConstants.js';
import {
  getEntityDepthY,
  isCity01TowerAreaTile,
  resolveTowerStepHeightAtTile,
} from '../../shared/world/localizedHeight.js';
import {
  drawPlaceholder,
  PlaceholderType,
  type PlaceholderTypeId,
  PLACEHOLDER_COLORS,
  renderAsset,
} from './placeholderRenderer.js';
import {
  drawGroundTileImage,
  preloadGroundTile,
  resolveGroundTileId,
} from './groundTileImageLoader.js';
import {
  type City01PlaceholderScene,
  sceneTileToWorld,
} from './city01PlaceholderLayout.js';
import { drawSubdividedGroundCell } from './subTileGroundDraw.js';
import {
  tileFootprintDepthY,
  type WorldDepthDrawable,
} from '../../shared/world/worldDepthSort.js';

/**
 * Camada 0 — chão e malha de ruas (sem entidades).
 */
export function renderCity01PlaceholderGround(
  ctx: CanvasRenderingContext2D,
  scene: City01PlaceholderScene,
  camera?: { readonly x: number; readonly y: number; readonly visibleWorldWidth: number; readonly visibleWorldHeight: number },
): void {
  const { mapTiles, tileSize, cells } = scene;

  const pad = 2;
  const startX = camera
    ? Math.max(0, Math.floor(camera.x / tileSize) - pad)
    : 0;
  const startY = camera
    ? Math.max(0, Math.floor(camera.y / tileSize) - pad)
    : 0;
  const endX = camera
    ? Math.min(mapTiles, Math.ceil((camera.x + camera.visibleWorldWidth) / tileSize) + pad)
    : mapTiles;
  const endY = camera
    ? Math.min(mapTiles, Math.ceil((camera.y + camera.visibleWorldHeight) / tileSize) + pad)
    : mapTiles;

  for (let y = startY; y < endY; y++) {
    const row = cells[y];
    if (!row) continue;

    for (let x = startX; x < endX; x++) {
      const cell = row[x];
      if (!cell) continue;

      const { x: px, y: py } = sceneTileToWorld(x, y, tileSize);

      const drawGround = (type: PlaceholderTypeId, subX: number, subY: number, subSize: number) => {
        const tileId = resolveGroundTileId(type);
        if (tileId) void preloadGroundTile(tileId);
        if (!drawGroundTileImage(ctx, type, subX, subY, subSize)) {
          drawPlaceholder(ctx, type, subX, subY, { tileSize: subSize });
        }
      };

      if (isCity01ArenaVisualTile(x, y)) {
        drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
          drawGround(PlaceholderType.ARENA_FLOOR, sx, sy, size);
        });
        continue;
      }

      if (isCity01ArenaStageStepTile(x, y)) {
        drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
          drawGround(PlaceholderType.ARENA_STEP, sx, sy, size);
        });
        continue;
      }

      if (isCity01ArenaSpectatorTile(x, y)) {
        drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
          drawGround(PlaceholderType.SPECTATOR_RING, sx, sy, size);
        });
        continue;
      }

      if (isCity01TowerAreaTile(x, y)) {
        const stepLevel = resolveTowerStepHeightAtTile(x, y);
        drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
          if (stepLevel !== null) {
            drawPlaceholder(ctx, PlaceholderType.TOWER_STEP, sx, sy, {
              tileSize: size,
              heightLevel: stepLevel,
            });
          } else {
            drawGround(PlaceholderType.TOWER_FLOOR, sx, sy, size);
          }
        });
        continue;
      }

      if (cell.road) {
        drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
          drawGround(PlaceholderType.ROAD_TILE, sx, sy, size);
        });
        continue;
      }

      const groundType =
        cell.ground === 'plaza' ? PlaceholderType.PLAZA : PlaceholderType.GRASS;
      drawSubdividedGroundCell(ctx, px, py, tileSize, (c, sx, sy, size) => {
        drawGround(groundType, sx, sy, size);
      });
    }
  }
}

export type City01StructureDrawOptions = {
  /** Ativa Z-sort por height_level (somente quando o jogador está na torre). */
  readonly useLocalizedHeightStacking?: boolean;
};

/** Estruturas da cena com profundidade na base do footprint (Y-sort). */
export function collectCity01PlaceholderStructureDrawables(
  ctx: CanvasRenderingContext2D,
  scene: City01PlaceholderScene,
  options: City01StructureDrawOptions = {},
): WorldDepthDrawable[] {
  const { tileSize } = scene;
  const useStacking = options.useLocalizedHeightStacking === true;

  return scene.entities.map((entity) => {
    const { x, y } = sceneTileToWorld(entity.tileX, entity.tileY, tileSize);
    const widthPx = entity.tileW * tileSize;
    const heightPx = entity.tileH * tileSize;
    const baseDepthY = tileFootprintDepthY(entity.tileY, entity.tileH, tileSize);
    const depthY =
      useStacking && entity.heightLevel !== undefined
        ? getEntityDepthY(entity.tileY, entity.tileH, entity.heightLevel, tileSize)
        : baseDepthY;

    return {
      depthY,
      draw: () => {
        renderAsset(ctx, entity.assetKey, x, y, {
          tileSize,
          widthPx,
          heightPx,
          label: entity.label,
          ...(entity.heightLevel !== undefined ? { heightLevel: entity.heightLevel } : {}),
        });
      },
    };
  });
}

