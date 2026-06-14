import { DESIGN_CONFIG } from '../../config/designConstants.js';

/**
 * Contrato único de dimensões do front-end de exploração.
 * Fonte da verdade de design: DESIGN_CONFIG (config/designConstants.ts).
 * Escala visual na tela: CSS transform em #game-stage-scale (container 640×360) via updateScale().
 */

/** Tamanho da grade lógica em pixels (tile do servidor = GRID_SIZE px no buffer). */
export const GRID_SIZE: number = DESIGN_CONFIG.TILE.SIZE;

/** Buffer fixo 640×360 — coordenadas lógicas do canvas e do state-sync. */
export const BASE_VIEWPORT = {
  WIDTH: DESIGN_CONFIG.VIEWPORT.WIDTH,
  HEIGHT: DESIGN_CONFIG.VIEWPORT.HEIGHT,
} as const;

/** Escala interna do backing store do canvas — sempre 1 (sem upscale no buffer). */
export const CANVAS_PIXEL_SCALE = 1 as const;

/** Drawables do GameRenderer usam dimensões naturais do asset (sw/sh) — sem escala adicional. */
export const RENDER_ASSET_SCALE = 1 as const;

/** Sprite humanóide oficial (colisão / layout). */
export const ENTITY_SPRITE_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;
export const ENTITY_SPRITE_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;

/** Offset em px mundo acima do centro do tile para prompts de interação. */
export const INTERACTION_PROMPT_WORLD_OFFSET_Y = 24;

/** Offset em px buffer acima do ponto de ancoragem para overlays DOM. */
export const INTERACTION_PROMPT_BUFFER_OFFSET_Y = 20;

/** Altura estimada do sprite idle de criatura no mapa (placeholder PNG 48×40). */
export const CREATURE_WORLD_SPRITE_HEIGHT_PX = 40;

/** Altura da silhueta procedural de criatura (fallback sem PNG). */
export const CREATURE_PROCEDURAL_HEIGHT_PX = 18;

/**
 * Escala CSS atual (#game-stage-scale) — lê --game-display-scale após updateScale().
 * Contain: min(viewportW/640, viewportH/360) — barras pretas, sem crop.
 */
export function getRenderScale(root?: ParentNode): number {
  if (typeof document === 'undefined') return 1;
  const scope = root ?? document;
  const viewport = scope.querySelector<HTMLElement>('#game-viewport');
  if (!viewport) return 1;

  const raw = viewport.style.getPropertyValue('--game-display-scale');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Aplica variáveis CSS de dimensão do buffer — chamado por updateScale(). */
export function applyBaseViewportCssVars(element: HTMLElement): void {
  element.style.setProperty('--game-render-width', `${BASE_VIEWPORT.WIDTH}px`);
  element.style.setProperty('--game-render-height', `${BASE_VIEWPORT.HEIGHT}px`);
}
