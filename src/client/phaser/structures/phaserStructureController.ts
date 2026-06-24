import { getRegistryAsset, resolveAssetId } from '../../../game/AssetRegistry.js';
import { hasRegistryAsset } from '../../../game/assetAtlasImageLoader.js';
import { preloadRegistryFileAsset } from '../../../game/registryFileImageLoader.js';
import {
  resolveTrimmedAssetSourceRect,
} from '../../entities/player/playerSpriteSourceTrim.js';
import {
  getCachedWorldAssetImage,
  preloadWorldAssetImage,
} from '../../world/worldAssetImageLoader.js';
import type { WorldActorRenderSnapshot } from '../../world/worldActorsRenderSnapshot.js';
import type { WorldStructureRenderSnapshot } from '../../world/worldStructureRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { CITY_01_MAP_CONFIG } from '../layout/MapConfig.js';
import {
  mountPhaserLayoutRoots,
  queueStructureLayoutPreloads,
  type PhaserLayoutImage,
  type PhaserLayoutRoots,
  type PhaserLayoutScene,
} from '../layout/phaserLayoutScene.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import {
  isRegistryAssetRenderable,
  positionRegistryAssetAtFeet,
  queueTilesetAtlasPreload,
  tryCreateRegistrySprite,
} from '../assets/phaserAssetRegistry.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';

const STRUCTURE_TRIM = {
  top: 0.02,
  bottom: 0.02,
  left: 0.02,
  right: 0.02,
} as const;

function structureTextureKey(assetKey: string): string {
  return `altercadia-structure-${assetKey}`;
}

type StructureNode = {
  assetSprite: PhaserLayoutImage;
  legacySprite: PhaserLayoutImage | null;
};

type ActorNode = {
  assetSprite: PhaserLayoutImage;
};

function tryRegisterLegacyStructureTexture(
  textures: PhaserLayoutScene['textures'],
  assetKey: string,
): { readonly ready: boolean; readonly trimmed: ReturnType<typeof resolveTrimmedAssetSourceRect> | null } {
  const key = structureTextureKey(assetKey);
  if (!textures.exists(key)) {
    const cached = getCachedWorldAssetImage(assetKey);
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

function resolveStructureAssetKey(snapshot: WorldStructureRenderSnapshot): string | null {
  if (snapshot.kind === 'portal') {
    return null;
  }
  return resolveAssetId(snapshot.assetKey);
}

function resolveActorAssetKey(actor: WorldActorRenderSnapshot): string | null {
  if (actor.kind !== 'npc') return null;

  const npcKey = `npc_${actor.npcId}`;
  if (hasRegistryAsset(npcKey)) {
    return resolveAssetId(npcKey);
  }
  if (hasRegistryAsset(actor.npcId)) {
    return resolveAssetId(actor.npcId);
  }
  return null;
}

/**
 * Estruturas e atores — atlas via `AssetRegistry.get()`; edifícios grandes usam PNG legado até entrarem no atlas.
 */
export class PhaserStructureController {
  private readonly structureNodes = new Map<string, StructureNode>();

  private readonly actorNodes = new Map<string, ActorNode>();

  private scene: PhaserLayoutScene | null = null;

  private roots: PhaserLayoutRoots | null = null;

  private hasRenderedStructures = false;

  mount(scene: PhaserLayoutScene, existingRoots?: PhaserLayoutRoots | null): void {
    this.scene = scene;
    this.roots = existingRoots ?? mountPhaserLayoutRoots(scene);
  }

  getLayoutRoots(): PhaserLayoutRoots | null {
    return this.roots;
  }

  isActive(): boolean {
    return this.hasRenderedStructures;
  }

  sync(
    structures: readonly WorldStructureRenderSnapshot[],
    timestampMs: number,
    actors: readonly WorldActorRenderSnapshot[] = [],
  ): void {
    const scene = this.scene;
    const ySortContainer = this.roots?.ySortContainer;
    if (!scene || !ySortContainer) return;

    void timestampMs;

    const seenStructures = new Set<string>();
    this.hasRenderedStructures = structures.length > 0 || actors.length > 0;

    for (const snapshot of structures) {
      seenStructures.add(snapshot.instanceKey);
      this.ensureStructureNode(scene, ySortContainer, snapshot);
    }

    for (const [key, node] of this.structureNodes) {
      if (seenStructures.has(key)) continue;
      node.assetSprite.destroy();
      node.legacySprite?.destroy();
      this.structureNodes.delete(key);
    }

    const seenActors = new Set<string>();
    for (const actor of actors) {
      const actorKey = actor.kind === 'npc'
        ? `npc:${actor.npcId}`
        : `creature:${actor.instanceId}`;
      seenActors.add(actorKey);
      this.ensureActorNode(scene, ySortContainer, actor, actorKey);
    }

    for (const [key, node] of this.actorNodes) {
      if (seenActors.has(key)) continue;
      node.assetSprite.destroy();
      this.actorNodes.delete(key);
    }
  }

  destroy(): void {
    for (const node of this.structureNodes.values()) {
      node.assetSprite.destroy();
      node.legacySprite?.destroy();
    }
    this.structureNodes.clear();

    for (const node of this.actorNodes.values()) {
      node.assetSprite.destroy();
    }
    this.actorNodes.clear();

    this.roots = null;
    this.scene = null;
    this.hasRenderedStructures = false;
  }

  private ensureStructureNode(
    scene: PhaserLayoutScene,
    container: PhaserLayoutRoots['ySortContainer'],
    snapshot: WorldStructureRenderSnapshot,
  ): void {
    if (snapshot.kind === 'portal') {
      return;
    }

    const registryKey = resolveStructureAssetKey(snapshot);
    const asset = registryKey ? getRegistryAsset(registryKey) : null;
    const useRegistry = registryKey !== null
      && asset !== null
      && isRegistryAssetRenderable(scene.textures, registryKey);
    const feetX = snapshot.worldX + snapshot.widthPx / 2;
    const feetY = snapshot.worldY + snapshot.heightPx;

    let node = this.structureNodes.get(snapshot.instanceKey);

    if (registryKey && asset && !useRegistry && asset.source === 'file') {
      void preloadRegistryFileAsset(registryKey);
    }

    if (useRegistry && registryKey && asset) {
      if (!node) {
        const created = tryCreateRegistrySprite(scene, registryKey);
        if (!created) return;
        container.add(created.sprite);
        node = { assetSprite: created.sprite, legacySprite: null };
        this.structureNodes.set(snapshot.instanceKey, node);
      }

      node.legacySprite?.setVisible(false);
      positionRegistryAssetAtFeet(
        node.assetSprite,
        asset,
        feetX,
        feetY,
        snapshot.widthPx,
        snapshot.heightPx,
      );
      node.assetSprite.setDepth(resolvePhaserWorldDepth(feetY));
      node.assetSprite.setVisible(true);
      return;
    }

    const legacy = tryRegisterLegacyStructureTexture(scene.textures, snapshot.assetKey);
    if (!legacy.ready || !legacy.trimmed) {
      return;
    }

    if (!node) {
      const placeholder = scene.add.image(0, 0, structureTextureKey(snapshot.assetKey));
      container.add(placeholder);
      node = { assetSprite: placeholder, legacySprite: placeholder };
      this.structureNodes.set(snapshot.instanceKey, node);
    } else if (!node.legacySprite) {
      const sprite = scene.add.image(0, 0, structureTextureKey(snapshot.assetKey));
      container.add(sprite);
      node.legacySprite = sprite;
    }

    node.assetSprite.setVisible(false);
    const sprite = node.legacySprite ?? node.assetSprite;
    sprite.setOrigin(0.5, 1);
    sprite.setCrop(
      legacy.trimmed.sx,
      legacy.trimmed.sy,
      legacy.trimmed.sw,
      legacy.trimmed.sh,
    );
    sprite.setPosition(Math.floor(feetX), Math.floor(feetY));
    normalizePhaserAsset(
      sprite,
      legacy.trimmed.sw,
      legacy.trimmed.sh,
      snapshot.widthPx,
      snapshot.heightPx,
      `${snapshot.assetKey}.png`,
    );
    sprite.setDepth(resolvePhaserWorldDepth(feetY));
    sprite.setVisible(true);
  }

  private ensureActorNode(
    scene: PhaserLayoutScene,
    container: PhaserLayoutRoots['ySortContainer'],
    actor: WorldActorRenderSnapshot,
    actorKey: string,
  ): void {
    if (actor.kind !== 'npc') {
      return;
    }

    const assetKey = resolveActorAssetKey(actor);
    const asset = assetKey ? getRegistryAsset(assetKey) : null;
    if (!assetKey || !asset || !isRegistryAssetRenderable(scene.textures, assetKey)) {
      if (assetKey && asset?.source === 'file') {
        void preloadRegistryFileAsset(assetKey);
      }
      return;
    }

    let node = this.actorNodes.get(actorKey);
    if (!node) {
      const created = tryCreateRegistrySprite(scene, assetKey);
      if (!created) return;

      container.add(created.sprite);
      node = { assetSprite: created.sprite };
      this.actorNodes.set(actorKey, node);
    }

    const targetW = GAME_ASSET_TARGETS.npc.width;
    const targetH = GAME_ASSET_TARGETS.npc.height;
    positionRegistryAssetAtFeet(
      node.assetSprite,
      asset,
      actor.feetX,
      actor.feetY,
      targetW,
      targetH,
    );
    node.assetSprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
    node.assetSprite.setVisible(true);
  }
}

/** preload() — atlas + PNGs legados de estruturas grandes. */
export function queueStructurePreloads(scene: PhaserLayoutScene): void {
  queueTilesetAtlasPreload(scene);
  queueStructureLayoutPreloads(scene, CITY_01_MAP_CONFIG.structureAssets);
  for (const descriptor of CITY_01_MAP_CONFIG.structureAssets) {
    const assetKey = descriptor.key.replace('altercadia-structure-', '');
    scene.load.image(descriptor.key, descriptor.path);
    void preloadWorldAssetImage(assetKey);
  }
}
