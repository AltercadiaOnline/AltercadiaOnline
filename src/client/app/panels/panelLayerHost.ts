// @ts-nocheck
import { isReactGamePanelsEnabled } from '../bridge/panelsBridge.js';
import { CLIENT_ROOT_IDS } from '../shell/clientArchitecture.js';
import { resolveGameUiLayer } from '../../layout/gameLayout.js';
export const UI_PANELS_REACT_HOST_ID = 'ui-panels-react-host';
/** Cria a camada de painéis legados dentro do root React — idempotente. */
export function ensureReactUiPanelsHost() {
    const hudRoot = document.getElementById(CLIENT_ROOT_IDS.hudRoot);
    if (!hudRoot) {
        throw new Error('[panels] #game-react-hud-root ausente — monte a arquitetura híbrida primeiro.');
    }
    let host = hudRoot.querySelector(`#${UI_PANELS_REACT_HOST_ID}`);
    if (!host) {
        host = document.createElement('div');
        host.id = UI_PANELS_REACT_HOST_ID;
        host.className = 'ui-panels-react-host ui-layer';
        host.setAttribute('aria-label', 'Camada de painéis');
        hudRoot.appendChild(host);
    }
    return host;
}
/** Destino de montagem dos painéis HUD — React host ou #ui-layer legado. */
export function resolvePanelMountLayer(root = document) {
    if (isReactGamePanelsEnabled()) {
        return ensureReactUiPanelsHost();
    }
    return resolveGameUiLayer(root);
}
