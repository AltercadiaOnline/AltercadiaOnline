import {
  getRenderLayerBridge,
  resolveRenderHostElement,
} from '../app/bridge/renderLayerBridge.js';
import { buildPhaserGameConfig } from './buildPhaserGameConfig.js';
import {
  CANVAS_LEGACY_ID,
  PHASER_EXPLORATION_SCENE_KEY,
  PHASER_MOUNT_ROOT_ID,
} from './PhaserConfig.js';

type PhaserGameInstance = {
  destroy: (removeCanvas: boolean) => void;
  scene: {
    start: (key: string) => void;
  };
};

type PhaserModule = {
  Game: new (config: Record<string, unknown>) => PhaserGameInstance;
  AUTO: number;
  Scale: {
    FIT: number;
    CENTER_BOTH: number;
  };
  Scene: new (config?: string | Record<string, unknown>) => unknown;
};

let activeGame: PhaserGameInstance | null = null;
let bootPromise: Promise<PhaserGameInstance | null> | null = null;

function setRenderHostVisibility(engine: 'canvas-legacy' | 'phaser'): void {
  const canvas = document.getElementById(CANVAS_LEGACY_ID);
  const phaserHost = document.getElementById(PHASER_MOUNT_ROOT_ID);
  const renderHost = document.getElementById('game-render-host');

  if (renderHost) {
    renderHost.dataset.renderEngine = engine;
  }

  if (canvas) {
    canvas.classList.toggle('hidden', engine === 'phaser');
    canvas.toggleAttribute('aria-hidden', engine === 'phaser');
  }

  if (phaserHost) {
    phaserHost.classList.toggle('hidden', engine !== 'phaser');
    phaserHost.toggleAttribute('aria-hidden', engine !== 'phaser');
  }
}

function applyPhaserCanvasTransparency(host: HTMLElement): void {
  const canvas = host.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return;
  canvas.style.background = 'transparent';
}

/**
 * Boot Phaser sob demanda — import dinâmico; ativado no fluxo online (phaser-hybrid).
 */
export async function bootPhaserRuntime(): Promise<PhaserGameInstance | null> {
  if (activeGame) return activeGame;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    const host = resolveRenderHostElement();
    if (host.id !== PHASER_MOUNT_ROOT_ID) {
      console.warn('[PhaserRuntime] Host Phaser ausente — abortando boot.');
      return null;
    }

    const PhaserNs = (await import('phaser')) as unknown as PhaserModule;
    const { createExplorationPhaserScene } = await import('./scenes/ExplorationPhaserScene.js');

    setRenderHostVisibility('phaser');

    const gameConfig = buildPhaserGameConfig({
      Phaser: PhaserNs,
      parent: host,
      scenes: [createExplorationPhaserScene(PhaserNs as never)],
    });

    activeGame = new PhaserNs.Game(gameConfig);
    applyPhaserCanvasTransparency(host);

    getRenderLayerBridge().markPhaserBooted(true);
    activeGame.scene.start(PHASER_EXPLORATION_SCENE_KEY);
    getRenderLayerBridge().markPhaserSceneReady(true);

    return activeGame;
  })().catch((error) => {
    console.error('[PhaserRuntime] Falha ao iniciar Phaser:', error);
    getRenderLayerBridge().markPhaserBooted(false);
    getRenderLayerBridge().markPhaserSceneReady(false);
    setRenderHostVisibility('canvas-legacy');
    return null;
  }).finally(() => {
    bootPromise = null;
  });

  return bootPromise;
}

export function shutdownPhaserRuntime(): void {
  if (activeGame) {
    activeGame.destroy(true);
    activeGame = null;
  }
  getRenderLayerBridge().markPhaserBooted(false);
  getRenderLayerBridge().markPhaserSceneReady(false);
  setRenderHostVisibility('canvas-legacy');
}

export function isPhaserRuntimeActive(): boolean {
  return activeGame !== null;
}

export async function ensurePhaserRuntimeForCurrentEngine(): Promise<void> {
  const { renderEngine } = getRenderLayerBridge().snapshot();
  if (renderEngine !== 'phaser') {
    shutdownPhaserRuntime();
    return;
  }
  await bootPhaserRuntime();
}
