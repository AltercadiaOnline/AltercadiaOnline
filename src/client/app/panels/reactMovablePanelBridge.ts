// @ts-nocheck
import { isReactGamePanelsEnabled } from '../bridge/panelsBridge.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel, tryOpenReactWorldPanel, } from './initWorldPanelsBridge.js';
export function openReactMovablePanel(_panel, windowId, context) {
    return tryOpenReactWorldPanel(windowId, context);
}
export function closeReactMovablePanel(_panel, windowId) {
    return tryCloseReactWorldPanel(windowId);
}
export function focusReactMovablePanel(_panel, windowId) {
    return tryFocusReactWorldPanel(windowId);
}
export function isReactMovablePanelEnabled() {
    return isReactGamePanelsEnabled();
}
