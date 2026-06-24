import { URBAN_PROP_IMAGE_URLS } from '../../assets/urban/urbanAssetManifest.js';
import {
  drawRegistryAssetAtFeet,
  hasRegistryAsset,
  preloadTilesetAtlas,
} from '../../game/assetAtlasImageLoader.js';
import {
  resolveTrimmedAssetSourceRect,
  type AssetTrimRatios,
} from '../entities/player/playerSpriteSourceTrim.js';
import { drawImage1To1AtFeet } from '../render/spriteImageDraw.js';

const cache = new Map<string, HTMLImageElement | null>();
const pending = new Map<string, Promise<HTMLImageElement | null>>();

/** URLs opcionais — quando o PNG existir em public/, renderiza 1:1 em vez do placeholder. */
export const WORLD_ASSET_IMAGE_URLS: Readonly<Record<string, string>> = {
  casa_anciao: '/assets/structures/casa_anciao.png',
  casa_mercenario: '/assets/structures/casa_mercenario.png',
  casa_ferreiro: '/assets/structures/casa_ferreiro.png',
  casa_vendedor: '/assets/structures/casa_vendedor.png',
  casa_alquimista: '/assets/structures/casa_alquimista.png',
  casa_banqueiro: '/assets/structures/casa_banqueiro.png',
  arena_tournament: '/assets/structures/arena_tournament.png',
  refraction_booth: '/assets/structures/refraction_booth.png',
  food_stalls: '/assets/structures/food_stalls.png',
  market_hall: '/assets/structures/market_hall.png',
  tower_wing: '/assets/structures/tower_wing.png',
  tower_spire: '/assets/structures/tower_spire.png',
  ...URBAN_PROP_IMAGE_URLS,
};

const STRUCTURE_TRIM: AssetTrimRatios = {
  top: 0.02,
  bottom: 0.02,
  left: 0.02,
  right: 0.02,
};

export function resolveWorldAssetImageUrl(assetKey: string): string | null {
  return WORLD_ASSET_IMAGE_URLS[assetKey] ?? null;
}

export function getCachedWorldAssetImage(assetKey: string): HTMLImageElement | null {
  if (!cache.has(assetKey)) {
    const url = resolveWorldAssetImageUrl(assetKey);
    if (url) void preloadWorldAssetImage(assetKey);
    return null;
  }
  return cache.get(assetKey) ?? null;
}

export function preloadWorldAssetImage(assetKey: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null);
  }

  const cached = cache.get(assetKey);
  if (cached) return Promise.resolve(cached);
  if (cache.has(assetKey)) return Promise.resolve(null);

  const existing = pending.get(assetKey);
  if (existing) return existing;

  const url = resolveWorldAssetImageUrl(assetKey);
  if (!url) {
    cache.set(assetKey, null);
    return Promise.resolve(null);
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      cache.set(assetKey, img);
      pending.delete(assetKey);
      resolve(img);
    };
    img.onerror = () => {
      cache.set(assetKey, null);
      pending.delete(assetKey);
      resolve(null);
    };
    img.src = url;
  });

  pending.set(assetKey, promise);
  return promise;
}

/** Desenha PNG 1:1 — base central no pé do footprint (x + w/2, y + h). */
export function drawWorldAssetImage1To1(
  ctx: CanvasRenderingContext2D,
  assetKey: string,
  footprintX: number,
  footprintY: number,
  footprintW: number,
  footprintH: number,
): boolean {
  void preloadTilesetAtlas();
  if (hasRegistryAsset(assetKey)) {
    const feetX = footprintX + footprintW / 2;
    const feetY = footprintY + footprintH;
    if (drawRegistryAssetAtFeet(ctx, assetKey, feetX, feetY, footprintW, footprintH)) {
      return true;
    }
  }

  const image = getCachedWorldAssetImage(assetKey);
  if (!image?.complete || image.naturalWidth <= 0) return false;

  const trimmed = resolveTrimmedAssetSourceRect(
    image.naturalWidth,
    image.naturalHeight,
    STRUCTURE_TRIM,
  );

  const feetX = footprintX + footprintW / 2;
  const feetY = footprintY + footprintH;

  drawImage1To1AtFeet(
    ctx,
    image,
    trimmed,
    feetX,
    feetY,
    `${assetKey}.png`,
    footprintW,
    footprintH,
  );
  return true;
}

export function resetWorldAssetImageCache(): void {
  cache.clear();
  pending.clear();
}
