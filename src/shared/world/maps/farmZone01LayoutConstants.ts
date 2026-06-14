import { DESIGN_CONFIG } from '../../../config/designConstants.js';

/**
 * Beco dos Fundos (Zona 1) — extensão urbana da Cidade 01.
 *
 * Lore / direção visual:
 * - Continuidade com a malha da cidade: mesma grade 40px, mesma paleta urbana.
 * - Híbrido EUA + Tóquio: corredor estreito, tijolo e concreto gasto, asfalto úmido,
 *   fios e dutos, lixeiras e hidrantes americanos, néon magenta/teal estilo izakaya
 *   e kanji em grafites — sem sair do distrito comercial leste.
 * - Norte: beco sem saída (dead end). Sul: retorno manual à cidade.
 */
export const FARM_ZONE_01_LORE_BRIEF = [
  'Beco dos Fundos — extensão da Cidade 01, não periferia rural.',
  'Estética: beco americano (tijolo, ferro, hidrante) + Tóquio (néon, corredor apertado, grafite).',
  'Distrito de oficinas e becos antes da gentrificação NexGrid.',
].join(' ');

export const FARM_ZONE_01_TILES_WIDE = DESIGN_CONFIG.MAP.MAX_TILES_WIDTH;
export const FARM_ZONE_01_TILES_HIGH = DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT;

export const FARM_ZONE_01_ALLEY_CENTER = Math.floor(FARM_ZONE_01_TILES_WIDE / 2);
export const FARM_ZONE_01_ALLEY_MIN = FARM_ZONE_01_ALLEY_CENTER - 2;
export const FARM_ZONE_01_ALLEY_MAX = FARM_ZONE_01_ALLEY_CENTER + 1;

export const FARM_ZONE_01_DIMENSIONS = {
  tilesWide: FARM_ZONE_01_TILES_WIDE,
  tilesHigh: FARM_ZONE_01_TILES_HIGH,
} as const;

/** Corredor central padrão (4 tiles) — portal sul alarga temporariamente a faixa walkable. */
export function isFarmZone01AlleyCorridorTile(tileX: number): boolean {
  return tileX >= FARM_ZONE_01_ALLEY_MIN && tileX <= FARM_ZONE_01_ALLEY_MAX;
}
