import type { GroundTileId } from '../../../assets/terrain/groundTileManifest.js';
import {
  GROUND_TILE_IMAGE_URLS,
  GROUND_TILE_SPECS,
} from '../../../assets/terrain/groundTileManifest.js';
import {
  drawPlaceholder,
  type PlaceholderTypeId,
} from '../../world/placeholderRenderer.js';
import {
  getCachedGroundTile,
  preloadGroundTile,
  resolveGroundTileId,
} from '../../world/groundTileImageLoader.js';
import type { WorldTerrainTileSnapshot } from '../../world/worldTerrainRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';

type PhaserTerrainImage = {
  setPosition: (x: number, y: number) => PhaserTerrainImage;
  setOrigin: (x: number, y: number) => PhaserTerrainImage;
  setDepth: (depth: number) => PhaserTerrainImage;
  setDisplaySize: (width: number, height: number) => PhaserTerrainImage;
  setVisible: (visible: boolean) => PhaserTerrainImage;
  destroy: () => void;
};

type PhaserTerrainScene = {
  textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  load: {
    image: (key: string, url: string) => void;
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserTerrainImage;
  };
};

function groundTileTextureKey(tileId: GroundTileId): string {
  return `altercadia-ground-${tileId}`;
}

function placeholderTextureKey(
  type: PlaceholderTypeId,
  size: number,
  heightLevel: number | null,
): string {
  return `altercadia-ground-ph-${type}-${size}-${heightLevel ?? 0}`;
}

function tileInstanceKey(tile: WorldTerrainTileSnapshot): string {
  return `${tile.worldX}:${tile.worldY}:${tile.size}`;
}

async function ensureGroundTileTexture(
  textures: PhaserTerrainScene['textures'],
  tileId: GroundTileId,
): Promise<boolean> {
  const key = groundTileTextureKey(tileId);
  if (textures.exists(key)) {
    return true;
  }

  const image = await preloadGroundTile(tileId);
  const cached = image ?? getCachedGroundTile(tileId);
  if (!cached || cached.naturalWidth <= 0) {
    return false;
  }

  textures.addImage(key, cached);
  try {
    textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return true;
}

async function ensurePlaceholderTexture(
  textures: PhaserTerrainScene['textures'],
  type: PlaceholderTypeId,
  size: number,
  heightLevel: number | null,
): Promise<boolean> {
  const key = placeholderTextureKey(type, size, heightLevel);
  if (textures.exists(key)) {
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }

  drawPlaceholder(ctx, type, 0, 0, {
    tileSize: size,
    ...(heightLevel !== null ? { heightLevel } : {}),
  });

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      textures.addImage(key, img);
      try {
        textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
      } catch {
        /* noop */
      }
      resolve(true);
    };
    img.onerror = () => resolve(false);
    img.src = canvas.toDataURL('image/png');
  });
}

async function resolveTerrainTextureKey(
  textures: PhaserTerrainScene['textures'],
  tile: WorldTerrainTileSnapshot,
): Promise<string | null> {
  if (tile.groundTileId) {
    const pngReady = await ensureGroundTileTexture(textures, tile.groundTileId);
    if (pngReady) {
      return groundTileTextureKey(tile.groundTileId);
    }
  }

  const placeholderReady = await ensurePlaceholderTexture(
    textures,
    tile.placeholderType,
    tile.size,
    tile.heightLevel,
  );
  if (!placeholderReady) {
    return null;
  }

  return placeholderTextureKey(tile.placeholderType, tile.size, tile.heightLevel);
}

/**
 * Camada 0 Phaser — tiles de chão espelhando WorldMapRenderer / city01PlaceholderRenderer.
 */
export class PhaserTerrainController {
  private readonly sprites = new Map<string, PhaserTerrainImage>();

  private scene: PhaserTerrainScene | null = null;

  private hasRenderedTiles = false;

  mount(scene: PhaserTerrainScene): void {
    this.scene = scene;
  }

  isActive(): boolean {
    return this.hasRenderedTiles;
  }

  sync(tiles: readonly WorldTerrainTileSnapshot[]): void {
    const scene = this.scene;
    if (!scene) return;

    const seen = new Set<string>();
    this.hasRenderedTiles = tiles.length > 0;

    for (const tile of tiles) {
      const key = tileInstanceKey(tile);
      seen.add(key);
      void this.ensureAndUpdate(scene, tile, key);
    }

    for (const [key, sprite] of this.sprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.sprites.delete(key);
    }
  }

  destroy(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.scene = null;
    this.hasRenderedTiles = false;
  }

  private async ensureAndUpdate(
    scene: PhaserTerrainScene,
    tile: WorldTerrainTileSnapshot,
    instanceKey: string,
  ): Promise<void> {
    const textureKey = await resolveTerrainTextureKey(scene.textures, tile);
    if (!textureKey) {
      this.sprites.get(instanceKey)?.setVisible(false);
      return;
    }
    let sprite = this.sprites.get(instanceKey);
    if (!sprite) {
      sprite = scene.add.image(tile.worldX, tile.worldY, textureKey);
      sprite.setOrigin(0, 0);
      sprite.setDepth(0);
      this.sprites.set(instanceKey, sprite);
    }

    sprite.setPosition(Math.floor(tile.worldX), Math.floor(tile.worldY));
    sprite.setDisplaySize(tile.size, tile.size);
    sprite.setVisible(true);
  }
}

/** Preload via Phaser.Loader — PNGs canônicos de chão. */
export function queueGroundTilePreloads(scene: PhaserTerrainScene): void {
  for (const spec of GROUND_TILE_SPECS) {
    scene.load.image(groundTileTextureKey(spec.id), GROUND_TILE_IMAGE_URLS[spec.id]);
  }
}

/** Preload cache legado — arena/torre usam canvas placeholder on-demand. */
export function preloadLegacyGroundTileCache(): void {
  for (const spec of GROUND_TILE_SPECS) {
    void preloadGroundTile(spec.id);
  }
}
