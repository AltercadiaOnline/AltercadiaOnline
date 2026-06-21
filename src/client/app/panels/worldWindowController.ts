import { isMarketTerminalAccessGranted } from '../../../shared/economy/marketAccessGate.js';
import { uiEvents, UIEventType, type UiWindowId } from '../../ui/uiEvents.js';
import { getPanelsBridge } from '../bridge/panelsBridge.js';
import { isReactManagedWorldPanel } from './worldPanelRegistry.js';
import { useWorldPanelsStore } from '../store/worldPanelsStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';

function canOpenMarket(windowId: UiWindowId): boolean {
  if (windowId !== 'market') return true;
  return isMarketTerminalAccessGranted();
}

function isWorldWindowOpen(windowId: UiWindowId): boolean {
  const state = useWorldPanelsStore.getState();
  if (windowId === 'hub') return state.hubOpen;
  return state.openPanels.some((panel) => panel.windowId === windowId);
}

export function openWorldWindow(
  windowId: UiWindowId,
  context?: WorldPanelContext,
): boolean {
  if (!isReactManagedWorldPanel(windowId)) return false;
  if (!canOpenMarket(windowId)) return false;

  if (isWorldWindowOpen(windowId)) {
    return focusWorldWindow(windowId);
  }

  useWorldPanelsStore.getState().openPanel(windowId, context);
  getPanelsBridge().notifyPanelOpened(windowId);
  return true;
}

export function closeWorldWindow(windowId: UiWindowId): boolean {
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().closePanel(windowId);
  getPanelsBridge().notifyPanelClosed(windowId);
  return true;
}

export function toggleWorldWindow(
  windowId: UiWindowId,
  context?: WorldPanelContext,
): boolean {
  if (!isReactManagedWorldPanel(windowId)) return false;

  if (isWorldWindowOpen(windowId)) {
    return closeWorldWindow(windowId);
  }

  return openWorldWindow(windowId, context);
}

export function focusWorldWindow(windowId: UiWindowId): boolean {
  if (!isReactManagedWorldPanel(windowId)) return false;

  useWorldPanelsStore.getState().focusPanel(windowId);
  getPanelsBridge().notifyPanelFocused(windowId);
  return true;
}

/** ESC — fecha painel React com maior z-index (ou hub). */
export function closeTopmostWorldWindow(): boolean {
  const closed = useWorldPanelsStore.getState().closeTopmostPanel();
  if (!closed) return false;

  getPanelsBridge().notifyPanelClosed(closed);
  return true;
}

/** API estável para painéis, Hub e atalhos. */
export const windowManager = {
  open(windowId: UiWindowId, context?: WorldPanelContext): void {
    openWorldWindow(windowId, context);
  },

  close(windowId: UiWindowId): void {
    closeWorldWindow(windowId);
  },

  toggle(windowId: UiWindowId, context?: WorldPanelContext): void {
    toggleWorldWindow(windowId, context);
  },
};

/** Emite uiEvents quando o bridge ainda não montou listeners diretos. */
export function emitOpenWorldWindow(windowId: UiWindowId): void {
  uiEvents.emit(UIEventType.OPEN_WINDOW, { windowId });
}

export function emitCloseWorldWindow(windowId: UiWindowId): void {
  uiEvents.emit(UIEventType.CLOSE_WINDOW, { windowId });
}

export function emitToggleWorldWindow(windowId: UiWindowId): void {
  uiEvents.emit(UIEventType.TOGGLE_WINDOW, { windowId });
}
