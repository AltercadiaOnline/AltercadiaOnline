import { showScreen } from '../../navigation.js';
import { subscribeAuthBootstrap, getAuthBootstrapPhase } from '../../auth/authBootstrapState.js';
import { getAuthScreenController } from '../screen/authScreenController.js';
import { initClientApp } from '../bootstrap/initClientApp.js';
import { initGameStoreBridge } from '../store/gameStoreBridge.js';
import { ensureClientArchitectureRoots } from '../shell/clientArchitecture.js';
import { CLIENT_ROOT_IDS } from '../shell/uiLayers.js';
import { initTooltip } from '../../ui/components/Tooltip.js';
import { mountOverlayRuntime } from './mountOverlayRuntime.js';
import { mountScreenRuntime } from './mountScreenRuntime.js';
import { mountHudRuntime, unmountHudRuntime } from './mountHudRuntime.js';
import { registerHudRuntimeApi } from './uiRuntimeApi.js';

/**
 * Boot React único — screen + overlay + HUD (árvore montada; visível só em game-container).
 * Ponte Zustand cedo: inGame acompanha showScreen sem esperar enterWorld.
 */
export function mountReactUiRuntime(root: ParentNode = document): void {
  // Tooltip no body antes de qualquer hover na HUD React (ui-runtime carrega antes do main.js).
  initTooltip(document.body);

  registerHudRuntimeApi({
    mount: mountHudRuntime,
    unmount: unmountHudRuntime,
  });

  subscribeAuthBootstrap(() => {
    const pending = getAuthBootstrapPhase() === 'pending';
    getAuthScreenController().patchAuthBootstrapPending(pending);
  });

  const { screenRoot, overlayRoot, hudRoot } = ensureClientArchitectureRoots(root);

  initClientApp(root);
  initGameStoreBridge();

  mountScreenRuntime(screenRoot);
  mountOverlayRuntime(overlayRoot);
  // Monta já no boot — App fica pronta; inGame=false esconde sidebar/world até o mundo.
  mountHudRuntime(hudRoot ?? root.querySelector<HTMLElement>(`#${CLIENT_ROOT_IDS.hudRoot}`)!);

  // Login React visível antes do main.js — evita tela preta entre ui-runtime e bootstrap.
  showScreen('login-screen');
}

mountReactUiRuntime(document);
