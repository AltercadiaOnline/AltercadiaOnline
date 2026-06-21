import {
  hidePauseMenu,
  isInActiveGameSession,
  isPauseMenuOpen,
  showPauseMenu,
} from '../components/pauseMenu.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { getPortalModal } from './components/PortalModal.js';
import { uiEvents, UIEventType } from './uiEvents.js';
import { closeTopmostWorldWindow } from '../app/panels/worldWindowController.js';

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
    return true;
  }

  const portal = getPortalModal();
  if (portal?.isOpen()) {
    uiEvents.emit(UIEventType.HIDE_PORTAL_CONFIRMATION, {});
    return true;
  }

  if (closeTopmostWorldWindow()) {
    return true;
  }

  showPauseMenu();
  return true;
}
