import { resolvePlayerSkinBundleId, type PlayerSkinBundleId } from '../../shared/character/playerSkinBundle.js';
import { resolveSummonedPet } from '../../shared/pet/petRoster.js';
import type { RemotePlayerCompanionSnapshot } from '../../shared/world/remotePlayerSync.js';
import { getPetRosterSnapshot } from '../../Economy/petRosterStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';

export type NearbyPeerAppearance = {
  readonly skinBundleId: PlayerSkinBundleId;
  readonly level: number;
  readonly companion?: RemotePlayerCompanionSnapshot;
};

/** Identidade visual do peer — lê stores autoritativos, nunca o observador. */
export function resolveNearbyPeerAppearance(
  playerId: string,
  characterId: number,
): NearbyPeerAppearance {
  const { characterProfile } = getAuthoritativeProgression(playerId, characterId);
  const summoned = resolveSummonedPet(getPetRosterSnapshot(playerId, characterId));
  const companion: RemotePlayerCompanionSnapshot | undefined = summoned
    ? {
        name: summoned.name,
        kindId: summoned.kindId,
        colorId: summoned.colorId,
        gender: summoned.gender,
      }
    : undefined;

  const level = Number.isFinite(characterProfile.level)
    ? Math.max(1, Math.floor(characterProfile.level))
    : 1;

  return {
    skinBundleId: resolvePlayerSkinBundleId(characterProfile),
    level,
    ...(companion ? { companion } : {}),
  };
}
