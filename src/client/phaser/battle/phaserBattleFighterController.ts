import type { BattleFighterRenderSlot } from '../../app/bridge/battleRenderBridge.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { ensureBattleSpriteTexture } from './phaserBattleTextureLoader.js';

type PhaserBattleFighterImage = {
  setPosition: (x: number, y: number) => PhaserBattleFighterImage;
  setOrigin: (x: number, y: number) => PhaserBattleFighterImage;
  setDepth: (depth: number) => PhaserBattleFighterImage;
  setDisplaySize: (width: number, height: number) => PhaserBattleFighterImage;
  setVisible: (visible: boolean) => PhaserBattleFighterImage;
  width: number;
  height: number;
  destroy: () => void;
};

type PhaserBattleFighterScene = {
  textures: Parameters<typeof ensureBattleSpriteTexture>[0];
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserBattleFighterImage;
  };
};

export class PhaserBattleFighterController {
  private scene: PhaserBattleFighterScene | null = null;

  private sprite: PhaserBattleFighterImage | null = null;

  private boundTextureKey: string | null = null;

  constructor(
    private readonly side: 'ally' | 'foe',
    private readonly anchorX: number,
    private readonly anchorY: number,
  ) {}

  mount(scene: PhaserBattleFighterScene): void {
    this.scene = scene;
  }

  async applySlot(slot: BattleFighterRenderSlot): Promise<void> {
    if (!this.scene) return;

    if (!slot.spriteSrc) {
      this.sprite?.setVisible(false);
      return;
    }

    const textureKey = await ensureBattleSpriteTexture(
      this.scene.textures,
      slot.spriteSrc,
      slot.spriteSrcFallbacks,
    );

    if (!textureKey) {
      this.sprite?.setVisible(false);
      return;
    }

    if (!this.sprite || this.boundTextureKey !== textureKey) {
      this.sprite?.destroy();
      this.sprite = this.scene.add.image(this.anchorX, this.anchorY, textureKey);
      this.sprite.setOrigin(0.5, 1);
      this.boundTextureKey = textureKey;
    }

    this.fitSpriteToArena(this.sprite);
    this.sprite.setPosition(this.anchorX, this.anchorY);
    this.sprite.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth);
    this.sprite.setVisible(true);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.boundTextureKey = null;
    this.scene = null;
  }

  private fitSpriteToArena(sprite: PhaserBattleFighterImage): void {
    const maxHeight = BATTLE_PHASER_ARENA_LAYOUT.fighterMaxHeight;
    const naturalHeight = sprite.height;
    const naturalWidth = sprite.width;
    if (naturalHeight <= 0 || naturalWidth <= 0) return;

    const scale = Math.min(1, maxHeight / naturalHeight);
    sprite.setDisplaySize(
      Math.round(naturalWidth * scale),
      Math.round(naturalHeight * scale),
    );
  }
}
