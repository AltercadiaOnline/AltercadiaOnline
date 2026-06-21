import {
  resolveTrimmedAssetSourceRect,
} from '../../entities/player/playerSpriteSourceTrim.js';
import {
  drawPortalGlyph,
} from '../../world/portalRenderer.js';
import {
  renderAsset,
} from '../../world/placeholderRenderer.js';
import {
  getCachedWorldAssetImage,
  preloadWorldAssetImage,
  resolveWorldAssetImageUrl,
  WORLD_ASSET_IMAGE_URLS,
} from '../../world/worldAssetImageLoader.js';
import type { WorldStructureRenderSnapshot } from '../../world/worldStructureRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';

const STRUCTURE_TRIM = {
  top: 0.02,
  bottom: 0.02,
  left: 0.02,
  right: 0.02,
} as const;

type PhaserStructureImage = {
  setPosition: (x: number, y: number) => PhaserStructureImage;
  setOrigin: (x: number, y: number) => PhaserStructureImage;
  setCrop: (x: number, y: number, width: number, height: number) => PhaserStructureImage;
  setDepth: (depth: number) => PhaserStructureImage;
  setDisplaySize: (width: number, height: number) => PhaserStructureImage;
  setTexture: (textureKey: string) => PhaserStructureImage;
  setVisible: (visible: boolean) => PhaserStructureImage;
  destroy: () => void;
};

type PhaserStructureScene = {
  textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  load: {
    image: (key: string, url: string) => void;
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserStructureImage;
  };
};

function structureTextureKey(assetKey: string): string {
  return `altercadia-structure-${assetKey}`;
}

function placeholderTextureKey(
  assetKey: string,
  widthPx: number,
  heightPx: number,
  heightLevel: number | null,
): string {
  return `altercadia-structure-ph-${assetKey}-${widthPx}x${heightPx}-${heightLevel ?? 0}`;
}

function portalTextureKey(timestampBucket: number): string {
  return `altercadia-portal-glyph-${timestampBucket}`;
}

async function ensureStructurePngTexture(
  textures: PhaserStructureScene['textures'],
  assetKey: string,
): Promise<{ readonly ready: boolean; readonly trimmed: ReturnType<typeof resolveTrimmedAssetSourceRect> | null }> {
  const key = structureTextureKey(assetKey);
  if (!textures.exists(key)) {
    const image = await preloadWorldAssetImage(assetKey);
    const cached = image ?? getCachedWorldAssetImage(assetKey);
    if (!cached || cached.naturalWidth <= 0) {
      return { ready: false, trimmed: null };
    }

    textures.addImage(key, cached);
    try {
      textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
    } catch {
      /* noop */
    }
  }

  const cached = getCachedWorldAssetImage(assetKey);
  if (!cached || cached.naturalWidth <= 0) {
    return { ready: false, trimmed: null };
  }

  return {
    ready: true,
    trimmed: resolveTrimmedAssetSourceRect(
      cached.naturalWidth,
      cached.naturalHeight,
      STRUCTURE_TRIM,
    ),
  };
}

async function ensurePlaceholderStructureTexture(
  textures: PhaserStructureScene['textures'],
  snapshot: WorldStructureRenderSnapshot,
): Promise<boolean> {
  const key = placeholderTextureKey(
    snapshot.assetKey,
    snapshot.widthPx,
    snapshot.heightPx,
    snapshot.heightLevel,
  );
  if (textures.exists(key)) {
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(snapshot.widthPx));
  canvas.height = Math.max(1, Math.round(snapshot.heightPx));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }

  renderAsset(ctx, snapshot.assetKey, 0, 0, {
    tileSize: snapshot.widthPx,
    widthPx: snapshot.widthPx,
    heightPx: snapshot.heightPx,
    ...(snapshot.heightLevel !== null ? { heightLevel: snapshot.heightLevel } : {}),
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

async function ensurePortalTexture(
  textures: PhaserStructureScene['textures'],
  snapshot: WorldStructureRenderSnapshot,
  timestampMs: number,
): Promise<string | null> {
  const bucket = Math.floor(timestampMs / 120);
  const key = portalTextureKey(bucket);

  if (!textures.exists(key)) {
    if (typeof document === 'undefined') {
      return null;
    }

    const size = Math.max(1, Math.round(snapshot.widthPx * 2));
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    drawPortalGlyph(ctx, size / 2, size / 2, timestampMs);

    const ready = await new Promise<boolean>((resolve) => {
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

    if (!ready) {
      return null;
    }
  }

  return key;
}

type StructureRenderMode =
  | { readonly mode: 'png'; readonly textureKey: string; readonly trimmed: ReturnType<typeof resolveTrimmedAssetSourceRect> }
  | { readonly mode: 'placeholder'; readonly textureKey: string }
  | { readonly mode: 'portal'; readonly textureKey: string };

async function resolveStructureRenderMode(
  textures: PhaserStructureScene['textures'],
  snapshot: WorldStructureRenderSnapshot,
  timestampMs: number,
): Promise<StructureRenderMode | null> {
  if (snapshot.kind === 'portal') {
    const textureKey = await ensurePortalTexture(textures, snapshot, timestampMs);
    return textureKey ? { mode: 'portal', textureKey } : null;
  }

  const png = await ensureStructurePngTexture(textures, snapshot.assetKey);
  if (png.ready && png.trimmed) {
    return {
      mode: 'png',
      textureKey: structureTextureKey(snapshot.assetKey),
      trimmed: png.trimmed,
    };
  }

  const placeholderReady = await ensurePlaceholderStructureTexture(textures, snapshot);
  if (!placeholderReady) {
    return null;
  }

  return {
    mode: 'placeholder',
    textureKey: placeholderTextureKey(
      snapshot.assetKey,
      snapshot.widthPx,
      snapshot.heightPx,
      snapshot.heightLevel,
    ),
  };
}

/**
 * Estruturas e portais — Y-sort via depthY (base do footprint).
 */
export class PhaserStructureController {
  private readonly sprites = new Map<string, PhaserStructureImage>();

  private readonly spriteTextureKeys = new Map<string, string>();

  private scene: PhaserStructureScene | null = null;

  private hasRenderedStructures = false;

  mount(scene: PhaserStructureScene): void {
    this.scene = scene;
  }

  isActive(): boolean {
    return this.hasRenderedStructures;
  }

  sync(structures: readonly WorldStructureRenderSnapshot[], timestampMs: number): void {
    const scene = this.scene;
    if (!scene) return;

    const seen = new Set<string>();
    this.hasRenderedStructures = structures.length > 0;

    for (const snapshot of structures) {
      seen.add(snapshot.instanceKey);
      void this.ensureAndUpdate(scene, snapshot, timestampMs);
    }

    for (const [key, sprite] of this.sprites) {
      if (seen.has(key)) continue;
      sprite.destroy();
      this.sprites.delete(key);
      this.spriteTextureKeys.delete(key);
    }
  }

  destroy(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.spriteTextureKeys.clear();
    this.scene = null;
    this.hasRenderedStructures = false;
  }

  private async ensureAndUpdate(
    scene: PhaserStructureScene,
    snapshot: WorldStructureRenderSnapshot,
    timestampMs: number,
  ): Promise<void> {
    const renderMode = await resolveStructureRenderMode(scene.textures, snapshot, timestampMs);
    if (!renderMode) {
      this.sprites.get(snapshot.instanceKey)?.setVisible(false);
      return;
    }

    let sprite = this.sprites.get(snapshot.instanceKey);
    if (!sprite) {
      sprite = scene.add.image(0, 0, renderMode.textureKey);
      this.sprites.set(snapshot.instanceKey, sprite);
      this.spriteTextureKeys.set(snapshot.instanceKey, renderMode.textureKey);
    } else if (this.spriteTextureKeys.get(snapshot.instanceKey) !== renderMode.textureKey) {
      sprite.setTexture(renderMode.textureKey);
      this.spriteTextureKeys.set(snapshot.instanceKey, renderMode.textureKey);
    }

    sprite.setDepth(Math.floor(snapshot.depthY));

    if (renderMode.mode === 'png') {
      const feetX = snapshot.worldX + snapshot.widthPx / 2;
      const feetY = snapshot.worldY + snapshot.heightPx;
      sprite.setOrigin(0.5, 1);
      sprite.setCrop(
        renderMode.trimmed.sx,
        renderMode.trimmed.sy,
        renderMode.trimmed.sw,
        renderMode.trimmed.sh,
      );
      sprite.setPosition(Math.floor(feetX), Math.floor(feetY));
      sprite.setVisible(true);
      return;
    }

    if (renderMode.mode === 'portal') {
      sprite.setOrigin(0.5, 0.5);
      sprite.setPosition(Math.floor(snapshot.worldX), Math.floor(snapshot.worldY));
      sprite.setDisplaySize(snapshot.widthPx * 2, snapshot.heightPx * 2);
      sprite.setVisible(true);
      return;
    }

    sprite.setOrigin(0, 0);
    sprite.setPosition(Math.floor(snapshot.worldX), Math.floor(snapshot.worldY));
    sprite.setDisplaySize(snapshot.widthPx, snapshot.heightPx);
    sprite.setVisible(true);
  }
}

export function queueStructurePreloads(scene: PhaserStructureScene): void {
  for (const [assetKey, url] of Object.entries(WORLD_ASSET_IMAGE_URLS)) {
    if (!url) continue;
    scene.load.image(structureTextureKey(assetKey), url);
    void preloadWorldAssetImage(assetKey);
  }
}
