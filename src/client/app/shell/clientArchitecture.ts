import { getBattleHudController } from '../battle/BattleHudController.js';
import { getHudBridge } from '../bridge/hudBridge.js';
import { getPanelsBridge } from '../bridge/panelsBridge.js';
import { getGameUiBridge } from '../bridge/gameUiBridge.js';
import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import {
  CLIENT_ARCHITECTURE_VERSION,
  CLIENT_ROOT_IDS,
  UI_LAYER_Z_INDEX,
} from './uiLayers.js';

export { CLIENT_ARCHITECTURE_VERSION, CLIENT_ROOT_IDS, UI_LAYER_Z_INDEX };

/** Front oficial online-react-v1 — sem ramo DOM legado. */
export function isOnlineReactFrontend(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.dataset.uiArchitecture === CLIENT_ARCHITECTURE_VERSION;
}

export type ClientArchitectureRoots = {
  readonly screenRoot: HTMLElement;
  readonly hudRoot: HTMLElement;
  readonly overlayRoot: HTMLElement;
  readonly renderHost: HTMLElement;
};

function requireElement(root: ParentNode, id: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`#${id}`);
  if (!element) {
    throw new Error(`[client-architecture] Root ausente: #${id}`);
  }
  return element;
}

/** Prepara pontos de montagem React + render host (canvas/Phaser). */
export function ensureClientArchitectureRoots(root: ParentNode = document): ClientArchitectureRoots {
  const body = document.body;
  body.dataset.uiArchitecture = CLIENT_ARCHITECTURE_VERSION;

  const screenRoot = requireElement(root, CLIENT_ROOT_IDS.screenRoot);
  const hudRoot = requireElement(root, CLIENT_ROOT_IDS.hudRoot);
  const overlayRoot = requireElement(root, CLIENT_ROOT_IDS.overlayRoot);
  const renderHost = requireElement(root, CLIENT_ROOT_IDS.renderHost);

  screenRoot.dataset.uiSurface = 'screen';
  hudRoot.dataset.uiSurface = 'hud';
  overlayRoot.dataset.uiSurface = 'overlay';
  renderHost.dataset.uiSurface = 'render';

  return {
    screenRoot,
    hudRoot,
    overlayRoot,
    renderHost,
  };
}

export function syncReactScreenShellVisibility(activeScreen: string): void {
  const screenRoot = document.getElementById(CLIENT_ROOT_IDS.screenRoot);
  if (!screenRoot) return;

  const visible =
    activeScreen === 'login-screen'
    || activeScreen === 'char-select-screen';

  screenRoot.classList.toggle('hidden', !visible);
  screenRoot.classList.toggle('screen-react-root--active', visible);
  screenRoot.toggleAttribute('aria-hidden', !visible);
}

function isSceneCombatVisible(): boolean {
  const combatScene = document.getElementById('scene-combat');
  return combatScene !== null && !combatScene.classList.contains('hidden');
}

function isSceneExplorationVisible(): boolean {
  const explorationScene = document.getElementById('scene-exploration');
  return explorationScene !== null && !explorationScene.classList.contains('hidden');
}

export function syncReactHudVisibility(activeScreen: string): void {
  const hudRoot = document.getElementById(CLIENT_ROOT_IDS.hudRoot);
  if (!hudRoot) return;

  const inGame = activeScreen === 'game-container';
  const hudMounted = getGameUiBridge().isSurfaceMounted('hud');
  const visible = inGame && hudMounted && isSceneExplorationVisible();

  hudRoot.classList.toggle('hidden', !inGame);
  hudRoot.classList.toggle('game-react-hud-root--active', inGame && hudMounted);
  hudRoot.toggleAttribute('aria-hidden', !inGame);

  if (hudMounted) {
    document.body.dataset.reactGameHudUi = '1';
    getHudBridge().setGameHudActive(visible);
    getPanelsBridge().setGamePanelsActive(visible);
  } else {
    delete document.body.dataset.reactGameHudUi;
  }
}

export function syncReactBattleHudVisibility(activeScreen: string): void {
  const visible = activeScreen === 'game-container' && isSceneCombatVisible();
  if (getBattleHudController().snapshot().controllerReady) {
    document.body.dataset.reactBattleHudUi = '1';
  }
  getBattleHudController().setBattleHudActive(visible);
}
