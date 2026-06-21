import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { initPhaserReadyLayer } from '../phaser/initPhaserReadyLayer.js';
import {
  initWorldPanelsBridge,
  resetWorldPanelsBridgeSession,
} from '../panels/initWorldPanelsBridge.js';
import {
  initGameStoreBridge,
  resetGameUiStoreSession,
} from '../store/gameStoreBridge.js';
import { ensureClientArchitectureRoots } from '../shell/clientArchitecture.js';

let clientAppInitialized = false;

/**
 * Bootstrap único da camada React — bridges, stores e flags de arquitetura.
 * Montagem de roots React fica em `runtime/*Runtime.tsx`.
 */
export function initClientApp(root: ParentNode = document): boolean {
  if (clientAppInitialized) return false;

  ensureClientArchitectureRoots(root);
  initGameStoreBridge();
  initWorldPanelsBridge();
  initPhaserReadyLayer();

  const bridge = getGameUiBridge();
  bridge.mountSurface('screen');
  bridge.mountSurface('hud');
  bridge.mountSurface('overlay');

  clientAppInitialized = true;
  return true;
}

export function isClientAppInitialized(): boolean {
  return clientAppInitialized;
}

export function resetClientAppInitializedFlag(): void {
  clientAppInitialized = false;
}

/** Reset de sessão online (logout / troca de personagem) — não desmonta React roots. */
export function resetClientAppSession(): void {
  resetWorldPanelsBridgeSession();
  resetGameUiStoreSession();
}
