import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { resolveSheetSourceRect } from '../../entities/player/playerConfig.js';
import { resolveTrimmedPlayerSourceRect } from '../../entities/player/playerSpriteSourceTrim.js';
import {
  ensurePlayerSheetTexture,
  PHASER_PLAYER_TEXTURE_KEY,
  resolvePrimaryPlayerSheetUrl,
} from './phaserPlayerAssets.js';

type PhaserPlayerImage = {
  setPosition: (x: number, y: number) => PhaserPlayerImage;
  setCrop: (x: number, y: number, width: number, height: number) => PhaserPlayerImage;
  setOrigin: (x: number, y: number) => PhaserPlayerImage;
  setDepth: (depth: number) => PhaserPlayerImage;
  setVisible: (visible: boolean) => PhaserPlayerImage;
  destroy: () => void;
};

type PhaserPlayerScene = {
  textures: Parameters<typeof ensurePlayerSheetTexture>[0];
  load: {
    image: (key: string, url: string) => void;
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserPlayerImage;
  };
};

const PLAYER_SPRITE_DEPTH = 20;

/**
 * Sprite do jogador no Phaser — recorte 1:1 do sheet, pés ancorados (mesmo contrato do canvas).
 */
export class PhaserPlayerSpriteController {
  private sprite: PhaserPlayerImage | null = null;

  private sheetReady = false;

  queuePreload(scene: PhaserPlayerScene): void {
    scene.load.image(PHASER_PLAYER_TEXTURE_KEY, resolvePrimaryPlayerSheetUrl());
  }

  async mount(scene: PhaserPlayerScene): Promise<boolean> {
    this.sheetReady = await ensurePlayerSheetTexture(scene.textures);
    if (!this.sheetReady) {
      return false;
    }

    this.sprite?.destroy();
    this.sprite = scene.add.image(0, 0, PHASER_PLAYER_TEXTURE_KEY);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(PLAYER_SPRITE_DEPTH);
    return true;
  }

  isReady(): boolean {
    return this.sheetReady && this.sprite !== null;
  }

  applyFrame(frame: ExplorationRenderFrame): void {
    if (!this.sprite) return;

    const { playerSprite } = frame;
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

    const feetX = Math.floor(frame.playerX);
    const feetY = Math.floor(frame.playerY);
    this.sprite.setPosition(feetX, feetY);
    this.sprite.setDepth(feetY);
    this.sprite.setVisible(true);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.sheetReady = false;
  }
}
