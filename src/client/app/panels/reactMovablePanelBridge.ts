import type { UIComponent } from '../../ui/UIComponent.js';
import type { UiWindowId } from '../../ui/uiEvents.js';
import { isReactGamePanelsEnabled } from '../bridge/panelsBridge.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';
import {
  tryCloseReactWorldPanel,
  tryFocusReactWorldPanel,
  tryOpenReactWorldPanel,
} from './initWorldPanelsBridge.js';

export function openReactMovablePanel(
  _panel: UIComponent,
  windowId: UiWindowId,
  context?: WorldPanelContext,
): boolean {
  return tryOpenReactWorldPanel(windowId, context);
}

export function closeReactMovablePanel(_panel: UIComponent, windowId: UiWindowId): boolean {
  return tryCloseReactWorldPanel(windowId);
}

export function focusReactMovablePanel(_panel: UIComponent, windowId: UiWindowId): boolean {
  return tryFocusReactWorldPanel(windowId);
}

export function isReactMovablePanelEnabled(): boolean {
  return isReactGamePanelsEnabled();
}
