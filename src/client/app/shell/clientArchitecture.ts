import { getBattleHudController } from '../battle/BattleHudController.js';
import { getHudBridge } from '../bridge/hudBridge.js';
import { getPanelsBridge } from '../bridge/panelsBridge.js';
import {
  CLIENT_ARCHITECTURE_VERSION,
  CLIENT_ROOT_IDS,
  UI_LAYER_Z_INDEX,
} from './uiLayers.js';

export { CLIENT_ARCHITECTURE_VERSION, CLIENT_ROOT_IDS, UI_LAYER_Z_INDEX };

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

/** Prepara pontos de montagem React + render host (canvas/Phaser no DOM legado). */
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

  const reactAuthEnabled = document.body.dataset.reactAuthUi === '1';
  const reactCharSelectEnabled = document.body.dataset.reactCharSelectUi === '1';
  const visible =
    (reactAuthEnabled && activeScreen === 'login-screen')
    || (reactCharSelectEnabled && activeScreen === 'char-select-screen');

  screenRoot.classList.toggle('hidden', !visible);
  screenRoot.classList.toggle('screen-react-root--active', visible);
  screenRoot.toggleAttribute('aria-hidden', !visible);
}

/** @deprecated Use syncReactScreenShellVisibility */
export function syncReactAuthScreenVisibility(activeScreen: string): void {
  syncReactScreenShellVisibility(activeScreen);
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

  const reactHudEnabled = document.body.dataset.reactGameHudUi === '1';
  const inGame = activeScreen === 'game-container';
  const visible = reactHudEnabled && inGame && isSceneExplorationVisible();

  hudRoot.classList.toggle('hidden', !inGame);
  hudRoot.classList.toggle('game-react-hud-root--active', inGame);
  hudRoot.toggleAttribute('aria-hidden', !inGame);

  if (reactHudEnabled) {
    getHudBridge().setGameHudActive(visible);
    getPanelsBridge().setGamePanelsActive(visible);
  }
}

export function syncReactBattleHudVisibility(activeScreen: string): void {
  const reactBattleHudEnabled = document.body.dataset.reactBattleHudUi === '1';
  if (!reactBattleHudEnabled) return;

  const visible = activeScreen === 'game-container' && isSceneCombatVisible();
  getBattleHudController().setBattleHudActive(visible);
}
