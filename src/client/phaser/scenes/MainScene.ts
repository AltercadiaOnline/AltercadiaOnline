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
  setZoom: (zoom: number) => void;
  setRoundPixels?: (value: boolean) => void;
};

type PhaserLoaderFile = {
  readonly key?: string;
  readonly src?: string;
  readonly url?: string;
};

type PhaserSceneLoader = {
  on: (event: 'fileerror' | 'progress', callback: (...args: unknown[]) => void) => void;
};

/** Superfície mínima de Phaser.Scene usada pelas cenas de mundo. */
export type PhaserWorldSceneBase = {
  preload: () => void;
  create: () => void;
  update: (time: number, delta: number) => void;
  load: PhaserSceneLoader & {
    tilemapTiledJSON: (key: string, url: string) => void;
    image: (key: string, url: string) => void;
    spritesheet: (
      key: string,
      url: string,
      frameConfig: {
        readonly frameWidth: number;
        readonly frameHeight: number;
        readonly margin?: number;
        readonly spacing?: number;
      },
    ) => void;
  };
  make: {
    tilemap: (config: { key: string }) => {
      readonly widthInPixels: number;
      readonly heightInPixels: number;
      destroy: () => void;
    };
  };
  textures: {
    exists: (key: string) => boolean;
  };
  events: {
    on: (event: string, callback: () => void) => void;
  };
  add: {
    graphics: () => PhaserSceneGraphics;
    container: (x: number, y: number) => {
      add: (child: unknown) => unknown;
      setDepth: (depth: number) => unknown;
      destroy: () => void;
    };
  };
  cameras: {
    main: PhaserSceneCamera;
  };
};

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => Record<string, unknown>;
};

function resolveLoaderFile(args: readonly unknown[]): PhaserLoaderFile {
  const [first, second] = args;
  if (second && typeof second === 'object') return second as PhaserLoaderFile;
  if (first && typeof first === 'object') return first as PhaserLoaderFile;
  return {};
}

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
      const scene = this as unknown as PhaserWorldSceneBase;
      scene.load.on('fileerror', (...args: unknown[]) => {
        const file = resolveLoaderFile(args);
        console.error('ERRO AO CARREGAR:', file.key, 'Caminho:', file.src ?? file.url);
      });
      scene.load.on('progress', (value: unknown) => {
        const progress = typeof value === 'number' ? value : 0;
        console.log('Progresso do loading:', progress * 100, '%');
      });
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
