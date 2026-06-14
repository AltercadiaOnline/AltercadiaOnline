import { getActiveMapTileSize } from '../../../shared/world/activeMapTileSize.js';

export type MinimapClickTarget = {
  readonly tileX: number;
  readonly tileY: number;
  readonly worldX: number;
  readonly worldY: number;
};

export type MinimapDisplayRect = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly width: number;
  readonly height: number;
};

/** Área útil do canvas com `object-fit: contain` (letterbox). */
export function resolveMinimapDisplayRect(
  canvas: HTMLCanvasElement,
  displayWidth: number,
  displayHeight: number,
): MinimapDisplayRect {
  const internalW = canvas.width;
  const internalH = canvas.height;
  if (internalW <= 0 || internalH <= 0 || displayWidth <= 0 || displayHeight <= 0) {
    return { offsetX: 0, offsetY: 0, width: displayWidth, height: displayHeight };
  }

  const canvasAspect = internalW / internalH;
  const rectAspect = displayWidth / displayHeight;

  if (canvasAspect > rectAspect) {
    const height = displayWidth / canvasAspect;
    return {
      offsetX: 0,
      offsetY: (displayHeight - height) / 2,
      width: displayWidth,
      height,
    };
  }

  const width = displayHeight * canvasAspect;
  return {
    offsetX: (displayWidth - width) / 2,
    offsetY: 0,
    width,
    height: displayHeight,
  };
}

/**
 * Converte clique no minimapa (px na tela) para tile e pixel do mundo.
 * ratioX = worldWidth / minimapWidth — aplicado na área desenhada (sem letterbox).
 */
export function minimapClickToWorldTarget(
  clickX: number,
  clickY: number,
  displayRect: MinimapDisplayRect,
  tilesWide: number,
  tilesHigh: number,
): MinimapClickTarget | null {
  if (tilesWide <= 0 || tilesHigh <= 0) return null;
  if (displayRect.width <= 0 || displayRect.height <= 0) return null;

  const localX = clickX - displayRect.offsetX;
  const localY = clickY - displayRect.offsetY;
  if (localX < 0 || localY < 0 || localX > displayRect.width || localY > displayRect.height) {
    return null;
  }

  const tileSize = getActiveMapTileSize();
  const worldWidth = tilesWide * tileSize;
  const worldHeight = tilesHigh * tileSize;
  const ratioX = worldWidth / displayRect.width;
  const ratioY = worldHeight / displayRect.height;

  const worldX = Math.max(0, Math.min(worldWidth - 1, localX * ratioX));
  const worldY = Math.max(0, Math.min(worldHeight - 1, localY * ratioY));

  const tileX = Math.min(tilesWide - 1, Math.floor(worldX / tileSize));
  const tileY = Math.min(tilesHigh - 1, Math.floor(worldY / tileSize));

  return { tileX, tileY, worldX, worldY };
}

/** Clique relativo ao bounding rect do canvas (`clientX/Y` → local). */
export function minimapClientClickToWorldTarget(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  tilesWide: number,
  tilesHigh: number,
): MinimapClickTarget | null {
  const rect = canvas.getBoundingClientRect();
  const display = resolveMinimapDisplayRect(canvas, rect.width, rect.height);
  return minimapClickToWorldTarget(
    clientX - rect.left,
    clientY - rect.top,
    display,
    tilesWide,
    tilesHigh,
  );
}
