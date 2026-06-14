import { DESIGN_CONFIG } from './designConstants.js';



/** Quantos SQMs visuais (eixo) cabem em 1 macro-tile legado 40px. */

export const SUB_TILES_PER_MACRO_AXIS = 2;



/** Tamanho visual de 1 SQM do game design. */

export const DESIGN_SQM_SIZE_PX = DESIGN_CONFIG.TILE.SIZE;



export type SubTileDrawLayout = {

  readonly visualTileSize: number;

  readonly subdivisions: number;

};



/**

 * Resolve desenho do chão:

 * - mapas design (40px): 1 tile = 1 célula

 * - legado 64px: 2×2 sub-células de 32px dentro de cada célula

 */

export function resolveSubTileDrawLayout(logicalTileSize: number): SubTileDrawLayout {
  if (logicalTileSize === DESIGN_SQM_SIZE_PX) {
    return { visualTileSize: DESIGN_SQM_SIZE_PX, subdivisions: 1 };
  }

  return {
    visualTileSize: logicalTileSize / SUB_TILES_PER_MACRO_AXIS,
    subdivisions: SUB_TILES_PER_MACRO_AXIS,
  };
}


