import { DESIGN_CONFIG } from './designConstants.js';

/** Dimensões oficiais do sprite humanóide — jogador e NPCs. Âncora: base central (17.5, 54). */
export const DESIGN_SPRITE_DIMENSIONS = {
  width: DESIGN_CONFIG.PLAYER.WIDTH,
  height: DESIGN_CONFIG.PLAYER.HEIGHT,
  pivotX: DESIGN_CONFIG.PLAYER.PIVOT_X,
  pivotY: DESIGN_CONFIG.PLAYER.PIVOT_Y,
} as const;

export type SpriteDimensions = {
  readonly width: number;
  readonly height: number;
};

export type SpriteDimensionsEntity = {
  readonly id?: string;
  readonly dimensions?: SpriteDimensions;
};

/** Dimensão padrão obrigatória para NPCs no registro. */
export const DESIGN_NPC_DIMENSIONS: SpriteDimensions = {
  width: DESIGN_SPRITE_DIMENSIONS.width,
  height: DESIGN_SPRITE_DIMENSIONS.height,
};

/** Largura visível da silhueta no chão — contrato do jogador (35px). */
export const DESIGN_ENTITY_FIGURE_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;

export type EntitySpriteBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function resolveEntitySpriteCenter(bounds: EntitySpriteBounds): { readonly x: number; readonly feetY: number } {
  return {
    x: bounds.x + bounds.width / 2,
    feetY: bounds.y + bounds.height,
  };
}

/**
 * Valida contrato 35×54 — loga aviso no console se divergir.
 * Retorna true quando as dimensões estão no padrão.
 */
export function validateSpriteDimensions(entity: SpriteDimensionsEntity): boolean {
  const label = entity.id ?? 'entity';
  const dims = entity.dimensions;

  if (!dims) {
    console.warn(`[SpriteDimensions] ${label}: propriedade dimensions ausente (esperado 35×54).`);
    return false;
  }

  const valid =
    dims.width === DESIGN_SPRITE_DIMENSIONS.width
    && dims.height === DESIGN_SPRITE_DIMENSIONS.height;

  if (!valid) {
    console.warn(
      `[SpriteDimensions] ${label}: esperado ${DESIGN_SPRITE_DIMENSIONS.width}×${DESIGN_SPRITE_DIMENSIONS.height}, recebido ${dims.width}×${dims.height}.`,
    );
  }

  return valid;
}
