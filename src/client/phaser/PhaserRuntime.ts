import {
  getRenderLayerBridge,
  resolveRenderHostElement,
} from '../app/bridge/renderLayerBridge.js';
import {
  CANVAS_LEGACY_ID,
  PHASER_EXPLORATION_SCENE_KEY,
  PHASER_MOUNT_ROOT_ID,
  PHASER_RUNTIME_CONFIG,
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

/**
 * Boot Phaser sob demanda — import dinâmico para não inflar o bundle até ativar phaser-hybrid.
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

    const PhaserNs = (await import('phaser')) as unknown as PhaserModule & {
      Scene: new (config?: string | Record<string, unknown>) => unknown;
    };
    const { createExplorationPhaserScene } = await import('./scenes/ExplorationPhaserScene.js');

    setRenderHostVisibility('phaser');

    activeGame = new PhaserNs.Game({
      type: PhaserNs.AUTO,
      parent: host,
      width: PHASER_RUNTIME_CONFIG.width,
      height: PHASER_RUNTIME_CONFIG.height,
      backgroundColor: PHASER_RUNTIME_CONFIG.backgroundColor,
      pixelArt: PHASER_RUNTIME_CONFIG.pixelArt,
      antialias: PHASER_RUNTIME_CONFIG.antialias,
      roundPixels: PHASER_RUNTIME_CONFIG.roundPixels,
      scale: {
        mode: PhaserNs.Scale.FIT,
        autoCenter: PhaserNs.Scale.CENTER_BOTH,
      },
      scene: [createExplorationPhaserScene(PhaserNs as never)],
    });

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
