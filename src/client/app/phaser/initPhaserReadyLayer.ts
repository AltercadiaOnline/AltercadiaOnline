import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import {
  getRenderLayerBridge,
  isPhaserRenderEngineActive,
} from '../bridge/renderLayerBridge.js';
import { ensurePhaserRuntimeForCurrentEngine } from '../../phaser/PhaserRuntime.js';

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
 * Boot Phaser ao entrar no mundo — canvas legado segue visível até a cena estar pronta.
 * Retorna false se o runtime falhar (fallback automático para canvas).
 */
export async function bootOnlinePhaserExploration(): Promise<boolean> {
  if (!isPhaserRenderEngineActive()) {
    enablePhaserRenderMode();
  }

  try {
    await ensurePhaserRuntimeForCurrentEngine();
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
    void ensurePhaserRuntimeForCurrentEngine();
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

/** Ativa modo phaser-v1 — render Phaser oficial. */
export function enablePhaserRenderMode(): void {
  getGameUiBridge().setMode('phaser-v1');
}

/** @deprecated Use enablePhaserRenderMode */
export const enablePhaserHybridMode = enablePhaserRenderMode;

/** Volta ao render canvas legado (somente dev). */
export function disablePhaserRenderMode(): void {
  getGameUiBridge().setMode('online-react-v1');
}

/** @deprecated Use disablePhaserRenderMode */
export const disablePhaserHybridMode = disablePhaserRenderMode;
