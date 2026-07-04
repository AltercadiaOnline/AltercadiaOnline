import { hasNpcAssetBundle } from '../../../shared/npc/npcAssetBundles.js';
import { getCreatureAssets } from '../../loaders/CreatureAssetLoader.js';
import { getCachedNpcAssetImage, preloadNpcAssetImage } from '../../loaders/npcAssetImageLoader.js';
import {
  preloadCreatureWorldSprite,
  getCachedCreatureWorldSprite,
} from '../../world/creatureWorldImageLoader.js';
import {
  resolveTrimmedAssetSourceRect,
  type AssetTrimRatios,
} from '../../entities/player/playerSpriteSourceTrim.js';
import type {
  WorldActorRenderSnapshot,
  WorldCreatureRenderSnapshot,
  WorldNpcRenderSnapshot,
} from '../../world/worldActorsRenderSnapshot.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from './phaserPlayerAssets.js';
import type { PhaserLayoutContainer } from '../layout/phaserLayoutScene.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';

const CREATURE_TRIM: AssetTrimRatios = {
  top: 0.04,
  bottom: 0.06,
  left: 0.04,
  right: 0.04,
};

type PhaserActorImage = {
  setPosition: (x: number, y: number) => PhaserActorImage;
  setCrop: (x: number, y: number, width: number, height: number) => PhaserActorImage;
  setOrigin: (x: number, y: number) => PhaserActorImage;
  setDepth: (depth: number) => PhaserActorImage;
  setAlpha: (alpha: number) => PhaserActorImage;
  setDisplaySize: (width: number, height: number) => PhaserActorImage;
  setTint?: (color: number) => PhaserActorImage;
  clearTint?: () => PhaserActorImage;
  setVisible: (visible: boolean) => PhaserActorImage;
  destroy: () => void;
};

type PhaserActorScene = {
  textures: {
    exists: (key: string) => boolean;
    addImage: (key: string, source: HTMLImageElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  load: {
    image: (key: string, url: string) => void;
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserActorImage;
  };
};

function creatureTextureKey(creatureId: string): string {
  return `altercadia-creature-${creatureId}`;
}

function npcTextureKey(npcId: string): string {
  return `altercadia-npc-${npcId}`;
}

function actorInstanceKey(actor: WorldActorRenderSnapshot): string {
  return actor.kind === 'creature' ? `c:${actor.instanceId}` : `n:${actor.npcId}`;
}

async function ensureCreatureTexture(
  textures: PhaserActorScene['textures'],
  creatureId: string,
): Promise<boolean> {
  const key = creatureTextureKey(creatureId);
  if (textures.exists(key)) {
    return true;
  }

  const image = await preloadCreatureWorldSprite(creatureId);
  const cached = image ?? getCachedCreatureWorldSprite(creatureId);
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

async function ensureNpcTexture(
  textures: PhaserActorScene['textures'],
  npcId: string,
): Promise<boolean> {
  const key = npcTextureKey(npcId);
  if (textures.exists(key)) {
    return true;
  }

  const cached = getCachedNpcAssetImage(npcId);
  if (cached?.complete && cached.naturalWidth > 0) {
    textures.addImage(key, cached);
    try {
      textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
    } catch {
      /* noop */
    }
    return true;
  }

  if (!hasNpcAssetBundle(npcId)) {
    return false;
  }

  const image = await preloadNpcAssetImage(npcId);
  if (!image || image.naturalWidth <= 0) {
    return false;
  }

  textures.addImage(key, image);
  try {
    textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
  } catch {
    /* noop */
  }
  return true;
}

/**
 * Criaturas + NPCs top-down no Phaser — Y-sort via depthY (pés no chão).
 * Combate side-view permanece em BattleSprite (fora deste módulo).
 */
export class PhaserWorldActorsController {
  private readonly sprites = new Map<string, PhaserActorImage>();

  private scene: PhaserActorScene | null = null;

  private ySortContainer: PhaserLayoutContainer | null = null;

  private hasRenderedActors = false;

  mount(scene: PhaserActorScene, ySortContainer?: PhaserLayoutContainer | null): void {
    this.scene = scene;
    this.ySortContainer = ySortContainer ?? null;
  }

  isActive(): boolean {
    return this.hasRenderedActors;
  }

  sync(actors: readonly WorldActorRenderSnapshot[]): void {
    const scene = this.scene;
    if (!scene) return;

    const seen = new Set<string>();
    this.hasRenderedActors = actors.length > 0;

    for (const actor of actors) {
      const key = actorInstanceKey(actor);
      seen.add(key);
      void this.ensureAndUpdate(scene, actor, key);
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
    this.ySortContainer = null;
    this.hasRenderedActors = false;
  }

  private async ensureAndUpdate(
    scene: PhaserActorScene,
    actor: WorldActorRenderSnapshot,
    instanceKey: string,
  ): Promise<void> {
    const ready = actor.kind === 'creature'
      ? await ensureCreatureTexture(scene.textures, actor.creatureId)
      : await ensureNpcTexture(scene.textures, actor.npcId);

    if (!ready) {
      this.sprites.get(instanceKey)?.setVisible(false);
      return;
    }

    const textureKey = actor.kind === 'creature'
      ? creatureTextureKey(actor.creatureId)
      : npcTextureKey(actor.npcId);

    let sprite = this.sprites.get(instanceKey);
    if (!sprite) {
      sprite = scene.add.image(0, 0, textureKey);
      sprite.setOrigin(0.5, 1);
      this.ySortContainer?.add(sprite);
      this.sprites.set(instanceKey, sprite);
    }

    if (actor.kind === 'creature') {
      this.applyCreature(sprite, actor);
      return;
    }

    this.applyNpc(sprite, actor);
  }

  private applyCreature(sprite: PhaserActorImage, actor: WorldCreatureRenderSnapshot): void {
    const image = getCachedCreatureWorldSprite(actor.creatureId);
    if (!image) return;

    const trimmed = resolveTrimmedAssetSourceRect(
      image.naturalWidth,
      image.naturalHeight,
      CREATURE_TRIM,
    );

    sprite.setCrop(trimmed.sx, trimmed.sy, trimmed.sw, trimmed.sh);
    sprite.setPosition(Math.floor(actor.feetX), Math.floor(actor.feetY));
    normalizePhaserAsset(
      sprite,
      trimmed.sw,
      trimmed.sh,
      GAME_ASSET_TARGETS.npc.width,
      GAME_ASSET_TARGETS.npc.height,
      `${actor.creatureId}.png`,
    );
    sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));

    if (actor.adjacent) {
      const pulse = 0.82 + Math.sin(actor.alertPulse) * 0.12;
      sprite.setAlpha(pulse);
    } else {
      sprite.setAlpha(1);
    }

    sprite.setVisible(true);
  }

  private applyNpc(sprite: PhaserActorImage, actor: WorldNpcRenderSnapshot): void {
    normalizePhaserAsset(
      sprite,
      actor.drawWidth,
      actor.drawHeight,
      GAME_ASSET_TARGETS.npc.width,
      GAME_ASSET_TARGETS.npc.height,
      `${actor.npcId}.png`,
    );
    sprite.setPosition(
      Math.floor(actor.feetX),
      Math.floor(actor.feetY + actor.bobOffset),
    );
    sprite.setDepth(resolvePhaserWorldDepth(actor.feetY));
    sprite.setAlpha(1);
    sprite.setVisible(true);
  }
}

/** Preload Phaser loader queue — criaturas top-down idle. */
export function queueCreaturePreloads(
  load: PhaserActorScene['load'],
  creatureIds: readonly string[],
): void {
  for (const creatureId of creatureIds) {
    const url = getCreatureAssets(creatureId).sprites.idle;
    load.image(creatureTextureKey(creatureId), url);
  }
}
