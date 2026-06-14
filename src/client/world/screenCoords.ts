import {
  GAME_STAGE_FRAME_ID,
  GAME_STAGE_SCALE_ID,
} from '../layout/gameLayout.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import type { Camera } from '../scenes/Camera.js';
import { snapToPixel } from '../render/pixelSnap.js';
import { mapBufferPointToFramePx } from './domNametagLayer.js';
export type ScreenTilePick = {
  readonly tileX: number;
  readonly tileY: number;
  readonly worldX: number;
  readonly worldY: number;
};

export function screenToWorldPixel(camera: Camera, screenX: number, screenY: number): { worldX: number; worldY: number } {
  const z = camera.effectiveZoom;
  return {
    worldX: camera.x + (screenX - camera.viewportOffsetX) / z,
    worldY: camera.y + (screenY - camera.viewportOffsetY) / z,
  };
}

export function worldPixelToTile(
  worldX: number,
  worldY: number,
  tileSize = getActiveMapTileSize(),
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(worldX / tileSize),
    tileY: Math.floor(worldY / tileSize),
  };
}

export function screenToTile(
  camera: Camera,
  screenX: number,
  screenY: number,
  mapTilesWide: number,
  mapTilesHigh: number,
): ScreenTilePick | null {
  const { worldX, worldY } = screenToWorldPixel(camera, screenX, screenY);
  const { tileX, tileY } = worldPixelToTile(worldX, worldY);

  if (tileX < 0 || tileY < 0 || tileX >= mapTilesWide || tileY >= mapTilesHigh) {
    return null;
  }

  return { tileX, tileY, worldX, worldY };
}

export function worldToScreenPixel(camera: Camera, worldX: number, worldY: number): { screenX: number; screenY: number } {
  return toScreenCoords(camera, worldX, worldY);
}

/**
 * Converte coordenada lógica do servidor/mundo → buffer de renderização (640×360).
 * Único ponto de entrada para projeção world→screen na exploração.
 */
export function toScreenCoords(
  camera: Camera,
  logicalX: number,
  logicalY: number,
  options?: { readonly round?: boolean },
): { readonly screenX: number; readonly screenY: number } {
  const z = camera.effectiveZoom;
  const screenX = camera.viewportOffsetX + (logicalX - camera.x) * z;
  const screenY = camera.viewportOffsetY + (logicalY - camera.y) * z;
  if (options?.round) {
    return { screenX: snapToPixel(screenX), screenY: snapToPixel(screenY) };
  }
  return { screenX, screenY };
}

/** Inverso de toScreenCoords — buffer/tela lógica → mundo. */
export function toWorldCoords(
  camera: Camera,
  screenX: number,
  screenY: number,
): { readonly worldX: number; readonly worldY: number } {
  return screenToWorldPixel(camera, screenX, screenY);
}

/**
 * Buffer 640×360 → px no #game-stage-frame (camada DOM fora do transform: scale).
 * Use para HUD flutuante ancorada a entidades do mundo.
 */
export function toDomOverlayCoords(
  bufferX: number,
  bufferY: number,
  root: ParentNode = document,
): { readonly left: number; readonly top: number } {
  const frame = root.querySelector<HTMLElement>(`#${GAME_STAGE_FRAME_ID}`);
  const scaleHost = root.querySelector<HTMLElement>(`#${GAME_STAGE_SCALE_ID}`);

  if (!frame || !scaleHost) {
    return { left: Math.round(bufferX), top: Math.round(bufferY) };
  }

  const hostRect = scaleHost.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return mapBufferPointToFramePx(bufferX, bufferY, hostRect, frameRect);
}