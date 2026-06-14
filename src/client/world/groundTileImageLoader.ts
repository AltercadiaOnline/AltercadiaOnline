import {
  GROUND_TILE_IMAGE_URLS,
  PLACEHOLDER_TYPE_TO_GROUND_TILE,
  type GroundTileId,
} from '../../assets/terrain/groundTileManifest.js';
import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import { snapDrawImageDest } from '../render/pixelSnap.js';
import type { PlaceholderTypeId } from './placeholderRenderer.js';

const cache = new Map<GroundTileId, HTMLImageElement | null>();
const pending = new Map<GroundTileId, Promise<HTMLImageElement | null>>();

export function resolveGroundTileId(type: PlaceholderTypeId): GroundTileId | null {
  return PLACEHOLDER_TYPE_TO_GROUND_TILE[type] ?? null;
}

export function preloadGroundTile(tileId: GroundTileId): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') return Promise.resolve(null);

  const existing = pending.get(tileId);
  if (existing) return existing;

  const cached = cache.get(tileId);
  if (cached) return Promise.resolve(cached);

  const url = GROUND_TILE_IMAGE_URLS[tileId];
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(tileId, img);
      pending.delete(tileId);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(tileId, null);
      pending.delete(tileId);
      resolve(null);
    };
    img.src = url;
  });

  pending.set(tileId, promise);
  return promise;
}

export function getCachedGroundTile(tileId: GroundTileId): HTMLImageElement | null {
  if (!cache.has(tileId)) {
    void preloadGroundTile(tileId);
    return null;
  }
  return cache.get(tileId) ?? null;
}

/** Desenha tile 40×40 (ou escala inteira) ancorado no canto superior-esquerdo. */
export function drawGroundTileImage(
  ctx: CanvasRenderingContext2D,
  type: PlaceholderTypeId,
  x: number,
  y: number,
  size: number,
): boolean {
  const tileId = resolveGroundTileId(type);
  if (!tileId) return false;

  const image = getCachedGroundTile(tileId);
  if (!image?.complete || image.naturalWidth <= 0) return false;

  const { dx, dy, dWidth, dHeight } = snapDrawImageDest(x, y, size, size);
  disableCanvasImageSmoothing(ctx);
  ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, dx, dy, dWidth, dHeight);
  return true;
}

export function resetGroundTileImageCache(): void {
  cache.clear();
  pending.clear();
}
