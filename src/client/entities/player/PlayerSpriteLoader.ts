import {
  DEFAULT_PLAYER_SKIN_ID,
  PLAYER_BASE_LAYER_ID,
  PLAYER_FRAME_SIZE_DEFAULT,
  PLAYER_LAYER_RENDER_ORDER,
  PLAYER_SHEET_ASSET_ROOT,
  PLAYER_SHEET_FILENAME,
  resolvePlayerBundleRoot,
  resolvePlayerMetadataUrl,
} from './playerConstants.js';
import {
  isValidPlayerSkinBundleId,
  resolvePlayerSkinBundleSouthPreviewUrl,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';
import type { PlayerAssetMetadata, PlayerLayerDescriptor, PlayerSpriteCatalog, SpriteFrame } from './types.js';
import type { PlayerSkin } from '../../../shared/character/playerSkin.js';

/** Monta lista de camadas na ordem bottom → top. */
export function buildOrderedLayerDescriptors(
  skin: PlayerSkin,
  accessoriesId?: string | null,
): readonly PlayerLayerDescriptor[] {
  const assetBySlot: Partial<Record<(typeof PLAYER_LAYER_RENDER_ORDER)[number], string>> = {
    [PLAYER_BASE_LAYER_ID]: PLAYER_BASE_LAYER_ID,
    pants: skin.pants,
    shoes: skin.shoes,
    shirt: skin.shirt,
    hair: skin.hair,
  };

  if (accessoriesId) {
    assetBySlot.accessories = accessoriesId;
  }

  return PLAYER_LAYER_RENDER_ORDER
    .filter((slot) => assetBySlot[slot])
    .map((slot) => ({ slot, assetId: assetBySlot[slot]! }));
}

/** Resolve URL pública do spritesheet de uma skin. */
export function resolvePlayerSheetUrl(skinId: string = DEFAULT_PLAYER_SKIN_ID): string {
  return `${PLAYER_SHEET_ASSET_ROOT}/${skinId}/${PLAYER_SHEET_FILENAME}`;
}

/** URL de uma camada modular — base usa path fixo; demais slots usam assetId. */
export function resolveLayerSheetUrl(slot: string, assetId: string): string {
  if (slot === 'base') {
    return `${PLAYER_SHEET_ASSET_ROOT}/layers/base/${PLAYER_SHEET_FILENAME}`;
  }
  return `${PLAYER_SHEET_ASSET_ROOT}/layers/${slot}/${assetId}/${PLAYER_SHEET_FILENAME}`;
}

export function layerCacheKey(slot: string, assetId: string): string {
  return `layer:${slot}:${assetId}`;
}

function assetUrlCandidates(skinId: string, relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const bundleRoot = resolvePlayerBundleRoot(skinId);
  const out: string[] = [];

  if (normalized.startsWith(`${skinId}/`)) {
    out.push(`${bundleRoot}/${normalized}`);
    const flat = `${bundleRoot}/${normalized.slice(skinId.length + 1)}`;
    if (!out.includes(flat)) out.push(flat);
    return out;
  }

  out.push(`${bundleRoot}/${normalized}`);
  const nested = `${bundleRoot}/${skinId}/${normalized}`;
  if (!out.includes(nested)) out.push(nested);
  return out;
}

function assetUrl(skinId: string, relativePath: string): string {
  return assetUrlCandidates(skinId, relativePath)[0]!;
}

export { assetUrlCandidates };

/**
 * Cache centralizado de imagens + catálogo metadata-driven.
 * Sheets modulares: `/assets/players/{skinId}/sheet.png`
 */
export class PlayerSpriteLoader {
  private static cache = new Map<string, HTMLImageElement>();
  private static catalogPromise: Promise<PlayerSpriteCatalog> | null = null;

  /** Carrega spritesheet por skinId — retorna do cache se já carregado. */
  static async loadSprite(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<HTMLImageElement> {
    const cached = this.cache.get(skinId);
    if (cached) return cached;

    const src = resolvePlayerSheetUrl(skinId);
    return this.loadImage(src, skinId);
  }

  /**
   * Carrega camada modular (base, shirt, pants, etc.).
   * Retorna null se o asset ainda não existir em public/assets.
   */
  static async loadLayer(slot: string, assetId: string): Promise<HTMLImageElement | null> {
    const key = layerCacheKey(slot, assetId);
    const cached = this.cache.get(key);
    if (cached) return cached;

    const src = resolveLayerSheetUrl(slot, assetId);
    try {
      return await this.loadImage(src, key);
    } catch {
      return null;
    }
  }

  /** Pré-carrega todas as camadas de uma skin (falhas silenciosas). */
  static async preloadSkinLayers(
    skin: { hair: string; shirt: string; pants: string; shoes: string },
    accessoriesId?: string | null,
  ): Promise<number> {
    const layers = buildOrderedLayerDescriptors(skin, accessoriesId);
    const results = await Promise.all(
      layers.map((layer) => this.loadLayer(layer.slot, layer.assetId)),
    );
    return results.filter(Boolean).length;
  }

  /** Catálogo top-down — public/assets/player/{skinId}/metadata.json */
  static getCatalog(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<PlayerSpriteCatalog> {
    if (skinId === DEFAULT_PLAYER_SKIN_ID) {
      if (!this.catalogPromise) {
        this.catalogPromise = this.loadTopDownCatalog(skinId);
      }
      return this.catalogPromise;
    }
    return this.loadTopDownCatalog(skinId);
  }

  /** Alias explícito para o bundle teenage top-down. */
  static getTopDownCatalog(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<PlayerSpriteCatalog> {
    return this.getCatalog(skinId);
  }

  /** URLs candidatas — rotação sul canônica primeiro; sheet.png legado por último. */
  static resolveTopDownSheetUrls(skinId: string = DEFAULT_PLAYER_SKIN_ID): string[] {
    const bundleRoot = resolvePlayerBundleRoot(skinId);
    const bundleId = skinId as PlayerSkinBundleId;
    const canonicalSouth = isValidPlayerSkinBundleId(skinId)
      ? resolvePlayerSkinBundleSouthPreviewUrl(bundleId)
      : `${bundleRoot}/35x54pixel_topdown_chibi_Outfit_Oversized_techwear/rotations/south.png`;
    const legacy = [
      `${bundleRoot}/${skinId}/${PLAYER_SHEET_FILENAME}`,
      `${bundleRoot}/${PLAYER_SHEET_FILENAME}`,
      resolvePlayerSheetUrl(skinId),
      `${bundleRoot}/35x54pixel_topdown_chibi_Outfit_Oversized_techwear/rotations/south.png`,
      `${bundleRoot}/35x54_pixel_art_game_character/rotations/south.png`,
      `${bundleRoot}/2D_game_sprite_asset_teenage/rotations/south.png`,
      `${bundleRoot}/Pixel_art_character_sprite_front/rotations/south.png`,
    ];
    return [canonicalSouth, ...legacy.filter((url) => url !== canonicalSouth)];
  }

  /**
   * Spritesheet único (legado) ou rotação sul como fallback.
   * Retorna null se ausente (fallback para PNGs do metadata).
   */
  static async loadTopDownSpriteSheet(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<HTMLImageElement | null> {
    const cacheKey = `top-down:spritesheet:${skinId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    for (const src of this.resolveTopDownSheetUrls(skinId)) {
      try {
        return await this.loadImage(src, cacheKey);
      } catch {
        /* tenta próximo path */
      }
    }
    return null;
  }

  /** Limpa cache de imagens e catálogo (testes / hot swap). */
  static resetCache(): void {
    this.cache.clear();
    this.catalogPromise = null;
  }

  static hasCached(skinId: string): boolean {
    return this.cache.has(skinId);
  }

  static getCachedImage(cacheKey: string): HTMLImageElement | null {
    return this.cache.get(cacheKey) ?? null;
  }

  /** Força recarga do catálogo metadata (ignora promise em cache). */
  static async loadCatalogFresh(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<PlayerSpriteCatalog> {
    return this.loadTopDownCatalog(skinId);
  }

  private static loadImage(src: string, cacheKey: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(cacheKey);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Sprite not found: ${src}`));
      };
      img.src = src;
    });
  }

  private static async loadImageWithFallback(
    candidates: readonly string[],
    cacheKey: string,
  ): Promise<HTMLImageElement> {
    let lastError: Error | null = null;
    for (const src of candidates) {
      try {
        return await this.loadImage(src, cacheKey);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error(`Sprite not found: ${candidates[0]}`);
  }

  /**
   * Carrega rotações do bundle top-down (8 direções).
   * Paths relativos definidos em metadata.json dentro de public/assets/player/{skinId}/
   */
  private static async loadTopDownCatalog(skinId: string = DEFAULT_PLAYER_SKIN_ID): Promise<PlayerSpriteCatalog> {
    const metadataUrl = resolvePlayerMetadataUrl(skinId);
    const response = await fetch(metadataUrl);
    if (!response.ok) {
      throw new Error(`Metadata indisponível: ${metadataUrl}`);
    }

    const metadata = (await response.json()) as PlayerAssetMetadata;
    const state = metadata.states[0];
    if (!state) {
      throw new Error('[PlayerSpriteLoader] metadata.states vazio.');
    }

    const frameWidth = state.character.size.width || PLAYER_FRAME_SIZE_DEFAULT;
    const frameHeight = state.character.size.height || PLAYER_FRAME_SIZE_DEFAULT;

    const rotations: Record<string, SpriteFrame> = {};
    for (const [direction, relativePath] of Object.entries(state.frames.rotations)) {
      try {
        rotations[direction] = await this.loadFrame(skinId, relativePath);
      } catch (error) {
        console.warn('[PlayerSpriteLoader] Rotação ignorada:', direction, error);
      }
    }

    return {
      frameWidth,
      frameHeight,
      rotations,
    };
  }

  private static async loadFrame(skinId: string, relativePath: string): Promise<SpriteFrame> {
    const candidates = assetUrlCandidates(skinId, relativePath);
    const src = candidates[0]!;
    const image = await this.loadImageWithFallback(candidates, src);
    return { image, src };
  }
}

/** @deprecated Use PlayerSpriteLoader.getCatalog() */
export function getPlayerSpriteCatalog(): Promise<PlayerSpriteCatalog> {
  return PlayerSpriteLoader.getCatalog();
}

/** @deprecated Use PlayerSpriteLoader.loadCatalogFresh() */
export async function loadPlayerSpriteCatalog(): Promise<PlayerSpriteCatalog> {
  return PlayerSpriteLoader.loadCatalogFresh();
}

/** @deprecated Use PlayerSpriteLoader.resetCache() */
export function resetPlayerSpriteCatalogCache(): void {
  PlayerSpriteLoader.resetCache();
}
