import {
  getRenderLayerBridge,
  resolveRenderHostElement,
} from '../app/bridge/renderLayerBridge.js';
import { buildPhaserGameConfig } from './buildPhaserGameConfig.js';
import {
  CANVAS_LEGACY_ID,
  PHASER_BATTLE_SCENE_KEY,
  PHASER_MAP_LOADING_SCENE_KEY,
  PHASER_MOUNT_ROOT_ID,
} from './PhaserConfig.js';
import { DEFAULT_MAP_ID, MAP_REGISTRY, type MapId } from '../../shared/world/mapRegistry.js';
import {
  getMapInstanceSceneManager,
  resetMapInstanceSceneManager,
} from './scenes/MapInstanceSceneManager.js';
import { createAllMapInstancePhaserScenes } from './scenes/ExplorationPhaserScene.js';
import { createLoadingPhaserScene } from './scenes/createLoadingPhaserScene.js';
import { resolveActiveMapInstanceSceneKey } from './scenes/MapInstanceSceneManager.js';

type PhaserGameInstance = {
  destroy: (removeCanvas: boolean) => void;
  scene: {
    start: (key: string, data?: Record<string, unknown>) => void;
    stop: (key: string) => void;
    getScenes?: (active?: boolean) => readonly { readonly scene: { readonly key: string } }[];
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
    const { createBattlePhaserScene } = await import('./scenes/BattlePhaserScene.js');

    const mapIds = Object.keys(MAP_REGISTRY) as MapId[];
    const mapInstanceScenes = createAllMapInstancePhaserScenes(PhaserNs as never, mapIds);
    const loadingScene = createLoadingPhaserScene(PhaserNs as never);

    const gameConfig = buildPhaserGameConfig({
      Phaser: PhaserNs,
      parent: host,
      scenes: [
        loadingScene,
        ...mapInstanceScenes,
        createBattlePhaserScene(PhaserNs as never),
      ],
    });

    activeGame = new PhaserNs.Game(gameConfig);
    applyPhaserCanvasTransparency(host);

    getMapInstanceSceneManager().init(activeGame, mapIds);
    getMapInstanceSceneManager().bootDefaultMap(DEFAULT_MAP_ID);

    getRenderLayerBridge().markPhaserBooted(true);

    const { getGameStateManager } = await import('../../shared/state/GameStateManager.js');
    const { syncPhaserSceneForGameState } = await import('./phaserSceneRouter.js');
    syncPhaserSceneForGameState(getGameStateManager().getState());

    getRenderLayerBridge().markPhaserSceneReady(true);
    setRenderHostVisibility('phaser');

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
  resetMapInstanceSceneManager();
  getRenderLayerBridge().markPhaserBooted(false);
  getRenderLayerBridge().markPhaserSceneReady(false);
  getRenderLayerBridge().setActivePhaserScene(null);
  setRenderHostVisibility('canvas-legacy');
}

/** Troca cena ativa sem destruir o Game Phaser. */
export function switchPhaserScene(sceneKey: string): void {
  if (!activeGame) return;
  activeGame.scene.start(sceneKey);
  getRenderLayerBridge().markPhaserSceneReady(true);
  const activeScene =
    sceneKey === PHASER_BATTLE_SCENE_KEY
      ? 'battle'
      : sceneKey === PHASER_MAP_LOADING_SCENE_KEY
          || sceneKey.startsWith('MapInstance:')
        ? 'exploration'
        : null;
  getRenderLayerBridge().setActivePhaserScene(activeScene);
}

/** Inicia a instância Phaser do mapa ativo (exploração). */
export function switchPhaserToActiveMapInstance(): void {
  switchPhaserScene(resolveActiveMapInstanceSceneKey());
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
