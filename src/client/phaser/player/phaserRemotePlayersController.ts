import type { MapId } from '../../../shared/world/mapRegistry.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import {
  ensureTextureOrPlaceholder,
  type PhaserPlaceholderTextures,
} from '../assets/phaserPlaceholderTexture.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import type { PhaserLayoutContainer } from '../layout/phaserLayoutScene.js';
import type { RemoteEntityDisplayState } from '../../world/remoteEntityInterpolator.js';
import { sampleRemoteEntitiesForRender } from '../../world/remoteEntitySyncBridge.js';
import { PhaserActorSpritePool } from './phaserActorSpritePool.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from './phaserPlayerAssets.js';

type PhaserRemotePlayerImage = {
  setPosition: (x: number, y: number) => PhaserRemotePlayerImage;
  setOrigin: (x: number, y: number) => PhaserRemotePlayerImage;
  setDepth: (depth: number) => PhaserRemotePlayerImage;
  setAlpha: (alpha: number) => PhaserRemotePlayerImage;
  setDisplaySize: (width: number, height: number) => PhaserRemotePlayerImage;
  setVisible: (visible: boolean) => PhaserRemotePlayerImage;
  setTint?: (color: number) => PhaserRemotePlayerImage;
  clearTint?: () => PhaserRemotePlayerImage;
  destroy: () => void;
};

type PhaserRemotePlayerScene = {
  textures: PhaserPlaceholderTextures;
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserRemotePlayerImage;
  };
};

const REMOTE_PLAYER_TEXTURE_KEY = 'altercadia-remote-player';

function ensureRemotePlayerTexture(textures: PhaserPlaceholderTextures): string | null {
  return ensureTextureOrPlaceholder(
    textures,
    REMOTE_PLAYER_TEXTURE_KEY,
    'remote-player',
    'player',
    GAME_ASSET_TARGETS.player.width,
    GAME_ASSET_TARGETS.player.height,
  );
}

/**
 * Renderiza jogadores remotos interpolados — aguarda `nearbyPlayers` no state-sync.
 */
export class PhaserRemotePlayersController {
  private readonly sprites = new Map<string, PhaserRemotePlayerImage>();

  private readonly pool = new PhaserActorSpritePool<PhaserRemotePlayerImage>();

  private scene: PhaserRemotePlayerScene | null = null;

  private ySortContainer: PhaserLayoutContainer | null = null;

  private boundMapId: MapId | null = null;

  mount(
    scene: PhaserRemotePlayerScene,
    mapId: MapId,
    ySortContainer?: PhaserLayoutContainer | null,
  ): void {
    this.scene = scene;
    this.boundMapId = mapId;
    this.ySortContainer = ySortContainer ?? null;
    ensureRemotePlayerTexture(scene.textures);
  }

  sync(mapId: MapId, timestampMs: number): void {
    const scene = this.scene;
    if (!scene || this.boundMapId !== mapId) return;

    const textureKey = ensureRemotePlayerTexture(scene.textures);
    if (!textureKey) return;

    const states = sampleRemoteEntitiesForRender(mapId, timestampMs);
    const seen = new Set<string>();

    for (const state of states) {
      seen.add(state.entityId);
      this.applyState(scene, textureKey, state);
    }

    for (const [entityId, sprite] of this.sprites) {
      if (seen.has(entityId)) continue;
      this.pool.release(sprite);
      this.sprites.delete(entityId);
    }
  }

  destroy(): void {
    for (const sprite of this.sprites.values()) {
      sprite.destroy();
    }
    this.sprites.clear();
    this.pool.drain();
    this.scene = null;
    this.ySortContainer = null;
    this.boundMapId = null;
  }

  private applyState(
    scene: PhaserRemotePlayerScene,
    textureKey: string,
    state: RemoteEntityDisplayState,
  ): void {
    let sprite = this.sprites.get(state.entityId);
    if (!sprite) {
      sprite = this.pool.acquire(() => scene.add.image(0, 0, textureKey));
      sprite.setOrigin(0.5, 1);
      this.ySortContainer?.add(sprite);
      this.sprites.set(state.entityId, sprite);
      try {
        scene.textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
      } catch {
        /* noop */
      }
    }

    normalizePhaserAsset(
      sprite,
      GAME_ASSET_TARGETS.player.width,
      GAME_ASSET_TARGETS.player.height,
      GAME_ASSET_TARGETS.player.width,
      GAME_ASSET_TARGETS.player.height,
      'remote-player.png',
    );
    sprite.setPosition(Math.floor(state.feetX), Math.floor(state.feetY));
    sprite.setDepth(resolvePhaserWorldDepth(state.feetY));
    sprite.setAlpha(0.92);
    sprite.setTint?.(0xa8d4ff);
    sprite.setVisible(true);
  }
}
