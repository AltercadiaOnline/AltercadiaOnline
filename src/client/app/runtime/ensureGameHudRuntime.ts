import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { initClientAppGameLayer } from '../bootstrap/initClientApp.js';
import { syncReactHudVisibility } from '../shell/clientArchitecture.js';
import { resolveHudRuntimeHost } from './mountHudRuntime.js';

let hudMountPromise: Promise<void> | null = null;

/**
 * Monta HUD in-game (mundo + combate) sob demanda — reduz bundle inicial do login.
 * Idempotente; chamado em `initReactGameHud()` ao entrar no mundo.
 */
export function ensureGameHudRuntime(root: ParentNode = document): Promise<void> {
  if (hudMountPromise) {
    return hudMountPromise;
  }

  hudMountPromise = (async () => {
    initClientAppGameLayer();

    const { mountHudRuntime } = await import('./mountHudRuntime.js');
    const host = resolveHudRuntimeHost(root);
    if (!host) {
      throw new Error('[ensureGameHudRuntime] Root #game-react-hud-root ausente.');
    }

    mountHudRuntime(host);
    syncReactHudVisibility(getAppScreenBridge().snapshot().activeScreen);
  })().catch((error) => {
    hudMountPromise = null;
    throw error;
  });

  return hudMountPromise;
}

export function resetGameHudRuntimeMount(): void {
  hudMountPromise = null;
}
