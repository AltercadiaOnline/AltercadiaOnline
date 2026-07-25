// @ts-nocheck
import { resolveDayNightOverlay } from '../../shared/world/gameTime.js';
import { getGameTimeStore } from './gameTimeStore.js';
const OVERLAY_ID = 'global-light-overlay';
function applyOverlayStyle(element, gameHour) {
    const style = resolveDayNightOverlay(gameHour);
    element.style.opacity = String(style.opacity);
    element.style.backgroundColor = style.backgroundColor;
}
/**
 * Overlay de luz global — espelha gameTime do servidor com transição CSS suave.
 */
export function mountGlobalLightOverlay() {
    const container = document.getElementById('game-stage');
    if (!container) {
        throw new Error('[GlobalLightOverlay] #game-stage não encontrado.');
    }
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'global-light-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        container.appendChild(overlay);
    }
    const element = overlay;
    applyOverlayStyle(element, getGameTimeStore().getSnapshot().gameHour);
    const unsubscribe = getGameTimeStore().subscribe((snapshot) => {
        applyOverlayStyle(element, snapshot.gameHour);
    });
    return {
        destroy: () => {
            unsubscribe();
            element.remove();
        },
    };
}
