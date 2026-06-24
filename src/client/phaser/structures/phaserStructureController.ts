import {
  resolveTrimmedAssetSourceRect,
} from '../../entities/player/playerSpriteSourceTrim.js';
import {
  getCachedWorldAssetImage,
  preloadWorldAssetImage,
  WORLD_ASSET_IMAGE_URLS,
} from '../../world/worldAssetImageLoader.js';
import type { WorldActorRenderSnapshot } from '../../world/worldActorsRenderSnapshot.js';
import type { WorldStructureRenderSnapshot } from '../../world/worldStructureRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
import { CITY_01_MAP_CONFIG } from '../layout/MapConfig.js';
import {
  createDebugLabelStyle,
  mountPhaserLayoutRoots,
  queueStructureLayoutPreloads,
  type PhaserLayoutImage,
  type PhaserLayoutRectangle,
  type PhaserLayoutRoots,
  type PhaserLayoutScene,
  type PhaserLayoutText,
} from '../layout/phaserLayoutScene.js';
import {
  resolveActorDebugColors,
  resolveActorDebugLabel,
  resolveStructureDebugColors,
  resolveStructureDebugLabel,
} from '../layout/structureDebugLabels.js';

const STRUCTURE_TRIM = {
  top: 0.02,
  bottom: 0.02,
  left: 0.02,
  right: 0.02,
} as const;

function structureTextureKey(assetKey: string): string {
  return `altercadia-structure-${assetKey}`;
}

type StructureDebugNode = {
  readonly debugSquare: PhaserLayoutRectangle;
  readonly label: PhaserLayoutText;
  assetSprite: PhaserLayoutImage | null;
};

type ActorDebugNode = {
  readonly marker: PhaserLayoutRectangle;
  readonly label: PhaserLayoutText;
};

function tryRegisterStructureTexture(
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

/**
 * Estruturas, portais e marcadores de atores — espelha snapshots do ExplorationScene.
 *
 * **Layout base:** quadrados de debug + labels (ex.: "Loja NPC", "Spawn Criatura").
 * **Arte final:** PNG em `public/assets/structures/` — ver `MapConfig.structureAssets`.
 */
export class PhaserStructureController {
  private readonly structureNodes = new Map<string, StructureDebugNode>();

  private readonly actorNodes = new Map<string, ActorDebugNode>();

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
    const structuresContainer = this.roots?.structuresContainer;
    const actorsContainer = this.roots?.actorsContainer;
    if (!scene || !structuresContainer || !actorsContainer) return;

    void timestampMs;

    const seenStructures = new Set<string>();
    this.hasRenderedStructures = structures.length > 0 || actors.length > 0;

    for (const snapshot of structures) {
      seenStructures.add(snapshot.instanceKey);
      this.ensureStructureNode(scene, structuresContainer, snapshot);
    }

    for (const [key, node] of this.structureNodes) {
      if (seenStructures.has(key)) continue;
      node.debugSquare.destroy();
      node.label.destroy();
      node.assetSprite?.destroy();
      this.structureNodes.delete(key);
    }

    const seenActors = new Set<string>();
    for (const actor of actors) {
      const actorKey = actor.kind === 'npc'
        ? `npc:${actor.npcId}`
        : `creature:${actor.instanceId}`;
      seenActors.add(actorKey);
      this.ensureActorNode(scene, actorsContainer, actor, actorKey);
    }

    for (const [key, node] of this.actorNodes) {
      if (seenActors.has(key)) continue;
      node.marker.destroy();
      node.label.destroy();
      this.actorNodes.delete(key);
    }
  }

  destroy(): void {
    for (const node of this.structureNodes.values()) {
      node.debugSquare.destroy();
      node.label.destroy();
      node.assetSprite?.destroy();
    }
    this.structureNodes.clear();

    for (const node of this.actorNodes.values()) {
      node.marker.destroy();
      node.label.destroy();
    }
    this.actorNodes.clear();

    if (!this.roots) {
      this.scene = null;
      this.hasRenderedStructures = false;
      return;
    }

    this.roots = null;
    this.scene = null;
    this.hasRenderedStructures = false;
  }

  private ensureStructureNode(
    scene: PhaserLayoutScene,
    container: PhaserLayoutRoots['structuresContainer'],
    snapshot: WorldStructureRenderSnapshot,
  ): void {
    let node = this.structureNodes.get(snapshot.instanceKey);
    const colors = resolveStructureDebugColors(snapshot);
    const labelText = resolveStructureDebugLabel(snapshot);

    if (!node) {
      const debugSquare = scene.add.rectangle(
        snapshot.worldX + snapshot.widthPx / 2,
        snapshot.worldY + snapshot.heightPx / 2,
        snapshot.widthPx,
        snapshot.heightPx,
        colors.fill,
      );
      debugSquare.setOrigin(0.5, 0.5);
      debugSquare.setStrokeStyle(2, colors.stroke, 0.95);
      debugSquare.setDepth(Math.floor(snapshot.depthY));

      const label = scene.add.text(
        snapshot.worldX + 4,
        snapshot.worldY + 4,
        labelText,
        createDebugLabelStyle(),
      );
      label.setOrigin(0, 0);
      label.setDepth(Math.floor(snapshot.depthY) + 1);

      container.add(debugSquare);
      container.add(label);

      node = { debugSquare, label, assetSprite: null };
      this.structureNodes.set(snapshot.instanceKey, node);
    }

    node.label.setText(labelText);
    node.debugSquare.setPosition(
      snapshot.worldX + snapshot.widthPx / 2,
      snapshot.worldY + snapshot.heightPx / 2,
    );
    node.debugSquare.setSize(snapshot.widthPx, snapshot.heightPx);
    node.debugSquare.setFillStyle(colors.fill, 0.88);
    node.debugSquare.setStrokeStyle(2, colors.stroke, 0.95);
    node.debugSquare.setDepth(Math.floor(snapshot.depthY));
    node.label.setPosition(snapshot.worldX + 4, snapshot.worldY + 4);
    node.label.setDepth(Math.floor(snapshot.depthY) + 1);

    if (snapshot.kind === 'portal') {
      node.assetSprite?.setVisible(false);
      node.debugSquare.setVisible(true);
      node.label.setVisible(true);
      return;
    }

    const png = tryRegisterStructureTexture(scene.textures, snapshot.assetKey);
    if (png.ready && png.trimmed) {
      // —— Game Designer: PNG de estrutura — oculta debug square, usa sprite ——
      const textureKey = structureTextureKey(snapshot.assetKey);
      if (!node.assetSprite) {
        const sprite = scene.add.image(0, 0, textureKey);
        container.add(sprite);
        node.assetSprite = sprite;
      }

      const feetX = snapshot.worldX + snapshot.widthPx / 2;
      const feetY = snapshot.worldY + snapshot.heightPx;
      node.assetSprite.setOrigin(0.5, 1);
      node.assetSprite.setCrop(
        png.trimmed.sx,
        png.trimmed.sy,
        png.trimmed.sw,
        png.trimmed.sh,
      );
      node.assetSprite.setPosition(Math.floor(feetX), Math.floor(feetY));
      node.assetSprite.setDepth(Math.floor(snapshot.depthY));
      node.assetSprite.setVisible(true);
      node.debugSquare.setVisible(false);
      node.label.setVisible(false);
      return;
    }

    node.assetSprite?.setVisible(false);
    node.debugSquare.setVisible(true);
    node.label.setVisible(true);
  }

  private ensureActorNode(
    scene: PhaserLayoutScene,
    container: PhaserLayoutRoots['actorsContainer'],
    actor: WorldActorRenderSnapshot,
    actorKey: string,
  ): void {
    let node = this.actorNodes.get(actorKey);
    const colors = resolveActorDebugColors(actor);
    const labelText = resolveActorDebugLabel(actor);

    const size = actor.kind === 'npc' ? 22 : 18;
    const x = actor.kind === 'npc' ? actor.feetX : actor.feetX;
    const y = actor.kind === 'npc' ? actor.feetY - actor.drawHeight : actor.feetY - size;

    if (!node) {
      const marker = scene.add.rectangle(x, y, size, size, colors.fill);
      marker.setOrigin(0.5, 1);
      marker.setStrokeStyle(2, colors.stroke, 0.95);
      marker.setDepth(Math.floor(actor.depthY));

      const label = scene.add.text(x, y - size - 4, labelText, createDebugLabelStyle());
      label.setOrigin(0.5, 1);
      label.setDepth(Math.floor(actor.depthY) + 1);

      container.add(marker);
      container.add(label);

      node = { marker, label };
      this.actorNodes.set(actorKey, node);
    }

    node.marker.setPosition(x, y);
    node.marker.setDepth(Math.floor(actor.depthY));
    node.label.setText(labelText);
    node.label.setPosition(x, y - size - 4);
    node.label.setDepth(Math.floor(actor.depthY) + 1);
    node.marker.setVisible(true);
    node.label.setVisible(true);
  }
}

/** preload() — chaves de estrutura via MapConfig + registry legado. */
export function queueStructurePreloads(scene: PhaserLayoutScene): void {
  queueStructureLayoutPreloads(scene, CITY_01_MAP_CONFIG.structureAssets);
  for (const [assetKey, url] of Object.entries(WORLD_ASSET_IMAGE_URLS)) {
    if (!url) continue;
    scene.load.image(structureTextureKey(assetKey), url);
    void preloadWorldAssetImage(assetKey);
  }
}
