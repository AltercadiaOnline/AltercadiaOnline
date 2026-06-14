import {
  hidePauseMenu,
  isInActiveGameSession,
  isPauseMenuOpen,
  showPauseMenu,
} from '../components/pauseMenu.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { getPortalModal } from './components/PortalModal.js';
import { uiEvents, UIEventType } from './uiEvents.js';
import { getWindowManager } from './WindowManager.js';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isExplorationEscapeContext(): boolean {
  if (!isInActiveGameSession()) return false;

  const gameContainer = document.getElementById('game-container');
  if (!gameContainer || gameContainer.style.display === 'none') return false;

  if (isPauseMenuOpen()) return true;

  try {
    return getGameStateManager().isExploration();
  } catch {
    return false;
  }
}

/**
 * ESC na exploração: fecha overlays/HUDs antes do menu de sair do jogo.
 * Retorna true se a tecla foi consumida (impede movimento / parada de emergência).
 */
export function handleExplorationEscapeKey(event: KeyboardEvent): boolean {
  if (event.key !== 'Escape') return false;
  if (!isExplorationEscapeContext()) return false;
  if (isTypingTarget(event.target)) return false;

  if (isPauseMenuOpen()) {
    hidePauseMenu();
    syncPauseMenuAria(true);
    return true;
  }

  const portal = getPortalModal();
  if (portal?.isOpen()) {
    uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});
    return true;
  }

  const manager = getWindowManager();
  if (manager?.closeTopmostOpenMovableWindow()) {
    return true;
  }

  showPauseMenu();
  syncPauseMenuAria(false);
  return true;
}

function syncPauseMenuAria(hidden: boolean): void {
  const menu = document.getElementById('pause-menu');
  if (!menu) return;
  menu.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}
