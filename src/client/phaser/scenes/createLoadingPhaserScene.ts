import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { PHASER_MAP_LOADING_SCENE_KEY } from '../PhaserConfig.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import type { MapTransitionPayload } from '../../../shared/world/protocol.js';
import {
  purgeMapInstanceAssets,
  queueMapInstanceAssets,
} from './mapInstanceAssetManifest.js';
import { getMapInstanceSceneManager } from './MapInstanceSceneManager.js';
import type { MapInstanceSceneInitData } from './createMapInstancePhaserScene.js';
import type { PhaserWorldSceneBase } from './MainScene.js';

type PhaserLoaderFile = {
  readonly key?: string;
  readonly src?: string;
  readonly url?: string;
};

type PhaserSceneLoader = {
  on: (event: 'fileerror' | 'progress' | 'complete', callback: (...args: unknown[]) => void) => void;
};

type PhaserLoadingScene = PhaserWorldSceneBase & {
  readonly load: PhaserWorldSceneBase['load'] & PhaserSceneLoader;
  readonly textures: {
    exists: (key: string) => boolean;
    remove: (key: string) => void;
  };
  readonly cache: {
    tilemap: {
      exists: (key: string) => boolean;
      remove: (key: string) => void;
    };
  };
  readonly add: {
    text: (
      x: number,
      y: number,
      content: string,
      style?: Record<string, unknown>,
    ) => {
      setText: (content: string) => void;
      setColor: (color: string) => void;
      destroy: () => void;
    };
    rectangle: (
      x: number,
      y: number,
      width: number,
      height: number,
      fillColor?: number,
    ) => {
      setSize: (width: number, height: number) => void;
      setOrigin: (x: number, y: number) => void;
      destroy: () => void;
    };
  };
  readonly scene: {
    start: (key: string, data?: MapInstanceSceneInitData) => void;
  };
};

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => Record<string, unknown>;
};

export type LoadingSceneInitData = {
  readonly targetScene: string;
  readonly targetMapId: MapId;
  readonly sourceMapId?: MapId | null;
  readonly spawn?: MapTransitionPayload;
};

const VIEW_W = GAME_CONFIG.VIEWPORT_WIDTH;
const VIEW_H = GAME_CONFIG.VIEWPORT_HEIGHT;
const BAR_WIDTH = 280;
const BAR_HEIGHT = 10;
const BAR_COLOR = 0x4ade80;
const BAR_BG_COLOR = 0x1e293b;

function resolveLoaderFile(args: readonly unknown[]): PhaserLoaderFile {
  const [first, second] = args;
  if (second && typeof second === 'object') return second as PhaserLoaderFile;
  if (first && typeof first === 'object') return first as PhaserLoaderFile;
  return {};
}

/**
 * Cena mediadora — carrega 100% dos assets da instância alvo antes de `scene.start(targetScene)`.
 * Limpa cache da instância anterior na entrada e bloqueia transição em caso de erro de load.
 */
export function createLoadingPhaserScene(
  Phaser: PhaserNamespace,
): new () => PhaserWorldSceneBase {
  const { Scene } = Phaser;

  class MapInstanceLoadingScene extends Scene {
    private targetScene = '';

    private targetMapId: MapId | null = null;

    private spawn: MapTransitionPayload | undefined;

    private loadFailed = false;

    private statusText: ReturnType<PhaserLoadingScene['add']['text']> | null = null;

    private progressFill: ReturnType<PhaserLoadingScene['add']['rectangle']> | null = null;

    constructor() {
      super(PHASER_MAP_LOADING_SCENE_KEY);
    }

    init(data?: LoadingSceneInitData): void {
      this.targetScene = data?.targetScene ?? '';
      this.targetMapId = data?.targetMapId ?? null;
      this.spawn = data?.spawn;
      this.loadFailed = false;
      this.statusText = null;
      this.progressFill = null;

      const scene = this as unknown as PhaserLoadingScene;
      purgeMapInstanceAssets(scene.textures, scene.cache.tilemap, data?.sourceMapId);
    }

    preload(): void {
      const scene = this as unknown as PhaserLoadingScene;

      this.mountLoadingUi(scene);

      scene.load.on('fileerror', (...args: unknown[]) => {
        this.loadFailed = true;
        const file = resolveLoaderFile(args);
        console.error(
          '[LoadingScene] Load error — asset bloqueado:',
          file.key,
          'path:',
          file.src ?? file.url,
        );
        this.statusText?.setText('Erro ao carregar mapa.');
        this.statusText?.setColor('#f87171');
      });

      scene.load.on('progress', (value: unknown) => {
        const progress = typeof value === 'number' ? Math.max(0, Math.min(1, value)) : 0;
        this.progressFill?.setSize(Math.max(1, BAR_WIDTH * progress), BAR_HEIGHT);
        const percent = Math.round(progress * 100);
        this.statusText?.setText(`Loading... ${percent}%`);
      });

      scene.load.on('complete', () => {
        if (!this.loadFailed) {
          this.statusText?.setText('Loading... 100%');
        }
      });

      if (!this.targetMapId) {
        this.loadFailed = true;
        console.error('[LoadingScene] targetMapId ausente — transição abortada.');
        return;
      }

      queueMapInstanceAssets(scene, this.targetMapId);
    }

    create(): void {
      const scene = this as unknown as PhaserLoadingScene;

      if (this.loadFailed || !this.targetScene || !this.targetMapId) {
        console.error(
          '[LoadingScene] Transição bloqueada — mapa não iniciado (assets incompletos ou parâmetros inválidos).',
        );
        this.statusText?.setText('Falha no carregamento. Recarregue a página.');
        this.statusText?.setColor('#f87171');
        return;
      }

      const initData: MapInstanceSceneInitData | undefined = this.spawn
        ? { spawn: this.spawn }
        : undefined;

      getMapInstanceSceneManager().commitTransition(this.targetMapId, this.targetScene);
      scene.scene.start(this.targetScene, initData);
    }

    private mountLoadingUi(scene: PhaserLoadingScene): void {
      const centerX = VIEW_W / 2;
      const centerY = VIEW_H / 2;
      const barLeft = centerX - BAR_WIDTH / 2;
      const barY = centerY + 18;

      scene.add.rectangle(centerX, barY, BAR_WIDTH, BAR_HEIGHT, BAR_BG_COLOR);

      this.progressFill = scene.add.rectangle(barLeft, barY, 1, BAR_HEIGHT, BAR_COLOR);
      this.progressFill.setOrigin(0, 0.5);

      this.statusText = scene.add.text(centerX, centerY - 12, 'Loading...', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#e2e8f0',
      });
    }
  }

  return MapInstanceLoadingScene as unknown as new () => PhaserWorldSceneBase;
}
