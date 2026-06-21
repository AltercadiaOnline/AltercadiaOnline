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

let clientAppShellInitialized = false;
let clientAppGameLayerInitialized = false;

/** Bootstrap leve — roots + flags de superfície (login / overlay). */
export function initClientApp(root: ParentNode = document): boolean {
  if (clientAppShellInitialized) return false;

  ensureClientArchitectureRoots(root);

  const bridge = getGameUiBridge();
  bridge.mountSurface('screen');
  bridge.mountSurface('hud');
  bridge.mountSurface('overlay');

  clientAppShellInitialized = true;
  return true;
}

/** Bridges pesados + Phaser — só após entrar no mundo (lazy via ensureGameHudRuntime). */
export function initClientAppGameLayer(): boolean {
  if (clientAppGameLayerInitialized) return false;

  initGameStoreBridge();
  initWorldPanelsBridge();
  initPhaserReadyLayer();

  clientAppGameLayerInitialized = true;
  return true;
}

export function isClientAppInitialized(): boolean {
  return clientAppShellInitialized;
}

export function isClientAppGameLayerInitialized(): boolean {
  return clientAppGameLayerInitialized;
}

export function resetClientAppInitializedFlag(): void {
  clientAppShellInitialized = false;
  clientAppGameLayerInitialized = false;
}

/** Reset de sessão online (logout / troca de personagem) — não desmonta React roots. */
export function resetClientAppSession(): void {
  resetWorldPanelsBridgeSession();
  resetGameUiStoreSession();
}
