// @ts-nocheck
import { GAME_CAMERA_SCROLL_MAX_X, GAME_CAMERA_SCROLL_MAX_Y, GAME_CONFIG, GAME_MAP_HEIGHT_PX, GAME_MAP_WIDTH_PX, } from '../../../game/constants/GameConfig.js';
/**
 * Viewport fixo 640×360 @ zoom 1 — 16×9 tiles visíveis.
 * Bounds = tamanho total do mapa em pixels (scroll clamp no follow legado).
 */
export function configureExplorationPhaserCamera(camera, mapWidthPx = GAME_MAP_WIDTH_PX, mapHeightPx = GAME_MAP_HEIGHT_PX) {
    camera.setZoom(1);
    camera.setRoundPixels?.(true);
    camera.setBounds(0, 0, mapWidthPx, mapHeightPx);
}
export function clampExplorationCameraScroll(scrollX, scrollY, mapWidthPx = GAME_MAP_WIDTH_PX, mapHeightPx = GAME_MAP_HEIGHT_PX) {
    const maxX = Math.max(0, mapWidthPx - GAME_CONFIG.VIEWPORT_WIDTH);
    const maxY = Math.max(0, mapHeightPx - GAME_CONFIG.VIEWPORT_HEIGHT);
    return {
        x: Math.max(0, Math.min(scrollX, maxX)),
        y: Math.max(0, Math.min(scrollY, maxY)),
    };
}
export const EXPLORATION_CAMERA_DESIGN_LIMITS = {
    maxScrollX: GAME_CAMERA_SCROLL_MAX_X,
    maxScrollY: GAME_CAMERA_SCROLL_MAX_Y,
    viewportWidth: GAME_CONFIG.VIEWPORT_WIDTH,
    viewportHeight: GAME_CONFIG.VIEWPORT_HEIGHT,
};
