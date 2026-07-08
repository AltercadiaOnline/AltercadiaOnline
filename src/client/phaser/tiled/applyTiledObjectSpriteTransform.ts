import type { TiledJsonObject } from '../../../config/tiledMapJson.js';
import { decodeTiledGid } from './tilesetBindDiagnostics.js';
import type { PhaserMapSprite } from './phaserTiledMapTypes.js';

/**
 * Aplica rotação livre do Tiled (`object.rotation`, graus) e flags de flip no GID
 * (bits 29–31) após `realGid = gid & 0x1FFFFFFF`.
 */
export function applyTiledObjectSpriteTransform(
  sprite: PhaserMapSprite,
  objectData: TiledJsonObject,
  rawGid?: number,
): void {
  const rotationDeg = Number(objectData.rotation ?? 0);
  if (rotationDeg !== 0 && typeof sprite.setRotation === 'function') {
    sprite.setRotation((rotationDeg * Math.PI) / 180);
  }

  if (rawGid == null || rawGid <= 0) return;

  const { flipX, flipY, flipDiagonal } = decodeTiledGid(rawGid);
  if (!flipX && !flipY && !flipDiagonal) return;

  if (flipDiagonal && typeof sprite.setAngle === 'function' && typeof sprite.setFlip === 'function') {
    // Convenção Tiled: flip diagonal = rotação 90° + espelhamento.
    sprite.setAngle(90);
    sprite.setFlip(flipX !== flipY, flipX === flipY);
    return;
  }

  if (typeof sprite.setFlip === 'function') {
    sprite.setFlip(flipX, flipY);
  }
}
