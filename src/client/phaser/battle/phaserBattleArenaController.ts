import type { BattleRenderFrame } from '../../app/bridge/battleRenderBridge.js';
import type { PhaserSceneGraphics } from '../scenes/MainScene.js';
import { BATTLE_PHASER_ARENA_LAYOUT } from './battlePhaserArenaLayout.js';
import { PhaserBattleCombatFxController } from './phaserBattleCombatFxController.js';
import { PhaserBattleFighterController } from './phaserBattleFighterController.js';
import { PhaserBattlePetController } from './phaserBattlePetController.js';
import {
  PhaserBattleVfxController,
  registerPhaserBattleVfxController,
} from './phaserBattleVfxController.js';
import { clearBattleTextureImageCache } from './phaserBattleTextureLoader.js';

type PhaserBattleArenaScene = {
  textures: Parameters<typeof import('./phaserBattleTextureLoader.js').ensureBattleSpriteTexture>[0];
  add: {
    graphics: () => PhaserSceneGraphics;
    image: (
      x: number,
      y: number,
      textureKey: string,
    ) => {
      setPosition: (x: number, y: number) => unknown;
      setOrigin: (x: number, y: number) => unknown;
      setDepth: (depth: number) => unknown;
      setDisplaySize: (width: number, height: number) => unknown;
      setVisible: (visible: boolean) => unknown;
      width: number;
      height: number;
      destroy: () => void;
    };
    text?: (
      x: number,
      y: number,
      content: string,
      style?: Record<string, unknown>,
    ) => unknown;
  };
};

/** Chão, plataformas, sprites, vitals, projéteis e FX da arena Phaser. */
export class PhaserBattleArenaController {
  private scene: PhaserBattleArenaScene | null = null;

  private readonly allyFighter: PhaserBattleFighterController;

  private readonly foeFighter: PhaserBattleFighterController;

  private readonly pet = new PhaserBattlePetController();

  private readonly combatFx = new PhaserBattleCombatFxController();

  private readonly vfx = new PhaserBattleVfxController();

  private staticLayers: PhaserSceneGraphics[] = [];

  private lastFrame: BattleRenderFrame | null = null;

  private pendingApply: Promise<void> = Promise.resolve();

  constructor() {
    const layout = BATTLE_PHASER_ARENA_LAYOUT;
    this.allyFighter = new PhaserBattleFighterController(
      'ally',
      layout.allyPlatformX,
      layout.platformBaseY,
    );
    this.foeFighter = new PhaserBattleFighterController(
      'foe',
      layout.foePlatformX,
      layout.platformBaseY,
    );
  }

  mount(scene: PhaserBattleArenaScene): void {
    this.scene = scene;
    this.allyFighter.mount(scene as never);
    this.foeFighter.mount(scene as never);
    this.pet.mount(scene as never);
    this.combatFx.mount(scene);
    this.vfx.mount(scene as never);
    registerPhaserBattleVfxController(this.vfx);
    this.paintStaticArena(scene);
    if (this.lastFrame) {
      void this.applyFrame(this.lastFrame);
    }
  }

  applyFrame(frame: BattleRenderFrame): void {
    this.lastFrame = frame;
    this.pendingApply = this.pendingApply
      .then(async () => {
        await this.allyFighter.applySlot(frame.ally);
        await this.foeFighter.applySlot(frame.foe);
        this.pet.applyPet(frame.pet);
        this.combatFx.applyCues(frame.allyCue, frame.foeCue);
      })
      .catch((error) => {
        console.warn('[PhaserBattleArena] Falha ao aplicar frame:', error);
      });
  }

  destroy(): void {
    for (const layer of this.staticLayers) {
      layer.destroy();
    }
    this.staticLayers = [];
    this.allyFighter.destroy();
    this.foeFighter.destroy();
    this.pet.destroy();
    this.combatFx.destroy();
    this.vfx.destroy();
    registerPhaserBattleVfxController(null);
    this.scene = null;
    this.lastFrame = null;
    clearBattleTextureImageCache();
  }

  private paintStaticArena(scene: PhaserBattleArenaScene): void {
    const {
      width,
      height,
      floorTopY,
      allyPlatformX,
      foePlatformX,
      platformBaseY,
      platformEllipseWidth,
      floorDepth,
      ambientDepth,
      platformDepth,
    } = BATTLE_PHASER_ARENA_LAYOUT;

    const platformRadiusX = platformEllipseWidth / 2;

    const backdrop = scene.add.graphics();
    backdrop.fillStyle(0x060806, 1);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setDepth(floorDepth);

    const floor = scene.add.graphics();
    floor.fillStyle(0x081218, 0.92);
    floor.fillRect(0, floorTopY, width, height - floorTopY);
    floor.fillStyle(0x5efcff, 0.08);
    floor.fillRect(0, floorTopY, width, 2);
    floor.setDepth(floorDepth + 0.1);

    const ambient = scene.add.graphics();
    ambient.fillStyle(0x5efcff, 0.12);
    ambient.fillCircle(width * 0.2, height * 0.35, width * 0.17);
    ambient.fillStyle(0xffb347, 0.14);
    ambient.fillCircle(width * 0.78, height * 0.26, width * 0.15);
    ambient.setDepth(ambientDepth);

    const platforms = scene.add.graphics();
    for (const x of [allyPlatformX, foePlatformX]) {
      platforms.fillStyle(0x000000, 0.55);
      platforms.fillCircle(x, platformBaseY + 8, platformRadiusX * 0.85);
      platforms.fillStyle(0x5efcff, 0.22);
      platforms.fillCircle(x, platformBaseY, platformRadiusX);
      platforms.lineStyle(1, 0x82b0c4, 0.28);
      platforms.strokeRect(
        x - platformRadiusX,
        platformBaseY - 11,
        platformEllipseWidth,
        22,
      );
    }
    platforms.setDepth(platformDepth);

    this.staticLayers = [backdrop, floor, ambient, platforms];
  }
}
