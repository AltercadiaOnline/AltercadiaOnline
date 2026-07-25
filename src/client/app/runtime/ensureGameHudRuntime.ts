import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { initClientAppGameLayer } from '../bootstrap/initClientApp.js';
import { syncReactHudVisibility } from '../shell/clientArchitecture.js';
import { CLIENT_ROOT_IDS } from '../shell/uiLayers.js';
import { syncGameUiStoreFromLegacy, initGameStoreBridge } from '../store/gameStoreBridge.js';
import { useGameStore } from '../store/gameStore.js';
import { getRegisteredHudRuntimeApi } from './uiRuntimeApi.js';
import { initTooltip } from '../../ui/components/Tooltip.js';

function resolveHudRuntimeHost(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${CLIENT_ROOT_IDS.hudRoot}`);
}

let hudMountPromise: Promise<void> | null = null;

/** Espelha tela ativa → Zustand + classes CSS da HUD (idempotente). */
export function syncHudRuntimeFlags(): void {
  initGameStoreBridge();

  const activeScreen = getAppScreenBridge().snapshot().activeScreen;
  const inGame = activeScreen === 'game-container';
  const combatEl = document.getElementById('scene-combat');
  const inCombat = combatEl !== null && !combatEl.classList.contains('hidden');

  useGameStore.getState().setInGame(inGame);
  useGameStore.getState().setWorldHudActive(inGame && !inCombat);
  syncReactHudVisibility(activeScreen);
  syncGameUiStoreFromLegacy();
}

/**
 * Garante HUD montada (ui-runtime) + bridges de jogo + flags inGame.
 * Seguro chamar várias vezes — reaplica sync ao entrar no mundo.
 */
export function ensureGameHudRuntime(root: ParentNode = document): Promise<void> {
  // Re-garante o tooltip após logout / destroyUiLayer (hide-only) e reentrada no mundo.
  initTooltip(document.body);

  if (hudMountPromise) {
    return hudMountPromise.then(() => {
      initClientAppGameLayer();
      syncHudRuntimeFlags();
    });
  }

  hudMountPromise = (async () => {
    const host = resolveHudRuntimeHost(root);
    if (!host) {
      throw new Error('[ensureGameHudRuntime] Root #game-react-hud-root ausente.');
    }

    const api = getRegisteredHudRuntimeApi();
    if (!api) {
      throw new Error(
        '[ensureGameHudRuntime] ui-runtime não registrou HUD API — confira /app-ui/ui-runtime.js.',
      );
    }

    api.mount(host);
    initClientAppGameLayer();
    syncHudRuntimeFlags();
  })().catch((error) => {
    hudMountPromise = null;
    throw error;
  });

  return hudMountPromise;
}

export function resetGameHudRuntimeMount(): void {
  hudMountPromise = null;
}
