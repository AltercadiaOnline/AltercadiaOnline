import { GAME_CONFIG } from '../../game/constants/GameConfig.js';

export type TiledObjectRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/** Retângulo completo do objeto Tiled (canto superior-esquerdo). */
export function resolveTiledObjectCollisionHitbox(
  object: TiledObjectRect,
  tileSize: number = GAME_CONFIG.TILE_SIZE,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const width = object.width > 0 ? object.width : tileSize;
  const height = object.height > 0 ? object.height : tileSize;
  return {
    x: object.x,
    y: object.y,
    width,
    height,
  };
}

/**
 * Metade inferior do objeto — espelha MapLoader.applyStaticCollision (Phaser body).
 * Permite o jogador passar visualmente “atrás” da parte superior de casas/postes.
 */
export function resolveTiledObjectFootCollisionHitbox(
  object: TiledObjectRect,
  tileSize: number = GAME_CONFIG.TILE_SIZE,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const full = resolveTiledObjectCollisionHitbox(object, tileSize);
  const collisionHeight = Math.max(1, full.height * 0.5);
  return {
    x: full.x,
    y: full.y + full.height - collisionHeight,
    width: full.width,
    height: collisionHeight,
  };
}
