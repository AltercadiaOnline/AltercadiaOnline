import type { GroundTileId } from '../../../assets/terrain/groundTileManifest.js';
import {
  GROUND_TILE_IMAGE_URLS,
  GROUND_TILE_SPECS,
} from '../../../assets/terrain/groundTileManifest.js';
import {
  getCachedGroundTile,
  preloadGroundTile,
} from '../../world/groundTileImageLoader.js';
import type { WorldTerrainTileSnapshot } from '../../world/worldTerrainRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { CITY_01_MAP_CONFIG } from '../layout/MapConfig.js';
import {
  mountPhaserLayoutRoots,
  queueTerrainLayoutPreloads,
  type PhaserLayoutImage,
  type PhaserLayoutRectangle,
  type PhaserLayoutRoots,
  type PhaserLayoutScene,
} from '../layout/phaserLayoutScene.js';
import {
  getTerrainLayoutStyle,
  resolveTerrainLayoutKind,
} from '../layout/terrainLayoutPalette.js';

function groundTileTextureKey(tileId: GroundTileId): string {
  return `altercadia-ground-${tileId}`;
}

function tileInstanceKey(tile: WorldTerrainTileSnapshot): string {
  return `${tile.worldX}:${tile.worldY}:${tile.size}`;
}

type TerrainTileNode = {
  layoutRect: PhaserLayoutRectangle;
  assetSprite: PhaserLayoutImage | null;
};

function tryRegisterGroundTexture(
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

/**
 * Camada 0 — terreno espelhando `terrainTiles` do ExplorationScene.
 *
 * **Layout base:** retângulos coloridos por tipo (rua, praça, comercial, água…).
 * **Arte final:** quando `groundTileId` tiver PNG em `public/assets/terrain/`,
 * troca automaticamente para `scene.add.image` — ver `MapConfig.terrainAssets`.
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
      node.layoutRect.destroy();
      node.assetSprite?.destroy();
      this.nodes.delete(key);
    }
  }

  destroy(): void {
    for (const node of this.nodes.values()) {
      node.layoutRect.destroy();
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
      const layoutKind = resolveTerrainLayoutKind(tile.placeholderType);
      const style = getTerrainLayoutStyle(layoutKind);
      const layoutRect = scene.add.rectangle(
        tile.worldX + tile.size / 2,
        tile.worldY + tile.size / 2,
        tile.size,
        tile.size,
        style.fill,
      );
      layoutRect.setOrigin(0.5, 0.5);
      layoutRect.setStrokeStyle(1, style.stroke, style.alpha);
      layoutRect.setDepth(0);
      container.add(layoutRect);

      node = { layoutRect, assetSprite: null };
      this.nodes.set(instanceKey, node);
    }

    const layoutKind = resolveTerrainLayoutKind(tile.placeholderType);
    const style = getTerrainLayoutStyle(layoutKind);
    node.layoutRect.setPosition(tile.worldX + tile.size / 2, tile.worldY + tile.size / 2);
    node.layoutRect.setSize(tile.size, tile.size);
    node.layoutRect.setFillStyle(style.fill, style.alpha);
    node.layoutRect.setStrokeStyle(1, style.stroke, style.alpha);

    const textureKey = tile.groundTileId
      ? tryRegisterGroundTexture(scene.textures, tile.groundTileId)
      : null;

    if (textureKey) {
      // —— Game Designer: PNG de terreno carregado — oculta placeholder, usa pixel art ——
      if (!node.assetSprite) {
        const sprite = scene.add.image(tile.worldX, tile.worldY, textureKey);
        sprite.setOrigin(0, 0);
        sprite.setDepth(1);
        container.add(sprite);
        node.assetSprite = sprite;
      }

      node.assetSprite.setPosition(Math.floor(tile.worldX), Math.floor(tile.worldY));
      node.assetSprite.setDisplaySize(tile.size, tile.size);
      node.assetSprite.setVisible(true);
      node.layoutRect.setVisible(false);
      return;
    }

    node.assetSprite?.setVisible(false);
    node.layoutRect.setVisible(true);
  }
}

/** preload() — chaves de terreno via MapConfig + manifest legado. */
export function queueGroundTilePreloads(scene: PhaserLayoutScene): void {
  queueTerrainLayoutPreloads(scene, CITY_01_MAP_CONFIG.terrainAssets);
  for (const spec of GROUND_TILE_SPECS) {
    scene.load.image(groundTileTextureKey(spec.id), GROUND_TILE_IMAGE_URLS[spec.id]);
  }
}

/** Aquece cache HTMLImage para promote rápido em textura Phaser. */
export function preloadLegacyGroundTileCache(): void {
  for (const spec of GROUND_TILE_SPECS) {
    void preloadGroundTile(spec.id);
  }
}
