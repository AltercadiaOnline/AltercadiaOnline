import {
  getRegistryAsset,
  resolveAssetId,
} from '../../../game/AssetRegistry.js';
import { preloadTilesetAtlas } from '../../../game/assetAtlasImageLoader.js';
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { preloadRegistryFileAsset } from '../../../game/registryFileImageLoader.js';
import type { GroundTileId } from '../../../assets/terrain/groundTileManifest.js';
import {
  getCachedGroundTile,
  preloadGroundTile,
} from '../../world/groundTileImageLoader.js';
import type { WorldTerrainTileSnapshot } from '../../world/worldTerrainRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { CITY_01_MAP_CONFIG } from '../layout/MapConfig.js';
import {
  getTerrainLayoutStyle,
  resolveTerrainLayoutKind,
} from '../layout/terrainLayoutPalette.js';
import {
  ensureGroundPlaceholderTexture,
  ensurePlaceholderTexture,
} from '../layout/phaserDrawPlaceholder.js';
import { PlaceholderType } from '../../world/placeholderRenderer.js';
import {
  mountPhaserLayoutRoots,
  queueTerrainLayoutPreloads,
  type PhaserLayoutImage,
  type PhaserLayoutRectangle,
  type PhaserLayoutRoots,
  type PhaserLayoutScene,
} from '../layout/phaserLayoutScene.js';
import {
  PHASER_GROUND_DEPTH,
} from '../layout/phaserWorldDepth.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import {
  isRegistryAssetRenderable,
  positionRegistryTileAtCorner,
  queueTilesetAtlasPreload,
  tryCreateRegistrySprite,
} from '../assets/phaserAssetRegistry.js';

function groundTileTextureKey(tileId: GroundTileId): string {
  return `altercadia-ground-${tileId}`;
}

function tileInstanceKey(tile: WorldTerrainTileSnapshot): string {
  return `${tile.worldX}:${tile.worldY}:${tile.size}`;
}

function resolveTerrainAssetKey(tile: WorldTerrainTileSnapshot): string | null {
  if (tile.groundTileId) {
    return resolveAssetId(tile.groundTileId);
  }
  return resolveAssetId(tile.placeholderType);
}

function tryRegisterLegacyGroundTexture(
  textures: PhaserLayoutScene['textures'],
  tileId: GroundTileId,
): string | null {
  const key = groundTileTextureKey(tileId);
  if (textures.exists(key)) {
    return key;
  }

  const cached = getCachedGroundTile(tileId);
  if (!cached || cached.naturalWidth <= 0) {
    return null;
  }

  textures.addImage(key, cached);
  try {
    textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return key;
}

type TerrainTileNode = {
  layoutRect: PhaserLayoutRectangle | null;
  assetSprite: PhaserLayoutImage | null;
};

/**
 * Camada 0 — terreno via atlas (`AssetRegistry.get`) com fallback para tiles legados.
 */
export class PhaserTerrainController {
  private readonly nodes = new Map<string, TerrainTileNode>();

  private scene: PhaserLayoutScene | null = null;

  private roots: PhaserLayoutRoots | null = null;

  private hasRenderedTiles = false;

  mount(scene: PhaserLayoutScene): void {
    this.scene = scene;
    this.roots = mountPhaserLayoutRoots(scene);
  }

  getLayoutRoots(): PhaserLayoutRoots | null {
    return this.roots;
  }

  isActive(): boolean {
    return this.hasRenderedTiles;
  }

  sync(tiles: readonly WorldTerrainTileSnapshot[]): void {
    const scene = this.scene;
    const container = this.roots?.mapContainer;
    if (!scene || !container) return;

    const seen = new Set<string>();
    this.hasRenderedTiles = tiles.length > 0;

    for (const tile of tiles) {
      const key = tileInstanceKey(tile);
      seen.add(key);
      this.ensureAndUpdate(scene, container, tile, key);
    }

    for (const [key, node] of this.nodes) {
      if (seen.has(key)) continue;
      node.layoutRect?.destroy();
      node.assetSprite?.destroy();
      this.nodes.delete(key);
    }
  }

  destroy(): void {
    for (const node of this.nodes.values()) {
      node.layoutRect?.destroy();
      node.assetSprite?.destroy();
    }
    this.nodes.clear();
    this.roots?.worldRoot.destroy();
    this.roots = null;
    this.scene = null;
    this.hasRenderedTiles = false;
  }

  private ensureAndUpdate(
    scene: PhaserLayoutScene,
    container: PhaserLayoutRoots['mapContainer'],
    tile: WorldTerrainTileSnapshot,
    instanceKey: string,
  ): void {
    let node = this.nodes.get(instanceKey);
    if (!node) {
      node = { layoutRect: null, assetSprite: null };
      this.nodes.set(instanceKey, node);
    }

    const assetKey = resolveTerrainAssetKey(tile);
    const asset = assetKey ? getRegistryAsset(assetKey) : null;
    const registryReady = assetKey !== null
      && asset !== null
      && isRegistryAssetRenderable(scene.textures, assetKey);

    if (assetKey && asset && !registryReady && asset.source === 'file') {
      void preloadRegistryFileAsset(assetKey);
    }

    if (registryReady && assetKey && asset) {
      if (!node.assetSprite) {
        const created = tryCreateRegistrySprite(scene, assetKey);
        if (!created) return;
        created.sprite.setDepth(PHASER_GROUND_DEPTH);
        container.add(created.sprite);
        node.assetSprite = created.sprite;
      }

      node.layoutRect?.setVisible(false);
      positionRegistryTileAtCorner(
        node.assetSprite,
        asset,
        tile.worldX,
        tile.worldY,
        tile.size,
      );
      node.assetSprite.setVisible(true);
      return;
    }

    if (tile.groundTileId) {
      const textureKey = tryRegisterLegacyGroundTexture(scene.textures, tile.groundTileId);
      if (textureKey) {
        const cached = getCachedGroundTile(tile.groundTileId);
        const sourceW = cached?.naturalWidth ?? GAME_CONFIG.TILE_SIZE;
        const sourceH = cached?.naturalHeight ?? GAME_CONFIG.TILE_SIZE;

        if (!node.assetSprite) {
          const sprite = scene.add.image(tile.worldX, tile.worldY, textureKey);
          sprite.setOrigin(0, 0);
          sprite.setDepth(PHASER_GROUND_DEPTH);
          container.add(sprite);
          node.assetSprite = sprite;
        }

        node.layoutRect?.setVisible(false);
        node.assetSprite.setPosition(Math.floor(tile.worldX), Math.floor(tile.worldY));
        normalizePhaserAsset(
          node.assetSprite,
          sourceW,
          sourceH,
          tile.size,
          tile.size,
          `${tile.groundTileId}.png`,
        );
        node.assetSprite.setVisible(true);
        return;
      }
    }

    const layoutKind = resolveTerrainLayoutKind(tile.placeholderType);
    const isStairTile = tile.placeholderType === PlaceholderType.ARENA_STEP
      || tile.placeholderType === PlaceholderType.TOWER_STEP;
    const textureKey = isStairTile
      ? ensurePlaceholderTexture(scene.textures, 'stairs', tile.size, tile.size)
      : ensureGroundPlaceholderTexture(scene.textures, layoutKind, tile.size);

    if (textureKey) {
      if (!node.assetSprite) {
        const sprite = scene.add.image(tile.worldX, tile.worldY, textureKey);
        sprite.setOrigin(0, 0);
        sprite.setDepth(PHASER_GROUND_DEPTH);
        container.add(sprite);
        node.assetSprite = sprite;
      }

      node.layoutRect?.setVisible(false);
      node.assetSprite.setPosition(Math.floor(tile.worldX), Math.floor(tile.worldY));
      node.assetSprite.setDisplaySize(tile.size, tile.size);
      node.assetSprite.setVisible(true);
      return;
    }

    const style = getTerrainLayoutStyle(layoutKind);
    if (!node.layoutRect) {
      const layoutRect = scene.add.rectangle(
        tile.worldX + tile.size / 2,
        tile.worldY + tile.size / 2,
        tile.size,
        tile.size,
        style.fill,
      );
      layoutRect.setOrigin(0.5, 0.5);
      layoutRect.setStrokeStyle(1, style.stroke, style.alpha);
      layoutRect.setDepth(PHASER_GROUND_DEPTH);
      container.add(layoutRect);
      node.layoutRect = layoutRect;
    }

    node.assetSprite?.setVisible(false);
    node.layoutRect.setPosition(tile.worldX + tile.size / 2, tile.worldY + tile.size / 2);
    node.layoutRect.setSize(tile.size, tile.size);
    node.layoutRect.setFillStyle(style.fill, style.alpha);
    node.layoutRect.setStrokeStyle(1, style.stroke, style.alpha);
    node.layoutRect.setVisible(true);
  }
}

/** preload() — atlas único + manifest legado. */
export function queueGroundTilePreloads(scene: PhaserLayoutScene): void {
  queueTilesetAtlasPreload(scene);
  queueTerrainLayoutPreloads(scene, CITY_01_MAP_CONFIG.terrainAssets);
}

/** Aquece cache HTMLImage do atlas e tiles legados. */
export function preloadLegacyGroundTileCache(): void {
  void preloadTilesetAtlas();
  for (const descriptor of CITY_01_MAP_CONFIG.terrainAssets) {
    if (!descriptor.groundTileId) continue;
    void preloadGroundTile(descriptor.groundTileId);
  }
}
