import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { getRenderLayerBridge } from '../bridge/renderLayerBridge.js';
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

export function maybeEnablePhaserHybridFromDevFlags(): void {
  if (isPhaserHybridDevRequested()) {
    enablePhaserHybridMode();
  }
}

/** Ativa Phaser no fluxo online (WebSocket autoritativo conectado). */
export function enablePhaserHybridForOnlineSession(): void {
  enablePhaserHybridMode();
}

/**
 * Prepara camada de render Phaser sem ativar por padrão (canvas legado permanece ativo).
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

  maybeEnablePhaserHybridFromDevFlags();
}

export function teardownPhaserReadyLayer(): void {
  teardownUiModeListener?.();
  teardownUiModeListener = null;
  delete document.body.dataset.phaserReady;
  delete document.body.dataset.renderEngine;
}

/** Ativa modo phaser-hybrid — canvas legado oculto; loop de simulação permanece ativo. */
export function enablePhaserHybridMode(): void {
  getGameUiBridge().setMode('phaser-hybrid');
}

/** Volta ao render canvas legado mantendo UI React. */
export function disablePhaserHybridMode(): void {
  getGameUiBridge().setMode('react-hybrid');
}
