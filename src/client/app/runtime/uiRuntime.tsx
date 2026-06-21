import { initClientApp } from '../bootstrap/initClientApp.js';
import { ensureClientArchitectureRoots } from '../shell/clientArchitecture.js';
import { mountOverlayRuntime } from './mountOverlayRuntime.js';
import { mountScreenRuntime } from './mountScreenRuntime.js';

/**
 * Boot React mínimo — screen (auth/char) + overlay (loading).
 * HUD in-game monta em ensureGameHudRuntime() ao entrar no mundo.
 */
export function mountReactUiRuntime(root: ParentNode = document): void {
  const { screenRoot, overlayRoot } = ensureClientArchitectureRoots(root);

  initClientApp(root);

  mountScreenRuntime(screenRoot);
  mountOverlayRuntime(overlayRoot);
}

mountReactUiRuntime(document);
