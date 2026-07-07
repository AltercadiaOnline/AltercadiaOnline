import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { PlayerSpriteLoader } from '../../entities/player/PlayerSpriteLoader.js';
import { resolveSheetSourceRect } from '../../entities/player/playerConfig.js';
import { resolveTrimmedPlayerSourceRect } from '../../entities/player/playerSpriteSourceTrim.js';
import {
  ensurePlayerSheetTexture,
  PHASER_PLAYER_TEXTURE_KEY,
  resolvePlayerPhaserTextureKey,
  resolvePrimaryPlayerSheetUrl,
} from './phaserPlayerAssets.js';
import type { PhaserLayoutContainer } from '../layout/phaserLayoutScene.js';
import {
  resolvePlayerDepthY,
  resolvePlayerFeetWorld,
} from '../../../game/constants/GameConfig.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { normalizePhaserAsset } from '../assets/phaserAssetNormalizer.js';
import { ensureTextureOrPlaceholder } from '../assets/phaserPlaceholderTexture.js';
import { resolvePhaserWorldDepth } from '../layout/phaserWorldDepth.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';

type PhaserPlayerImage = {
  setPosition: (x: number, y: number) => PhaserPlayerImage;
  setCrop: (x: number, y: number, width: number, height: number) => PhaserPlayerImage;
  setOrigin: (x: number, y: number) => PhaserPlayerImage;
  setDepth: (depth: number) => PhaserPlayerImage;
  setDisplaySize: (width: number, height: number) => PhaserPlayerImage;
  setTexture?: (key: string) => PhaserPlayerImage;
  setTint?: (color: number) => PhaserPlayerImage;
  clearTint?: () => PhaserPlayerImage;
  setVisible: (visible: boolean) => PhaserPlayerImage;
  destroy: () => void;
};

type PhaserPlayerScene = {
  textures: Parameters<typeof ensurePlayerSheetTexture>[0] & {
    exists: (key: string) => boolean;
    addCanvas: (key: string, canvas: HTMLCanvasElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  load: {
    image: (key: string, url: string) => void;
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserPlayerImage;
  };
};

const PLAYER_SPRITE_DEPTH = 0;

/**
 * Sprite do jogador no Phaser — spritesheet (recorte) ou rotações do metadata (bundle top-down).
 */
export class PhaserPlayerSpriteController {
  private sprite: PhaserPlayerImage | null = null;

  private sheetReady = false;

  private rotationMode = false;

  private catalogFrameWidth = 104;

  private catalogFrameHeight = 104;

  private placeholderMode = false;

  queuePreload(scene: PhaserPlayerScene): void {
    scene.load.image(PHASER_PLAYER_TEXTURE_KEY, resolvePrimaryPlayerSheetUrl());
  }

  async mount(
    scene: PhaserPlayerScene,
    ySortContainer?: PhaserLayoutContainer | null,
  ): Promise<boolean> {
    this.placeholderMode = false;
    this.sheetReady = await ensurePlayerSheetTexture(scene.textures);
    if (!this.sheetReady) {
      const fallbackKey = ensureTextureOrPlaceholder(
        scene.textures,
        PHASER_PLAYER_TEXTURE_KEY,
        getActivePlayerSkinBundleId(),
        'player',
      );
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

  isReady(): boolean {
    return this.sheetReady && this.sprite !== null;
  }

  usesPlaceholder(): boolean {
    return this.placeholderMode;
  }

  applyFrame(frame: ExplorationRenderFrame): void {
    if (!this.sprite) return;

    const { playerSprite } = frame;

    if (this.placeholderMode) {
      normalizePhaserAsset(
        this.sprite,
        GAME_ASSET_TARGETS.player.width,
        GAME_ASSET_TARGETS.player.height,
        GAME_ASSET_TARGETS.player.width,
        GAME_ASSET_TARGETS.player.height,
        PHASER_PLAYER_TEXTURE_KEY,
      );
    } else if (this.rotationMode) {
      const textureKey = resolvePlayerPhaserTextureKey(playerSprite.direction);
      this.sprite.setTexture?.(textureKey);

      const trimmed = resolveTrimmedPlayerSourceRect(
        this.catalogFrameWidth,
        this.catalogFrameHeight,
      );

      this.sprite.setCrop(trimmed.sx, trimmed.sy, trimmed.sw, trimmed.sh);
      normalizePhaserAsset(
        this.sprite,
        trimmed.sw,
        trimmed.sh,
        GAME_ASSET_TARGETS.player.width,
        GAME_ASSET_TARGETS.player.height,
        textureKey,
      );
    } else {
      const sheetRect = resolveSheetSourceRect(
        playerSprite.frameIndex,
        playerSprite.state,
        playerSprite.direction,
      );
      const trimmed = resolveTrimmedPlayerSourceRect(sheetRect.sw, sheetRect.sh);

      this.sprite.setCrop(
        sheetRect.sx + trimmed.sx,
        sheetRect.sy + trimmed.sy,
        trimmed.sw,
        trimmed.sh,
      );

      normalizePhaserAsset(
        this.sprite,
        trimmed.sw,
        trimmed.sh,
        GAME_ASSET_TARGETS.player.width,
        GAME_ASSET_TARGETS.player.height,
        PHASER_PLAYER_TEXTURE_KEY,
      );
    }

    const feet = resolvePlayerFeetWorld({ x: frame.playerX, y: frame.playerY });
    const feetX = Math.floor(feet.x);
    const feetY = Math.floor(feet.y);
    this.sprite.setPosition(feetX, feetY);
    this.sprite.setDepth(resolvePhaserWorldDepth(resolvePlayerDepthY(frame.playerX, frame.playerY)));
    this.sprite.setVisible(true);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.sheetReady = false;
    this.rotationMode = false;
    this.placeholderMode = false;
  }
}
