import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import {
  getRenderLayerBridge,
  isPhaserRenderEngineActive,
} from '../bridge/renderLayerBridge.js';
import { bootPhaserRuntime, ensurePhaserRuntimeForCurrentEngine } from '../../phaser/PhaserRuntime.js';

const PHASER_HYBRID_QUERY = 'phaser';
const PHASER_HYBRID_STORAGE_KEY = 'altercadia.phaserHybrid';

let teardownUiModeListener: (() => void) | null = null;

/** Dev: `?phaser=1` ou `localStorage.altercadia.phaserHybrid = '1'`. */
export function isPhaserHybridDevRequested(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get(PHASER_HYBRID_QUERY) === '1') return true;
  try {
    return window.localStorage.getItem(PHASER_HYBRID_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function maybeEnablePhaserFromDevFlags(): void {
  if (isPhaserHybridDevRequested()) {
    enablePhaserRenderMode();
  }
}

/** @deprecated Use maybeEnablePhaserFromDevFlags */
export const maybeEnablePhaserHybridFromDevFlags = maybeEnablePhaserFromDevFlags;

/** Ativa motor Phaser (render oficial online). */
export function enablePhaserForOnlineSession(): void {
  enablePhaserRenderMode();
}

/**
 * Boot Phaser ao entrar no mundo — único motor de render do mapa (modo estrito).
 */
export async function bootOnlinePhaserExploration(): Promise<boolean> {
  try {
    const game = await bootPhaserRuntime();
    if (!game) return false;
  } catch (error) {
    console.error('[Phaser] Falha ao iniciar render online:', error);
    return false;
  }

  return getRenderLayerBridge().snapshot().phaserBooted;
}

/** @deprecated Use enablePhaserForOnlineSession */
export const enablePhaserHybridForOnlineSession = enablePhaserForOnlineSession;

/**
 * Prepara camada Phaser — online usa bootOnlinePhaserExploration() ao entrar no mundo.
 */
export function initPhaserReadyLayer(): void {
  teardownPhaserReadyLayer();

  document.body.dataset.phaserReady = '1';

  const bridge = getRenderLayerBridge();
  bridge.setUiRuntimeMode(getGameUiBridge().snapshot().mode);

  teardownUiModeListener = getGameUiBridge().subscribe((snapshot) => {
    getRenderLayerBridge().setUiRuntimeMode(snapshot.mode);
    void ensurePhaserRuntimeForCurrentEngine();
  });

  getRenderLayerBridge().subscribe((snapshot) => {
    if (snapshot.renderEngine === 'phaser') {
      void ensurePhaserRuntimeForCurrentEngine();
    }
    document.body.dataset.renderEngine = snapshot.renderEngine;
  });

  maybeEnablePhaserFromDevFlags();
}

export function teardownPhaserReadyLayer(): void {
  teardownUiModeListener?.();
  teardownUiModeListener = null;
  delete document.body.dataset.phaserReady;
  delete document.body.dataset.renderEngine;
}

/** Ativa render Phaser — desacoplado do modo UI React (online-react-v1). */
export function enablePhaserRenderMode(): void {
  getRenderLayerBridge().setRenderEngine('phaser');
}

/** @deprecated Use enablePhaserRenderMode */
export const enablePhaserHybridMode = enablePhaserRenderMode;

/** @deprecated Canvas legado removido — noop em produção. */
export function disablePhaserRenderMode(): void {
  getRenderLayerBridge().setRenderEngine('phaser');
}

/** @deprecated Use disablePhaserRenderMode */
export const disablePhaserHybridMode = disablePhaserRenderMode;
