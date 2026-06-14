import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { resolvePlayerVisualBounds } from '../../shared/world/playerVisualContract.js';
import type { Portal } from '../../shared/world/portals.js';
import {
  portalCenterTile,
  portalInteractionContains,
  tileToWorldPixel,
} from '../../shared/world/portals.js';
import { isTileBlocking } from '../../shared/world/tileTypes.js';
import { FARM_ZONE_01_ID, FARM_ZONE_01_SOUTH_EXIT_ZONE } from '../../shared/world/maps/farm_zone_01.js';
import { resolvePlayerWalkabilitySample } from '../../shared/world/movement.js';
import { isCollisionDebugEnabled } from './visualDebugMode.js';

export type CollisionDebugDrawInput = {
  readonly mapId: string;
  readonly mapData: readonly (readonly number[])[];
  readonly playerX: number;
  readonly playerY: number;
  readonly portals: readonly Portal[];
  readonly cameraX: number;
  readonly cameraY: number;
  readonly viewWidth: number;
  readonly viewHeight: number;
};

const BLOCKED_FILL = 'rgba(255, 60, 60, 0.18)';
const BLOCKED_STROKE = 'rgba(255, 60, 60, 0.55)';
const WALKABLE_STROKE = 'rgba(80, 220, 120, 0.35)';
const PLAYER_COLLISION_STROKE = '#44ff88';
const PLAYER_SAMPLE_FILL = '#ffcc00';
const PORTAL_FILL = 'rgba(0, 232, 200, 0.35)';
const PORTAL_STROKE = '#00e8c8';
const SOUTH_ZONE_STROKE = 'rgba(255, 180, 60, 0.65)';

/** Desenha hitboxes de colisão, tiles bloqueados visíveis e gatilhos de portal (dev). */
export function drawCollisionDebugOverlay(
  ctx: CanvasRenderingContext2D,
  input: CollisionDebugDrawInput,
): void {
  if (!isCollisionDebugEnabled()) return;

  const tileSize = getActiveMapTileSize();
  const {
    mapData,
    playerX,
    playerY,
    portals,
    cameraX,
    cameraY,
    viewWidth,
    viewHeight,
  } = input;

  const startTileX = Math.max(0, Math.floor(cameraX / tileSize) - 1);
  const startTileY = Math.max(0, Math.floor(cameraY / tileSize) - 1);
  const endTileX = Math.min(
    (mapData[0]?.length ?? 0) - 1,
    Math.ceil((cameraX + viewWidth) / tileSize) + 1,
  );
  const endTileY = Math.min(mapData.length - 1, Math.ceil((cameraY + viewHeight) / tileSize) + 1);

  ctx.save();
  ctx.lineWidth = 1;

  for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
    for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
      const tile = mapData[tileY]?.[tileX];
      if (tile === undefined) continue;

      const origin = tileToWorldPixel(tileX, tileY, tileSize);
      const blocked = isTileBlocking(tile);

      if (blocked) {
        ctx.fillStyle = BLOCKED_FILL;
        ctx.strokeStyle = BLOCKED_STROKE;
        ctx.fillRect(origin.x, origin.y, tileSize, tileSize);
        ctx.strokeRect(origin.x + 0.5, origin.y + 0.5, tileSize - 1, tileSize - 1);
      } else {
        ctx.strokeStyle = WALKABLE_STROKE;
        ctx.strokeRect(origin.x + 0.5, origin.y + 0.5, tileSize - 1, tileSize - 1);
      }
    }
  }

  if (input.mapId === FARM_ZONE_01_ID) {
    const zone = FARM_ZONE_01_SOUTH_EXIT_ZONE;
    const zoneOrigin = tileToWorldPixel(zone.tileX, zone.tileY, tileSize);
    ctx.strokeStyle = SOUTH_ZONE_STROKE;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(
      zoneOrigin.x + 0.5,
      zoneOrigin.y + 0.5,
      zone.tileW * tileSize - 1,
      zone.tileH * tileSize - 1,
    );
    ctx.setLineDash([]);
  }

  for (const portal of portals) {
    const center = portalCenterTile(portal);
    if (!portalInteractionContains(portal, center.x, center.y)) continue;
    const origin = tileToWorldPixel(center.x, center.y, tileSize);
    ctx.fillStyle = PORTAL_FILL;
    ctx.strokeStyle = PORTAL_STROKE;
    ctx.fillRect(origin.x, origin.y, tileSize, tileSize);
    ctx.strokeRect(origin.x + 0.5, origin.y + 0.5, tileSize - 1, tileSize - 1);
  }

  const sample = resolvePlayerWalkabilitySample({ x: playerX, y: playerY }, tileSize);
  ctx.fillStyle = PLAYER_SAMPLE_FILL;
  ctx.beginPath();
  ctx.arc(sample.x, sample.y, 3, 0, Math.PI * 2);
  ctx.fill();

  const bounds = resolvePlayerVisualBounds({ x: playerX, y: playerY });
  ctx.strokeStyle = PLAYER_COLLISION_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    bounds.x + 0.5,
    bounds.y + 0.5,
    bounds.width - 1,
    bounds.height - 1,
  );

  ctx.font = '9px Consolas, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(
    `collider ${DESIGN_CONFIG.PLAYER.WIDTH}×${DESIGN_CONFIG.PLAYER.HEIGHT} sample●`,
    bounds.x,
    bounds.y - 10,
  );

  ctx.restore();
}
