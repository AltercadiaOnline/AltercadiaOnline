import { DESIGN_CONFIG } from '../../../config/designConstants.js';

/**
 * Beco dos Fundos (Zona 1) — dimensões autoritativas do Construct (`zonabeco1`).
 *
 * Autoridade visual / bounds: pixels do layout Construct (não grade Tiled pintada).
 * Tile size permanece 32px só para math de portal/spawn/overlay; o mapa não precisa
 * fechar em tiles inteiros na largura (860 ÷ 32 = 26.875).
 */
export const FARM_ZONE_01_LORE_BRIEF = [
  'Beco dos Fundos — extensão da Cidade 01, não periferia rural.',
  'Estética: beco americano (tijolo, ferro, hidrante) + Tóquio (néon, corredor apertado, grafite).',
  'Distrito de oficinas e becos antes da gentrificação NexGrid.',
  'Fonte de tamanho: Construct layout zonabeco1 (860×2400 px).',
].join(' ');

/** Pixels do layout Construct `zonabeco1` — fonte da verdade para câmera e bounds. */
export const FARM_ZONE_01_PIXEL_WIDTH = 860;
export const FARM_ZONE_01_PIXEL_HEIGHT = 2400;

export const FARM_ZONE_01_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;

/**
 * Grade lógica stub (ceil) — só para portais/coords em tiles.
 * Walkability = bounds em pixel do Construct (WORLD_LEGACY_COLLISION_ENABLED=false).
 */
export const FARM_ZONE_01_TILES_WIDE = Math.ceil(FARM_ZONE_01_PIXEL_WIDTH / FARM_ZONE_01_TILE_SIZE);
export const FARM_ZONE_01_TILES_HIGH = Math.ceil(FARM_ZONE_01_PIXEL_HEIGHT / FARM_ZONE_01_TILE_SIZE);

/** Centro horizontal aproximado do beco em tiles (860/2). */
export const FARM_ZONE_01_ALLEY_CENTER = Math.floor(
  FARM_ZONE_01_PIXEL_WIDTH / 2 / FARM_ZONE_01_TILE_SIZE,
);

/** @deprecated Corredor Tiled — mantido só para helpers legados; não governa walkability. */
export const FARM_ZONE_01_ALLEY_MIN = FARM_ZONE_01_ALLEY_CENTER - 2;
/** @deprecated Corredor Tiled — mantido só para helpers legados; não governa walkability. */
export const FARM_ZONE_01_ALLEY_MAX = FARM_ZONE_01_ALLEY_CENTER + 1;

export const FARM_ZONE_01_DIMENSIONS = {
  tilesWide: FARM_ZONE_01_TILES_WIDE,
  tilesHigh: FARM_ZONE_01_TILES_HIGH,
  pixelWidth: FARM_ZONE_01_PIXEL_WIDTH,
  pixelHeight: FARM_ZONE_01_PIXEL_HEIGHT,
} as const;

/** @deprecated Não usar para colisão — Construct + bounds de pixel. */
export function isFarmZone01AlleyCorridorTile(tileX: number): boolean {
  return tileX >= FARM_ZONE_01_ALLEY_MIN && tileX <= FARM_ZONE_01_ALLEY_MAX;
}
