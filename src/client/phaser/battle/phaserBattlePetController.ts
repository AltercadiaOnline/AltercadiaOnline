import type { PetColorId } from '../../../shared/pet/petColorPalette.js';
import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import type { BattlePetRenderSnapshot } from '../../app/bridge/battleRenderBridge.js';
import { renderPetPortrait } from '../../entities/pet/petRenderer.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';

const PET_TEXTURE_PREFIX = 'battle-phaser-pet';
const PET_DISPLAY_SIZE = 52;

type PhaserPetImage = {
  setPosition: (x: number, y: number) => PhaserPetImage;
  setOrigin: (x: number, y: number) => PhaserPetImage;
  setDepth: (depth: number) => PhaserPetImage;
  setDisplaySize: (width: number, height: number) => PhaserPetImage;
  setVisible: (visible: boolean) => PhaserPetImage;
  destroy: () => void;
};

type PhaserPetScene = {
  textures: {
    exists: (key: string) => boolean;
    addCanvas: (key: string, canvas: HTMLCanvasElement) => unknown;
    get: (key: string) => { setFilter: (mode: number) => void };
  };
  add: {
    image: (x: number, y: number, textureKey: string) => PhaserPetImage;
  };
};

export class PhaserBattlePetController {
  private scene: PhaserPetScene | null = null;

  private sprite: PhaserPetImage | null = null;

  private lastSignature: string | null = null;

  mount(scene: PhaserPetScene): void {
    this.scene = scene;
  }

  applyPet(pet: BattlePetRenderSnapshot): void {
    if (!this.scene) return;

    if (!pet.visible || !pet.kindId || !pet.colorId) {
      this.sprite?.setVisible(false);
      return;
    }

    const signature = `${pet.kindId}:${pet.colorId}`;
    const textureKey = `${PET_TEXTURE_PREFIX}:${signature}`;
    if (signature !== this.lastSignature || !this.scene.textures.exists(textureKey)) {
      this.refreshTexture(textureKey, pet.kindId as PetKindId, pet.colorId as PetColorId);
      this.lastSignature = signature;
    }

    if (!this.sprite) {
      this.sprite = this.scene.add.image(0, 0, textureKey);
      this.sprite.setOrigin(0.5, 1);
      this.sprite.setDisplaySize(PET_DISPLAY_SIZE, PET_DISPLAY_SIZE);
      this.sprite.setDepth(BATTLE_PHASER_ARENA_LAYOUT.fighterDepth - 1);
    }

    const x = BATTLE_PHASER_ARENA_LAYOUT.allyPlatformX - 58;
    const y = BATTLE_PHASER_ARENA_LAYOUT.platformBaseY - 8;
    this.sprite.setPosition(x, y);
    this.sprite.setVisible(true);
  }

  destroy(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.scene = null;
    this.lastSignature = null;
  }

  private refreshTexture(textureKey: string, kindId: PetKindId, colorId: PetColorId): void {
    if (!this.scene) return;

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderPetPortrait(ctx, kindId, colorId, 96);
    this.scene.textures.addCanvas(textureKey, canvas);
    try {
      this.scene.textures.get(textureKey).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
    } catch {
      /* noop */
    }

    this.sprite?.destroy();
    this.sprite = null;
  }
}
