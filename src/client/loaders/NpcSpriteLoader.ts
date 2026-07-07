import {
  NPC_ASSET_BUNDLES,
  type NpcAssetBundleConfig,
} from '../../shared/npc/npcAssetBundles.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { SpriteFrame } from '../entities/player/types.js';

export type NpcAssetMetadata = {
  readonly states: readonly {
    readonly character: {
      readonly size: { readonly width: number; readonly height: number };
    };
    readonly frames: {
      readonly rotations: Readonly<Record<string, string>>;
    };
  }[];
};

export type NpcSpriteCatalog = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly rotations: Readonly<Partial<Record<PlayerFacing, SpriteFrame>>>;
};

function sanitizeNpcMetadataAssetPath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/([^/]+)\.(?=\/)/g, '$1');
}

function npcAssetUrlCandidates(bundleFolder: string, relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const sanitized = sanitizeNpcMetadataAssetPath(normalized);
  const root = `/assets/npcs/${bundleFolder}`;
  const out: string[] = [];

  if (sanitized !== normalized) {
    out.push(`${root}/${sanitized}`);
  }
  out.push(`${root}/${normalized}`);

  const trimmedFolder = normalized.replace(/\.\//g, '/').replace(/\/\./g, '/');
  if (trimmedFolder !== normalized) {
    const alt = `${root}/${trimmedFolder}`;
    if (!out.includes(alt)) out.push(alt);
  }

  return out;
}

/**
 * Catálogo top-down de NPCs — bundles PixelLab v3 em public/assets/npcs/{nome}_npc/.
 */
export class NpcSpriteLoader {
  private static imageCache = new Map<string, HTMLImageElement>();
  private static catalogByNpc = new Map<string, NpcSpriteCatalog>();
  private static catalogPromises = new Map<string, Promise<NpcSpriteCatalog | null>>();

  static listBundledNpcIds(): readonly string[] {
    return Object.keys(NPC_ASSET_BUNDLES);
  }

  static preloadAll(): Promise<readonly (NpcSpriteCatalog | null)[]> {
    return Promise.all(this.listBundledNpcIds().map((npcId) => this.loadCatalog(npcId)));
  }

  static loadCatalog(npcId: string): Promise<NpcSpriteCatalog | null> {
    const cached = this.catalogByNpc.get(npcId);
    if (cached) return Promise.resolve(cached);

    const pending = this.catalogPromises.get(npcId);
    if (pending) return pending;

    const promise = this.fetchCatalog(npcId);
    this.catalogPromises.set(npcId, promise);
    return promise;
  }

  static getCachedCatalog(npcId: string): NpcSpriteCatalog | null {
    return this.catalogByNpc.get(npcId) ?? null;
  }

  static getCachedRotation(npcId: string, facing: PlayerFacing): SpriteFrame | null {
    return this.catalogByNpc.get(npcId)?.rotations[facing] ?? null;
  }

  static hasPngSprites(npcId: string): boolean {
    const catalog = this.catalogByNpc.get(npcId);
    return Boolean(catalog && Object.keys(catalog.rotations).length > 0);
  }

  static resetCache(): void {
    this.imageCache.clear();
    this.catalogByNpc.clear();
    this.catalogPromises.clear();
  }

  private static async fetchCatalog(npcId: string): Promise<NpcSpriteCatalog | null> {
    const bundle = NPC_ASSET_BUNDLES[npcId];
    if (!bundle) return null;

    try {
      const response = await fetch(bundle.metadataUrl);
      if (!response.ok) {
        console.warn(`[NpcSpriteLoader] metadata ausente (${npcId}):`, bundle.metadataUrl);
        return null;
      }

      const metadata = (await response.json()) as NpcAssetMetadata;
      const state = metadata.states[0];
      if (!state) {
        console.warn('[NpcSpriteLoader] metadata.states vazio:', npcId);
        return null;
      }

      const frameWidth = state.character.size.width || 96;
      const frameHeight = state.character.size.height || 96;
      const rotations: Partial<Record<PlayerFacing, SpriteFrame>> = {};

      for (const [direction, relativePath] of Object.entries(state.frames.rotations)) {
        if (!isCardinalFacing(direction)) continue;
        try {
          rotations[direction] = await this.loadFrame(bundle, relativePath);
        } catch (error) {
          console.warn('[NpcSpriteLoader] Rotação ignorada:', npcId, direction, error);
        }
      }

      if (Object.keys(rotations).length === 0) {
        return null;
      }

      const catalog: NpcSpriteCatalog = { frameWidth, frameHeight, rotations };
      this.catalogByNpc.set(npcId, catalog);
      return catalog;
    } catch (error) {
      console.warn('[NpcSpriteLoader] Falha ao carregar catálogo:', npcId, error);
      return null;
    }
  }

  private static loadFrame(
    bundle: NpcAssetBundleConfig,
    relativePath: string,
  ): Promise<SpriteFrame> {
    const candidates = npcAssetUrlCandidates(bundle.bundleFolder, relativePath);
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
        return Promise.reject(lastError ?? new Error(`NPC sprite not found: ${cacheKey}`));
      }

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(cacheKey, img);
          resolve({ image: img, src });
        };
        img.onerror = () => {
          lastError = new Error(`NPC sprite not found: ${src}`);
          tryNext(index + 1).then(resolve).catch(reject);
        };
        img.src = src;
      });
    };

    return tryNext(0);
  }
}

function isCardinalFacing(value: string): value is PlayerFacing {
  return value === 'north' || value === 'south' || value === 'east' || value === 'west';
}

export function preloadNpcSpriteBundles(): Promise<readonly (NpcSpriteCatalog | null)[]> {
  return NpcSpriteLoader.preloadAll();
}
