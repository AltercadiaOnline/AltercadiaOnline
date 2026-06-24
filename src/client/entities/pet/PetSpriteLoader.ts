import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import { PET_KIND_ORDER } from '../../../shared/pet/petCatalog.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import type { SpriteFrame } from '../player/types.js';
import { PET_ASSET_BUNDLES, PET_FRAME_SIZE_DEFAULT } from './petConstants.js';
import type { PetAssetMetadata, PetSpriteCatalog } from './petTypes.js';

function petAssetUrlCandidates(bundleFolder: string, relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const root = `/assets/pets/${bundleFolder}`;
  const out: string[] = [];

  if (normalized.startsWith(`${bundleFolder}/`)) {
    out.push(`${root}/${normalized}`);
    const flat = `${root}/${normalized.slice(bundleFolder.length + 1)}`;
    if (!out.includes(flat)) out.push(flat);
    return out;
  }

  out.push(`${root}/${normalized}`);
  const nested = `${root}/${bundleFolder}/${normalized}`;
  if (!out.includes(nested)) out.push(nested);
  return out;
}

/**
 * Cache de PNGs top-down dos pets (metadata PixelLab v3 em public/assets/pets/).
 */
export class PetSpriteLoader {
  private static imageCache = new Map<string, HTMLImageElement>();
  private static catalogByKind = new Map<PetKindId, PetSpriteCatalog>();
  private static catalogPromises = new Map<PetKindId, Promise<PetSpriteCatalog | null>>();

  static preloadAll(): Promise<readonly (PetSpriteCatalog | null)[]> {
    return Promise.all(PET_KIND_ORDER.map((kindId) => this.loadCatalog(kindId)));
  }

  static loadCatalog(kindId: PetKindId): Promise<PetSpriteCatalog | null> {
    const cached = this.catalogByKind.get(kindId);
    if (cached) return Promise.resolve(cached);

    const pending = this.catalogPromises.get(kindId);
    if (pending) return pending;

    const promise = this.fetchCatalog(kindId);
    this.catalogPromises.set(kindId, promise);
    return promise;
  }

  static getCachedCatalog(kindId: PetKindId): PetSpriteCatalog | null {
    return this.catalogByKind.get(kindId) ?? null;
  }

  static getCachedRotation(kindId: PetKindId, facing: PlayerFacing): SpriteFrame | null {
    return this.catalogByKind.get(kindId)?.rotations[facing] ?? null;
  }

  static hasPngSprites(kindId: PetKindId): boolean {
    const catalog = this.catalogByKind.get(kindId);
    return Boolean(catalog && Object.keys(catalog.rotations).length > 0);
  }

  static resetCache(): void {
    this.imageCache.clear();
    this.catalogByKind.clear();
    this.catalogPromises.clear();
  }

  private static async fetchCatalog(kindId: PetKindId): Promise<PetSpriteCatalog | null> {
    const bundle = PET_ASSET_BUNDLES[kindId];
    try {
      const response = await fetch(bundle.metadataUrl);
      if (!response.ok) {
        console.warn(`[PetSpriteLoader] metadata ausente (${kindId}):`, bundle.metadataUrl);
        return null;
      }

      const metadata = (await response.json()) as PetAssetMetadata;
      const state = metadata.states[0];
      if (!state) {
        console.warn('[PetSpriteLoader] metadata.states vazio:', kindId);
        return null;
      }

      const frameWidth = state.character.size.width || PET_FRAME_SIZE_DEFAULT;
      const frameHeight = state.character.size.height || PET_FRAME_SIZE_DEFAULT;
      const rotations: Partial<Record<PlayerFacing, SpriteFrame>> = {};

      for (const [direction, relativePath] of Object.entries(state.frames.rotations)) {
        if (!isPlayerFacing(direction)) continue;
        try {
          rotations[direction] = await this.loadFrame(bundle.bundleFolder, relativePath);
        } catch (error) {
          console.warn('[PetSpriteLoader] Rotação ignorada:', kindId, direction, error);
        }
      }

      if (Object.keys(rotations).length === 0) {
        return null;
      }

      const catalog: PetSpriteCatalog = { frameWidth, frameHeight, rotations };
      this.catalogByKind.set(kindId, catalog);
      return catalog;
    } catch (error) {
      console.warn('[PetSpriteLoader] Falha ao carregar catálogo:', kindId, error);
      return null;
    }
  }

  private static loadFrame(bundleFolder: string, relativePath: string): Promise<SpriteFrame> {
    const candidates = petAssetUrlCandidates(bundleFolder, relativePath);
    const cacheKey = candidates[0]!;
    const cached = this.imageCache.get(cacheKey);
    if (cached) {
      return Promise.resolve({ image: cached, src: cacheKey });
    }

    return this.loadImageWithFallback(candidates, cacheKey);
  }

  private static loadImageWithFallback(
    candidates: readonly string[],
    cacheKey: string,
  ): Promise<SpriteFrame> {
    let lastError: Error | null = null;

    const tryNext = (index: number): Promise<SpriteFrame> => {
      const src = candidates[index];
      if (!src) {
        return Promise.reject(lastError ?? new Error(`Pet sprite not found: ${cacheKey}`));
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(cacheKey, img);
          resolve({ image: img, src });
        };
        img.onerror = () => {
          lastError = new Error(`Pet sprite not found: ${src}`);
          tryNext(index + 1).then(resolve).catch(reject);
        };
        img.src = src;
      });
    };

    return tryNext(0);
  }
}

function isPlayerFacing(value: string): value is PlayerFacing {
  return value === 'north' || value === 'south' || value === 'east' || value === 'west';
}

export function preloadPetSprites(): Promise<readonly (PetSpriteCatalog | null)[]> {
  return PetSpriteLoader.preloadAll();
}
