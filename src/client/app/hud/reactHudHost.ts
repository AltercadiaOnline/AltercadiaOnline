import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { ensureClientArchitectureRoots, syncReactScreenShellVisibility } from '../shell/clientArchitecture.js';
import {
  enableReactAuthScreen,
  enableReactCharSelectScreen,
} from '../shell/screenSurface.js';

/**
 * Host leve para montagem React — reserva superfícies e ativa auth/char select React.
 */
export function initReactHudHost(root: ParentNode = document): void {
  enableReactAuthScreen();
  enableReactCharSelectScreen();

  const { screenRoot, hudRoot, overlayRoot } = ensureClientArchitectureRoots(root);  const bridge = getGameUiBridge();

  bridge.setMode('react-hybrid');
  bridge.mountSurface('screen');
  bridge.mountSurface('hud');
  bridge.mountSurface('overlay');

  screenRoot.dataset.reactHost = 'ready';
  hudRoot.dataset.reactHost = 'ready';
  overlayRoot.dataset.reactHost = 'ready';

  syncReactScreenShellVisibility('login-screen');
}
