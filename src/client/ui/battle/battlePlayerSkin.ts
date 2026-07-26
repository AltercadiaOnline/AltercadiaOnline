import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import { resolvePlayerSkinBundleRotationUrl } from '../../../shared/character/playerSkinBundle.js';

/** Side-view: jogador à esquerda olha para leste — espelha a skin ativa do personagem. */
export function resolveBattlePlayerEastSpriteCandidates(): readonly string[] {
  const bundleId = getActivePlayerSkinBundleId();
  const east = resolvePlayerSkinBundleRotationUrl(bundleId, 'east');
  const south = resolvePlayerSkinBundleRotationUrl(bundleId, 'south');
  return east === south ? [east] : [east, south];
}

export function resolveBattlePlayerEastSpriteUrl(): string {
  return resolveBattlePlayerEastSpriteCandidates()[0] ?? resolvePlayerSkinBundleRotationUrl(
    getActivePlayerSkinBundleId(),
    'east',
  );
}
