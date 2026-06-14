import {
  DEFAULT_PLAYER_SKIN_ID,
  PLAYER_ASSET_METADATA_URL,
  PLAYER_BASE_LAYER_ID,
  PLAYER_FRAME_SIZE_DEFAULT,
  PLAYER_LAYER_RENDER_ORDER,
  PLAYER_SHEET_ASSET_ROOT,
  PLAYER_SHEET_FILENAME,
  TOP_DOWN_PLAYER_BUNDLE_ROOT,
} from './playerConstants.js';
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

function assetUrlCandidates(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const bundleFolder = DEFAULT_PLAYER_SKIN_ID;
  const out: string[] = [];

  if (normalized.startsWith(`${bundleFolder}/`)) {
    out.push(`${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${normalized}`);
    const flat = `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${normalized.slice(bundleFolder.length + 1)}`;
    if (!out.includes(flat)) out.push(flat);
    return out;
  }

  out.push(`${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${normalized}`);
  const nested = `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${bundleFolder}/${normalized}`;
  if (!out.includes(nested)) out.push(nested);
  return out;
}

function assetUrl(relativePath: string): string {
  return assetUrlCandidates(relativePath)[0]!;
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

  /** Catálogo top-down — public/assets/player/player.teste.asset/metadata.json */
  static getCatalog(): Promise<PlayerSpriteCatalog> {
    if (!this.catalogPromise) {
      this.catalogPromise = this.loadTopDownCatalog();
    }
    return this.catalogPromise;
  }

  /** Alias explícito para o bundle teenage top-down. */
  static getTopDownCatalog(): Promise<PlayerSpriteCatalog> {
    return this.getCatalog();
  }

  /** URLs candidatas do spritesheet top-down (grid 8 dir × N frames). */
  static resolveTopDownSheetUrls(): string[] {
    const nestedSheet = `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${DEFAULT_PLAYER_SKIN_ID}/${PLAYER_SHEET_FILENAME}`;
    const exportNested = `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${DEFAULT_PLAYER_SKIN_ID}/${DEFAULT_PLAYER_SKIN_ID}/${PLAYER_SHEET_FILENAME}`;
    return [
      exportNested,
      nestedSheet,
      `${TOP_DOWN_PLAYER_BUNDLE_ROOT}/${PLAYER_SHEET_FILENAME}`,
      resolvePlayerSheetUrl(DEFAULT_PLAYER_SKIN_ID),
    ];
  }

  /**
   * Spritesheet único — public/assets/player/player.teste.asset/sheet.png
   * Retorna null se ausente (fallback para PNGs do metadata).
   */
  static async loadTopDownSpriteSheet(): Promise<HTMLImageElement | null> {
    const cacheKey = 'top-down:spritesheet';
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    for (const src of this.resolveTopDownSheetUrls()) {
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
  static async loadCatalogFresh(): Promise<PlayerSpriteCatalog> {
    return this.loadTopDownCatalog();
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

  private static async loadFrame(relativePath: string): Promise<SpriteFrame> {
    const candidates = assetUrlCandidates(relativePath);
    const src = candidates[0]!;
    const image = await this.loadImageWithFallback(candidates, src);
    return { image, src };
  }

  /**
   * Carrega rotações do bundle teenage (top-down 8 direções).
   * Paths relativos definidos em metadata.json dentro de public/assets/player/player.teste.asset/
   */
  private static async loadTopDownCatalog(): Promise<PlayerSpriteCatalog> {
    const response = await fetch(PLAYER_ASSET_METADATA_URL);
    if (!response.ok) {
      throw new Error(`Metadata indisponível: ${PLAYER_ASSET_METADATA_URL}`);
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
        rotations[direction] = await this.loadFrame(relativePath);
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
