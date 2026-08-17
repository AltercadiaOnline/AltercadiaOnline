import { getAppScreenBridge } from '../app/bridge/appScreenBridge.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import { isMovementKey } from '../../shared/world/movementInput.js';
import { isPauseMenuOpen } from '../components/pauseMenu.js';
import { handleExplorationEscapeKey } from './escapeHudNavigation.js';
import { isMovementReservedKeyCode, resolveHudWindowFromKeyboard } from './keyboardShortcuts.js';
import { windowManager } from '../app/panels/worldWindowController.js';
import { dispatchPlaceSpray } from '../world/spraySocialActions.js';
import { closeSprayInspectHud, getSprayInspectHudState } from '../world/sprayInspectStore.js';
import { closePlayerInspectHud, getPlayerInspectHudState } from '../world/playerInspectStore.js';
import { getPlayerTradeHudState } from '../world/playerTradeStore.js';
import { dispatchTradeCancel } from '../world/playerInspectActions.js';

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

function isHudShortcutContextActive(): boolean {
  if (getAppScreenBridge().snapshot().activeScreen !== 'game-container') return false;
  if (isPauseMenuOpen()) return false;
  try {
    return getGameStateManager().isExploration();
  } catch {
    return false;
  }
}

/**
 * Atalhos globais de HUD (toggle). Ignora teclas de movimento (WASD, Q/E diagonais).
 */
export class KeyboardManager {
  private attached = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    if (event.key === 'Escape') {
      const tradeOpen = Boolean(getPlayerTradeHudState().snapshot);
      if (tradeOpen) {
        const tradeId = getPlayerTradeHudState().snapshot?.tradeId;
        if (tradeId) dispatchTradeCancel(tradeId);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      const sprayOpen = Boolean(getSprayInspectHudState().view);
      const playerOpen = Boolean(getPlayerInspectHudState().view);
      if (sprayOpen || playerOpen) {
        closeSprayInspectHud();
        closePlayerInspectHud();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
    }

    if (event.key === 'Escape' && handleExplorationEscapeKey(event)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }

    if (!isHudShortcutContextActive()) return;
    if (isTypingTarget(event.target)) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isMovementKey(event.key, event.code)) return;
    if (isMovementReservedKeyCode(event.code)) return;

    if (event.code === 'KeyG') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dispatchPlaceSpray();
      windowManager.close('inventory');
      return;
    }

    const windowId = resolveHudWindowFromKeyboard(event.code);
    if (!windowId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    windowManager.toggle(windowId);
  };

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown, true);
  }
}

let activeKeyboardManager: KeyboardManager | null = null;

export function initKeyboardManager(): KeyboardManager {
  if (!activeKeyboardManager) {
    activeKeyboardManager = new KeyboardManager();
  }
  activeKeyboardManager.attach();
  return activeKeyboardManager;
}

export function destroyKeyboardManager(): void {
  activeKeyboardManager?.detach();
  activeKeyboardManager = null;
}
