import { showScreen } from '../../navigation.js';
import { markAuthBootstrapPending, subscribeAuthBootstrap, getAuthBootstrapPhase } from '../../auth/authBootstrapState.js';
import { getAuthScreenController } from '../screen/authScreenController.js';
import { initClientApp } from '../bootstrap/initClientApp.js';
import { ensureClientArchitectureRoots } from '../shell/clientArchitecture.js';
import { mountOverlayRuntime } from './mountOverlayRuntime.js';
import { mountScreenRuntime } from './mountScreenRuntime.js';

/**
 * Boot React mínimo — screen (auth/char) + overlay (loading).
 * HUD in-game monta em ensureGameHudRuntime() ao entrar no mundo.
 */
export function mountReactUiRuntime(root: ParentNode = document): void {
  markAuthBootstrapPending();

  subscribeAuthBootstrap(() => {
    const pending = getAuthBootstrapPhase() === 'pending';
    getAuthScreenController().patchAuthBootstrapPending(pending);
  });

  const { screenRoot, overlayRoot } = ensureClientArchitectureRoots(root);

  initClientApp(root);

  mountScreenRuntime(screenRoot);
  mountOverlayRuntime(overlayRoot);

  // Login React visível antes do main.js — evita tela preta entre ui-runtime e bootstrap.
  showScreen('login-screen');
}

mountReactUiRuntime(document);
