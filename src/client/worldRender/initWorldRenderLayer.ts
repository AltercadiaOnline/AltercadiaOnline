import { getGameUiBridge } from '../app/bridge/gameUiBridge.js';
import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
import { shutdownWorldRender } from './bootOnlineWorldRender.js';

let teardownUiModeListener: (() => void) | null = null;

/**
 * Prepara camada de render de mundo (Construct).
 * Boot real ocorre em bootOnlineWorldRender() ao entrar no mundo.
 */
export function initWorldRenderLayer(): void {
  teardownWorldRenderLayer();

  document.body.dataset.worldRenderReady = '1';

  const bridge = getRenderLayerBridge();
  bridge.setRenderEngine('construct');
  bridge.setUiRuntimeMode(getGameUiBridge().snapshot().mode);

  teardownUiModeListener = getGameUiBridge().subscribe((snapshot) => {
    getRenderLayerBridge().setUiRuntimeMode(snapshot.mode);
  });

  getRenderLayerBridge().subscribe((snapshot) => {
    document.body.dataset.renderEngine = snapshot.renderEngine;
  });
}

export function teardownWorldRenderLayer(): void {
  teardownUiModeListener?.();
  teardownUiModeListener = null;
  shutdownWorldRender();
  delete document.body.dataset.worldRenderReady;
  delete document.body.dataset.renderEngine;
}
