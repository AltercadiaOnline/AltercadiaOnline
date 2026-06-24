/**
 * Profundidade Phaser para exploração top-down — Y-sort global.
 * depth maior = mais ao sul = desenhado por cima.
 * Use sempre a coordenada Y dos pés no mundo (ver GameConfig.resolvePlayerFeetWorldY).
 */
/** Chão e tiles — sempre abaixo de entidades com Y-sort. */
export const PHASER_GROUND_DEPTH = 0;

/** Converte coordenada Y dos pés (mundo) em depth Phaser. */
export function resolvePhaserWorldDepth(feetY: number): number {
  return Math.floor(feetY);
}
