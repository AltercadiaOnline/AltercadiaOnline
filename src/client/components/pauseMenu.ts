import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import {
  getPauseMenuBridge,
  type PauseMenuHandlers,
} from '../app/bridge/pauseMenuBridge.js';

export type PauseMenuOptions = PauseMenuHandlers;

export function setupPauseMenu(options: PauseMenuOptions): void {
  getPauseMenuBridge().bindHandlers(options);
}

export function togglePauseMenu(): void {
  getPauseMenuBridge().toggle();
}

export function showPauseMenu(): void {
  getPauseMenuBridge().show();
}

export function hidePauseMenu(): void {
  getPauseMenuBridge().hide();
}

export function isPauseMenuOpen(): boolean {
  return getPauseMenuBridge().isOpen();
}

let worldSessionActive = false;

/** Sessão de mundo ativa (após entrar no mapa até logout). */
export function setWorldSessionActive(active: boolean): void {
  worldSessionActive = active;
}

export function isWorldSessionActive(): boolean {
  return worldSessionActive;
}

export function isInActiveGameSession(): boolean {
  if (!worldSessionActive) return false;
  return getAppScreenBridge().snapshot().activeScreen === 'game-container';
}
