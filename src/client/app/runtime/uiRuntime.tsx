import { initClientApp } from '../bootstrap/initClientApp.js';
import { ensureClientArchitectureRoots } from '../shell/clientArchitecture.js';
import { mountHudRuntime } from './mountHudRuntime.js';
import { mountOverlayRuntime } from './mountOverlayRuntime.js';
import { mountScreenRuntime } from './mountScreenRuntime.js';

export function mountReactUiRuntime(root: ParentNode = document): void {
  const { screenRoot, hudRoot, overlayRoot } = ensureClientArchitectureRoots(root);

  initClientApp(root);

  mountScreenRuntime(screenRoot);
  mountHudRuntime(hudRoot);
  mountOverlayRuntime(overlayRoot);
}

mountReactUiRuntime(document);
