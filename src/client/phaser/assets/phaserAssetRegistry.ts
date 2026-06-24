import {
  get,
  getRegistryAsset,
  resolveAssetOrigin,
  type AssetFrame,
  type RegistryAsset,
} from '../../../game/AssetRegistry.js';
import {
  getCachedTilesetAtlas,
  getTilesetAtlasUrl,
  PHASER_TILESET_ATLAS_TEXTURE_KEY,
  preloadTilesetAtlas,
} from '../../../game/assetAtlasImageLoader.js';
import {
  getCachedRegistryFileImage,
  preloadRegistryFileAsset,
} from '../../../game/registryFileImageLoader.js';
import { listTestPackWiredAssetIds } from '../../../game/generated/city01TestPackWiring.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import type { PhaserLayoutImage, PhaserLayoutScene } from '../layout/phaserLayoutScene.js';
import { normalizePhaserAsset } from './phaserAssetNormalizer.js';

export { PHASER_TILESET_ATLAS_TEXTURE_KEY };

const REGISTRY_FILE_TEXTURE_PREFIX = 'registry_file_';

export function registryFileTextureKey(assetId: string): string {
  return `${REGISTRY_FILE_TEXTURE_PREFIX}${assetId}`;
}

export function queueTilesetAtlasPreload(scene: PhaserLayoutScene): void {
  scene.load.image(PHASER_TILESET_ATLAS_TEXTURE_KEY, getTilesetAtlasUrl());
  void preloadTilesetAtlas();
}

export function queueRegistryAssetPreload(scene: PhaserLayoutScene, assetKey: string): void {
  const asset = getRegistryAsset(assetKey);
  if (!asset || asset.source !== 'file' || !asset.url) {
    return;
  }

  const textureKey = registryFileTextureKey(asset.id);
  if (!scene.textures.exists(textureKey)) {
    scene.load.image(textureKey, asset.url);
  }
  void preloadRegistryFileAsset(assetKey);
}

export function ensureTilesetAtlasTexture(
  textures: PhaserLayoutScene['textures'],
): boolean {
  if (textures.exists(PHASER_TILESET_ATLAS_TEXTURE_KEY)) {
    return true;
  }

  const cached = getCachedTilesetAtlas();
  if (!cached || cached.naturalWidth <= 0) {
    return false;
  }

  textures.addImage(PHASER_TILESET_ATLAS_TEXTURE_KEY, cached);
  try {
    textures.get(PHASER_TILESET_ATLAS_TEXTURE_KEY).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return true;
}

export function ensureRegistryFileTexture(
  textures: PhaserLayoutScene['textures'],
  assetKey: string,
): boolean {
  const asset = getRegistryAsset(assetKey);
  if (!asset || asset.source !== 'file') {
    return false;
  }

  const textureKey = registryFileTextureKey(asset.id);
  if (textures.exists(textureKey)) {
    return true;
  }

  const cached = getCachedRegistryFileImage(assetKey);
  if (!cached || cached.naturalWidth <= 0) {
    void preloadRegistryFileAsset(assetKey);
    return false;
  }

  textures.addImage(textureKey, cached);
  try {
    textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return true;
}

export function isRegistryAssetRenderable(
  textures: PhaserLayoutScene['textures'],
  assetKey: string,
): boolean {
  const asset = getRegistryAsset(assetKey);
  if (!asset) {
    return false;
  }
  if (asset.source === 'file') {
    return ensureRegistryFileTexture(textures, assetKey);
  }
  return ensureTilesetAtlasTexture(textures);
}

export function applyRegistryCrop(
  sprite: PhaserLayoutImage,
  frame: AssetFrame,
): void {
  const origin = resolveAssetOrigin(frame);
  sprite.setCrop(frame.x, frame.y, frame.width, frame.height);
  sprite.setOrigin(origin.x, origin.y);
}

export function applyRegistryAsset(sprite: PhaserLayoutImage, asset: RegistryAsset): void {
  const origin = resolveAssetOrigin(asset);

  if (asset.source === 'atlas' && asset.atlasFrame) {
    sprite.setCrop(
      asset.atlasFrame.x,
      asset.atlasFrame.y,
      asset.atlasFrame.width,
      asset.atlasFrame.height,
    );
  } else {
    sprite.setCrop(0, 0, asset.width, asset.height);
  }

  sprite.setOrigin(origin.x, origin.y);
}

function resolveSourceDimensions(asset: RegistryAsset): { readonly w: number; readonly h: number } {
  if (asset.source === 'atlas' && asset.atlasFrame) {
    return { w: asset.atlasFrame.width, h: asset.atlasFrame.height };
  }
  return { w: asset.width, h: asset.height };
}

export function positionRegistryAssetAtFeet(
  sprite: PhaserLayoutImage,
  asset: RegistryAsset,
  feetX: number,
  feetY: number,
  displayW?: number,
  displayH?: number,
): void {
  applyRegistryAsset(sprite, asset);
  sprite.setPosition(Math.floor(feetX), Math.floor(feetY));

  const source = resolveSourceDimensions(asset);
  normalizePhaserAsset(
    sprite,
    source.w,
    source.h,
    displayW ?? asset.width,
    displayH ?? asset.height,
    asset.fileName,
  );
}

export function positionRegistryTileAtCorner(
  sprite: PhaserLayoutImage,
  asset: RegistryAsset,
  worldX: number,
  worldY: number,
  size: number,
): void {
  applyRegistryAsset(sprite, asset);
  sprite.setPosition(Math.floor(worldX), Math.floor(worldY));

  const source = resolveSourceDimensions(asset);
  normalizePhaserAsset(sprite, source.w, source.h, size, size, asset.fileName);
}

export function positionRegistrySpriteAtFeet(
  sprite: PhaserLayoutImage,
  frame: AssetFrame,
  feetX: number,
  feetY: number,
  displayW?: number,
  displayH?: number,
  fileName?: string,
): void {
  applyRegistryCrop(sprite, frame);
  sprite.setPosition(Math.floor(feetX), Math.floor(feetY));

  const targetW = displayW ?? frame.width;
  const targetH = displayH ?? frame.height;
  normalizePhaserAsset(
    sprite,
    frame.width,
    frame.height,
    targetW,
    targetH,
    fileName ?? getTilesetAtlasUrl(),
  );
}

export function queueTestPackCity01Preloads(scene: PhaserLayoutScene): void {
  for (const assetId of listTestPackWiredAssetIds()) {
    queueRegistryAssetPreload(scene, assetId);
  }
}

export function tryCreateRegistrySprite(
  scene: PhaserLayoutScene,
  assetKey: string,
): { readonly sprite: PhaserLayoutImage; readonly asset: RegistryAsset } | null {
  const asset = getRegistryAsset(assetKey);
  if (!asset) {
    return null;
  }

  if (asset.source === 'file') {
    if (!ensureRegistryFileTexture(scene.textures, assetKey)) {
      return null;
    }

    const textureKey = registryFileTextureKey(asset.id);
    const sprite = scene.add.image(0, 0, textureKey);
    applyRegistryAsset(sprite, asset);
    return { sprite, asset };
  }

  if (!ensureTilesetAtlasTexture(scene.textures)) {
    return null;
  }

  const frame = get(assetKey);
  if (!frame) {
    return null;
  }

  const sprite = scene.add.image(0, 0, PHASER_TILESET_ATLAS_TEXTURE_KEY);
  applyRegistryCrop(sprite, frame);
  return { sprite, asset };
}
