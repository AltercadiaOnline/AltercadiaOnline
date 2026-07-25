import { getCreatureAssets } from '../loaders/CreatureAssetLoader.js';
import {
  resolveTrimmedAssetSourceRect,
  type AssetTrimRatios,
} from '../entities/player/playerSpriteSourceTrim.js';
import { drawImage1To1AtFeet } from '../render/spriteImageDraw.js';
import {
  hasZone1TopDownBundle,
  resolveZone1TopDownRotationUrl,
  type TopDownCreatureFacing,
} from '../../shared/assets/zone1TopDownCreatureAssets.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';

const CREATURE_TRIM: AssetTrimRatios = {
  top: 0.04,
  bottom: 0.06,
  left: 0.04,
  right: 0.04,
};

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

const CARDINAL_FACINGS: readonly PlayerFacing[] = ['south', 'north', 'east', 'west'];

function cacheKey(creatureId: string, facing: PlayerFacing): string {
  return `${creatureId}:${facing}`;
}

function resolveIdleUrl(creatureId: string, facing: PlayerFacing = 'south'): string {
  if (hasZone1TopDownBundle(creatureId)) {
    const url = resolveZone1TopDownRotationUrl(
      creatureId,
      facing as TopDownCreatureFacing,
    );
    if (url) return url;
  }
  return getCreatureAssets(creatureId).sprites.idle;
}

export function getCachedCreatureWorldSprite(
  creatureId: string,
  facing: PlayerFacing = 'south',
): HTMLImageElement | null {
  const key = cacheKey(creatureId, facing);
  if (!cache.has(key)) {
    void preloadCreatureWorldSprite(creatureId, facing);
    return null;
  }
  return cache.get(key) ?? null;
}

export function preloadCreatureWorldSprite(
  creatureId: string,
  facing: PlayerFacing = 'south',
): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const key = cacheKey(creatureId, facing);
  const cached = cache.get(key);
  if (cached) return Promise.resolve(cached);
  if (cache.has(key)) return Promise.resolve(null);

  const existing = pending.get(key);
  if (existing) return existing;

  const url = resolveIdleUrl(creatureId, facing);
  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(key, img);
      pending.delete(key);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(key, null);
      pending.delete(key);
      resolve(null);
    };
    img.src = url;
  });

  pending.set(key, promise);
  return promise;
}

export function preloadCreatureWorldSprites(creatureIds: readonly string[]): void {
  for (const creatureId of creatureIds) {
    for (const facing of CARDINAL_FACINGS) {
      void preloadCreatureWorldSprite(creatureId, facing);
    }
  }
}

/** Sprite top-down 1:1 ancorado nos pés — retorna false se asset indisponível. */
export function drawCreatureIdleSpriteAtFeet(
  ctx: CanvasRenderingContext2D,
  creatureId: string,
  feetX: number,
  feetY: number,
  facing: PlayerFacing = 'south',
): boolean {
  const image = getCachedCreatureWorldSprite(creatureId, facing);
  if (!image?.complete || image.naturalWidth <= 0) {
    // Fallback sul se a rotação pedida ainda não carregou.
    if (facing !== 'south') {
      return drawCreatureIdleSpriteAtFeet(ctx, creatureId, feetX, feetY, 'south');
    }
    return false;
  }

  const trimmed = resolveTrimmedAssetSourceRect(
    image.naturalWidth,
    image.naturalHeight,
    CREATURE_TRIM,
  );

  drawImage1To1AtFeet(
    ctx,
    image,
    trimmed,
    feetX,
    feetY,
    `creature:${creatureId}:${facing}`,
  );
  return true;
}

export function resetCreatureWorldImageCache(): void {
  cache.clear();
  pending.clear();
}
