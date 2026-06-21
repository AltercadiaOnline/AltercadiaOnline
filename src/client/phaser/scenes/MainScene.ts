import { PHASER_MAIN_SCENE_KEY } from '../PhaserConfig.js';

export type PhaserSceneGraphics = {
  clear: () => PhaserSceneGraphics;
  fillStyle: (color: number, alpha?: number) => PhaserSceneGraphics;
  fillRect: (x: number, y: number, width: number, height: number) => PhaserSceneGraphics;
  fillCircle: (x: number, y: number, radius: number) => PhaserSceneGraphics;
  lineStyle: (lineWidth: number, color: number, alpha?: number) => PhaserSceneGraphics;
  strokeRect: (x: number, y: number, width: number, height: number) => PhaserSceneGraphics;
  setDepth: (depth: number) => PhaserSceneGraphics;
  destroy: () => void;
};

export type PhaserSceneCamera = {
  setBounds: (x: number, y: number, width: number, height: number) => void;
  setScroll: (x: number, y: number) => void;
};

/** Superfície mínima de Phaser.Scene usada pelas cenas de mundo. */
export type PhaserWorldSceneBase = {
  preload: () => void;
  create: () => void;
  update: (time: number, delta: number) => void;
  events: {
    on: (event: string, callback: () => void) => void;
  };
  add: {
    graphics: () => PhaserSceneGraphics;
  };
  cameras: {
    main: PhaserSceneCamera;
  };
};

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => Record<string, unknown>;
};

/**
 * Esqueleto base — somente mundo (física, colisão, sprites).
 * HUD, texto e barras ficam na camada React acima do canvas.
 */
export function createMainSceneClass(
  Phaser: PhaserNamespace,
): new (sceneKey?: string) => PhaserWorldSceneBase {
  const { Scene } = Phaser;

  class MainScene extends Scene {
    constructor(sceneKey: string = PHASER_MAIN_SCENE_KEY) {
      super(sceneKey);
    }

    preload(): void {
      this.onMainPreload();
    }

    create(): void {
      this.onMainCreate();
    }

    update(time: number, delta: number): void {
      this.onMainUpdate(time, delta);
    }

    onMainPreload(): void {}

    onMainCreate(): void {}

    onMainUpdate(_time: number, _delta: number): void {}
  }

  return MainScene as unknown as new (sceneKey?: string) => PhaserWorldSceneBase;
}
