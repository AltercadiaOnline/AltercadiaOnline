// @ts-nocheck
import { PlayerSpriteLoader } from '../../entities/player/PlayerSpriteLoader.js';
import { resolveSheetSourceRect } from '../../entities/player/playerConfig.js';
import { resolveTrimmedPlayerSourceRect } from '../../entities/player/playerSpriteSourceTrim.js';
import { ensurePlayerSheetTexture, PHASER_PLAYER_TEXTURE_KEY, resolvePlayerPhaserTextureKey, resolvePrimaryPlayerSheetUrl, } from './phaserPlayerAssets.js';
import { resolvePlayerDepthY, resolvePlayerFeetWorld, } from '../../../game/constants/GameConfig.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { ensureTextureOrPlaceholder } from '../assets/phaserPlaceholderTexture.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
const PLAYER_SPRITE_DEPTH = 0;
/**
 * Sprite do jogador no Phaser — spritesheet (recorte) ou rotações do metadata (bundle top-down).
 */
export class PhaserPlayerSpriteController {
    sprite = null;
    sheetReady = false;
    rotationMode = false;
    catalogFrameWidth = 104;
    catalogFrameHeight = 104;
    placeholderMode = false;
    queuePreload(scene) {
        scene.load.image(PHASER_PLAYER_TEXTURE_KEY, resolvePrimaryPlayerSheetUrl());
    }
    async mount(scene, ySortContainer) {
        this.placeholderMode = false;
        this.sheetReady = await ensurePlayerSheetTexture(scene.textures);
        if (!this.sheetReady) {
            const fallbackKey = ensureTextureOrPlaceholder(scene.textures, PHASER_PLAYER_TEXTURE_KEY, getActivePlayerSkinBundleId(), 'player');
            if (!fallbackKey) {
                return false;
            }
            this.sheetReady = true;
            this.placeholderMode = true;
            this.rotationMode = false;
            this.sprite?.destroy();
            this.sprite = scene.add.image(0, 0, fallbackKey);
            this.sprite.setOrigin(0.5, 1);
            this.sprite.setDepth(PLAYER_SPRITE_DEPTH);
            if (ySortContainer) {
                ySortContainer.add(this.sprite);
            }
            return true;
        }
        this.rotationMode = !scene.textures.exists(PHASER_PLAYER_TEXTURE_KEY);
        if (this.rotationMode) {
            const catalog = await PlayerSpriteLoader.getTopDownCatalog(getActivePlayerSkinBundleId());
            this.catalogFrameWidth = catalog.frameWidth;
            this.catalogFrameHeight = catalog.frameHeight;
        }
        const initialTextureKey = this.rotationMode
            ? resolvePlayerPhaserTextureKey('south')
            : PHASER_PLAYER_TEXTURE_KEY;
        this.sprite?.destroy();
        this.sprite = scene.add.image(0, 0, initialTextureKey);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(PLAYER_SPRITE_DEPTH);
        if (ySortContainer) {
            ySortContainer.add(this.sprite);
        }
        return true;
    }
    isReady() {
        return this.sheetReady && this.sprite !== null;
    }
    /** Body Arcade para `MapLoader.bindPlayerCollider`. */
    getColliderTarget() {
        return this.sprite;
    }
    enableArcadePhysics(scene) {
        if (!this.sprite || !scene.physics?.add)
            return;
        scene.physics.add.existing(this.sprite, false);
        const body = this.sprite.body;
        if (!body)
            return;
        const insetX = 8;
        const insetTop = 24;
        const bodyWidth = Math.max(1, DESIGN_CONFIG.PLAYER.WIDTH - insetX * 2);
        const bodyHeight = Math.max(1, DESIGN_CONFIG.PLAYER.HEIGHT - insetTop);
        body.setSize(bodyWidth, bodyHeight, true);
        body.setOffset(-bodyWidth / 2, -bodyHeight);
    }
    usesPlaceholder() {
        return this.placeholderMode;
    }
    applyFrame(frame) {
        if (!this.sprite)
            return;
        const { playerSprite } = frame;
        if (this.placeholderMode) {
            normalizePhaserAsset(this.sprite, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, PHASER_PLAYER_TEXTURE_KEY);
        }
        else if (this.rotationMode) {
            const textureKey = resolvePlayerPhaserTextureKey(playerSprite.direction);
            this.sprite.setTexture?.(textureKey);
            const trimmed = resolveTrimmedPlayerSourceRect(this.catalogFrameWidth, this.catalogFrameHeight);
            this.sprite.setCrop(trimmed.sx, trimmed.sy, trimmed.sw, trimmed.sh);
            normalizePhaserAsset(this.sprite, trimmed.sw, trimmed.sh, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, textureKey);
        }
        else {
            const sheetRect = resolveSheetSourceRect(playerSprite.frameIndex, playerSprite.state, playerSprite.direction);
            const trimmed = resolveTrimmedPlayerSourceRect(sheetRect.sw, sheetRect.sh);
            this.sprite.setCrop(sheetRect.sx + trimmed.sx, sheetRect.sy + trimmed.sy, trimmed.sw, trimmed.sh);
            normalizePhaserAsset(this.sprite, trimmed.sw, trimmed.sh, GAME_ASSET_TARGETS.player.width, GAME_ASSET_TARGETS.player.height, PHASER_PLAYER_TEXTURE_KEY);
        }
        const feet = resolvePlayerFeetWorld({ x: frame.playerX, y: frame.playerY });
        const feetX = Math.floor(feet.x);
        const feetY = Math.floor(feet.y);
        this.sprite.setPosition(feetX, feetY);
        this.sprite.setDepth(resolvePhaserWorldDepth(resolvePlayerDepthY(frame.playerX, frame.playerY)));
        this.sprite.setVisible(true);
    }
    destroy() {
        this.sprite?.destroy();
        this.sprite = null;
        this.sheetReady = false;
        this.rotationMode = false;
        this.placeholderMode = false;
    }
}
