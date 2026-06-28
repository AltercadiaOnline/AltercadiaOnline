/**
 * @deprecated Legado — preferir `DESIGN_CONFIG.TILE.SIZE` (`src/config/designConstants.ts`).
 * Migrar organicamente ao editar cada consumidor; não refatorar em massa.
 *
 * Padrão histórico: 64×64 px/tile. Especificação oficial atual: 32×32.
 */
export const TILE_SIZE = 32;

/** Tamanho padrão de uma zona (ex.: Cidade 01 = 40×40 tiles @ 32px). */
export const ZONE_TILES = 40;

/** Alias da zona padrão ativa (Cidade 01). */
export const MAP_TILES = ZONE_TILES;
