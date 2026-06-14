import type { WorldPoint } from '../shared/world/playerEntity.js';

/** Espelha playerSpriteSourceTrim.ts — trim do frame do jogador (metadata). */
const PLAYER_SPRITE_SRC_TOP_TRIM = 0.06;
const PLAYER_SPRITE_SRC_BOTTOM_TRIM = 0.18;
import {
  resolvePlayerSpriteDimensions,
  resolvePlayerVisualBounds,
} from '../shared/world/playerVisualContract.js';
import { getActiveMapTileSize } from '../shared/world/activeMapTileSize.js';
import { DESIGN_CONFIG } from './designConstants.js';
import {
  DESIGN_ENTITY_FIGURE_WIDTH,
  DESIGN_SPRITE_DIMENSIONS,
  type EntitySpriteBounds,
} from './spriteDimensions.js';

/**
 * Ocupação vertical da silhueta opaca no frame do player (após trim do metadata).
 * O PNG tem margem transparente; o NPC procedural preenchia 100% do box e parecia 2× maior.
 */
export const PLAYER_SPRITE_BODY_VERTICAL_FILL = 0.66;

/**
 * Escala uniforme para NPC/props procedurais = mesma presença visual do chibi do jogador.
 * No box oficial (DESIGN_CONFIG.PLAYER.HEIGHT) o jogador preenche o bounds — escala 1.
 */
export function resolveEntityFigureUniformScale(boxHeight: number): number {
  if (boxHeight <= 0) return 1;

  const designBoxH = DESIGN_CONFIG.PLAYER.HEIGHT;
  if (Math.abs(boxHeight - designBoxH) < 0.5) {
    return 1;
  }

  const trimRatio = 1 - PLAYER_SPRITE_SRC_TOP_TRIM - PLAYER_SPRITE_SRC_BOTTOM_TRIM;
  const targetVisualHeight = boxHeight * trimRatio * PLAYER_SPRITE_BODY_VERTICAL_FILL;
  const scale = targetVisualHeight / boxHeight;

  return Math.min(1, Math.max(0.4, scale));
}

/** @deprecated Use resolveEntityFigureUniformScale — mantido para testes legados. */
export function resolveEntityFigureScaleX(boxWidth: number = DESIGN_SPRITE_DIMENSIONS.width): number {
  const uniform = resolveEntityFigureUniformScale(DESIGN_SPRITE_DIMENSIONS.height);
  const widthScale = DESIGN_ENTITY_FIGURE_WIDTH / boxWidth;
  return uniform * (widthScale / uniform);
}

/** Bounds de desenho — mesma função do PlayerSprite (DESIGN_CONFIG). */
export function resolveSharedEntityVisualBounds(
  position: WorldPoint,
  _tileSize = getActiveMapTileSize(),
): EntitySpriteBounds {
  return resolvePlayerVisualBounds(position);
}

export function resolveSharedEntitySpriteDimensions(
  _tileSize = getActiveMapTileSize(),
): { readonly width: number; readonly height: number } {
  return resolvePlayerSpriteDimensions();
}

/** Largura do layout interno (pré-escala) — box oficial 35px. */
export const ENTITY_FIGURE_LAYOUT_WIDTH: number = DESIGN_CONFIG.PLAYER.WIDTH;

/** Aplica escala uniforme ancorada nos pés — igual presença do chibi do jogador. */
export function applyEntityFigureUniformTransform(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  boxHeight: number,
): number {
  const scale = resolveEntityFigureUniformScale(boxHeight);
  const ax = Math.round(anchorX);
  const fy = Math.round(feetY);
  ctx.translate(ax, fy);
  ctx.scale(scale, scale);
  ctx.translate(-ax, -fy);
  return scale;
}
