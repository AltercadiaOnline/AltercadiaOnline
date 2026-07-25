// @ts-nocheck
import { closeReactMovablePanel, focusReactMovablePanel, isReactMovablePanelEnabled, openReactMovablePanel, } from './reactMovablePanelBridge.js';
/** Bypass padrão — monta só no host React; abre/fecha via store. */
export function bindReactWorldPanelLegacyBypass(panel, windowId) {
    const mountImpl = panel.mount.bind(panel);
    const openImpl = panel.open.bind(panel);
    const closeImpl = panel.close.bind(panel);
    const focusImpl = panel.focus.bind(panel);
    panel.mount = (parent) => {
        if (isReactMovablePanelEnabled() && parent.id === 'ui-layer')
            return;
        mountImpl(parent);
    };
    panel.open = () => {
        if (openReactMovablePanel(panel, windowId))
            return;
        openImpl();
    };
    panel.close = () => {
        if (closeReactMovablePanel(panel, windowId))
            return;
        closeImpl();
    };
    panel.focus = () => {
        if (focusReactMovablePanel(panel, windowId))
            return;
        focusImpl();
    };
}
