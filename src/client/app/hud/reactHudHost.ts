import { CLIENT_ARCHITECTURE_VERSION } from '../shell/uiLayers.js';
import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { ensureClientArchitectureRoots, syncReactScreenShellVisibility } from '../shell/clientArchitecture.js';
import { showScreen } from '../../navigation.js';

/** Boot oficial online-react-v1 — reserva roots React e ativa superfícies screen/hud/overlay. */
export function initReactHudHost(root: ParentNode = document): void {
  const { screenRoot, hudRoot, overlayRoot } = ensureClientArchitectureRoots(root);
  const bridge = getGameUiBridge();

  bridge.setMode(CLIENT_ARCHITECTURE_VERSION);
  bridge.mountSurface('screen');
  bridge.mountSurface('hud');
  bridge.mountSurface('overlay');

  screenRoot.dataset.reactHost = 'ready';
  hudRoot.dataset.reactHost = 'ready';
  overlayRoot.dataset.reactHost = 'ready';

  showScreen('login-screen');
}
