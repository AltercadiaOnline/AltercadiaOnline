import { getCreatureAssets } from '../loaders/CreatureAssetLoader.js';
import {
  resolveTrimmedAssetSourceRect,
  type AssetTrimRatios,
} from '../entities/player/playerSpriteSourceTrim.js';
import { drawImage1To1AtFeet } from '../render/spriteImageDraw.js';

const CREATURE_TRIM: AssetTrimRatios = {
  top: 0.04,
  bottom: 0.06,
  left: 0.04,
  right: 0.04,
};

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

function resolveIdleUrl(creatureId: string): string {
  return getCreatureAssets(creatureId).sprites.idle;
}

export function getCachedCreatureWorldSprite(creatureId: string): HTMLImageElement | null {
  if (!cache.has(creatureId)) {
    void preloadCreatureWorldSprite(creatureId);
    return null;
  }
  return cache.get(creatureId) ?? null;
}

export function preloadCreatureWorldSprite(creatureId: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const cached = cache.get(creatureId);
  if (cached) return Promise.resolve(cached);
  if (cache.has(creatureId)) return Promise.resolve(null);

  const existing = pending.get(creatureId);
  if (existing) return existing;

  const url = resolveIdleUrl(creatureId);
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(creatureId, img);
      pending.delete(creatureId);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(creatureId, null);
      pending.delete(creatureId);
      resolve(null);
    };
    img.src = url;
  });

  pending.set(creatureId, promise);
  return promise;
}

export function preloadCreatureWorldSprites(creatureIds: readonly string[]): void {
  for (const creatureId of creatureIds) {
    void preloadCreatureWorldSprite(creatureId);
  }
}

/** Sprite idle 1:1 ancorado nos pés — retorna false se asset indisponível. */
export function drawCreatureIdleSpriteAtFeet(
  ctx: CanvasRenderingContext2D,
  creatureId: string,
  feetX: number,
  feetY: number,
): boolean {
  const image = getCachedCreatureWorldSprite(creatureId);
  if (!image?.complete || image.naturalWidth <= 0) return false;

  const trimmed = resolveTrimmedAssetSourceRect(
    image.naturalWidth,
    image.naturalHeight,
    CREATURE_TRIM,
  );

  drawImage1To1AtFeet(ctx, image, trimmed, feetX, feetY, `creature:${creatureId}`);
  return true;
}

export function resetCreatureWorldImageCache(): void {
  cache.clear();
  pending.clear();
}
