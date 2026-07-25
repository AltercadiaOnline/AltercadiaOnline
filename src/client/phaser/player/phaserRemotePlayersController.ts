// @ts-nocheck
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { ensureTextureOrPlaceholder, } from '../assets/phaserPlaceholderTexture.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import { sampleRemoteEntitiesForRender } from '../../world/remoteEntitySyncBridge.js';
import { PhaserActorSpritePool } from './phaserActorSpritePool.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from './phaserPlayerAssets.js';
const REMOTE_PLAYER_TEXTURE_KEY = 'altercadia-remote-player';
function ensureRemotePlayerTexture(textures) {
    return ensureTextureOrPlaceholder(textures, REMOTE_PLAYER_TEXTURE_KEY, 'remote-player', 'player', GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height);
}
/**
 * Renderiza jogadores remotos interpolados — aguarda `nearbyPlayers` no state-sync.
 */
export class PhaserRemotePlayersController {
    sprites = new Map();
    pool = new PhaserActorSpritePool();
    scene = null;
    ySortContainer = null;
    boundMapId = null;
    mount(scene, mapId, ySortContainer) {
        this.scene = scene;
        this.boundMapId = mapId;
        this.ySortContainer = ySortContainer ?? null;
        ensureRemotePlayerTexture(scene.textures);
    }
    sync(mapId, timestampMs) {
        const scene = this.scene;
        if (!scene || this.boundMapId !== mapId)
            return;
        const textureKey = ensureRemotePlayerTexture(scene.textures);
        if (!textureKey)
            return;
        const states = sampleRemoteEntitiesForRender(mapId, timestampMs);
        const seen = new Set();
        for (const state of states) {
            seen.add(state.entityId);
            this.applyState(scene, textureKey, state);
        }
        for (const [entityId, sprite] of this.sprites) {
            if (seen.has(entityId))
                continue;
            this.pool.release(sprite);
            this.sprites.delete(entityId);
        }
    }
    destroy() {
        for (const sprite of this.sprites.values()) {
            sprite.destroy();
        }
        this.sprites.clear();
        this.pool.drain();
        this.scene = null;
        this.ySortContainer = null;
        this.boundMapId = null;
    }
    applyState(scene, textureKey, state) {
        let sprite = this.sprites.get(state.entityId);
        if (!sprite) {
            sprite = this.pool.acquire(() => scene.add.image(0, 0, textureKey));
            sprite.setOrigin(0.5, 1);
            this.ySortContainer?.add(sprite);
            this.sprites.set(state.entityId, sprite);
            try {
                scene.textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
            }
            catch {
                /* noop */
            }
        }
        normalizePhaserAsset(sprite, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, 'remote-player.png');
        sprite.setPosition(Math.floor(state.feetX), Math.floor(state.feetY));
        sprite.setDepth(resolvePhaserWorldDepth(state.feetY));
        sprite.setAlpha(0.92);
        sprite.setTint?.(0xa8d4ff);
        sprite.setVisible(true);
    }
}
