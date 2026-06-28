import { DESIGN_CONFIG } from '../../config/designConstants.js';

/** Fator de LERP por frame (~60fps) — 0.2 = perseguição rápida sem snap seco. */
export const CAMERA_FOLLOW_LERP = 0.2;

/** Viewport lógico fixo — 640×360 px sobre grade 40×40 @ 32px. */
export const CAMERA_VISIBLE_TILES_WIDTH = DESIGN_CONFIG.VISIBLE_TILES.WIDTH;
export const CAMERA_VISIBLE_TILES_HEIGHT = DESIGN_CONFIG.VISIBLE_TILES.HEIGHT;

export const CAMERA_VISIBLE_WORLD_WIDTH = DESIGN_CONFIG.VIEWPORT.WIDTH;
export const CAMERA_VISIBLE_WORLD_HEIGHT = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/**
 * Zoom interno sempre 1:1 — câmera e canvas fixos em 640×360 px.
 * Escala CSS (`transform: scale`) só afeta o display; o recorte da câmera não muda.
 */
export function computeCameraZoom(_viewportWidth?: number, _viewportHeight?: number): number {
  return 1;
}

/** Sem letterbox interno — recorte lógico = VIEWPORT 640×360. */
export function computeViewportLetterbox(_viewportWidth?: number, _viewportHeight?: number): {
  offsetX: number;
  offsetY: number;
  renderWidth: number;
  renderHeight: number;
} {
  return {
    offsetX: 0,
    offsetY: 0,
    renderWidth: CAMERA_VISIBLE_WORLD_WIDTH,
    renderHeight: CAMERA_VISIBLE_WORLD_HEIGHT,
  };
}

/** Retângulo fixo do mundo visível — independente do tamanho da janela. */
export function computeVisibleWorldSize(): { width: number; height: number } {
  return {
    width: CAMERA_VISIBLE_WORLD_WIDTH,
    height: CAMERA_VISIBLE_WORLD_HEIGHT,
  };
}
