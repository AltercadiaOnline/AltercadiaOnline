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

type CachedAppearance = {
  readonly appearance: NearbyPeerAppearance;
  readonly signature: string;
  refreshedAtTick: number;
};

/** Cache entre ticks — evita reler progressão/roster a cada peer a cada frame. */
const appearanceCache = new Map<string, CachedAppearance>();

/** Revalida no máximo 1×/s (20 Hz) mesmo se a assinatura não mudou. */
const APPEARANCE_REFRESH_TICKS = 20;

function peerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function companionSignature(companion: RemotePlayerCompanionSnapshot | undefined): string {
  if (!companion) return '';
  return `${companion.kindId}:${companion.colorId}:${companion.gender}:${companion.name}`;
}

function appearanceSignature(appearance: NearbyPeerAppearance): string {
  return `${appearance.skinBundleId}|${appearance.level}|${companionSignature(appearance.companion)}`;
}

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

/**
 * Resolve com cache leve — reusa entre ticks do GameLoop enquanto skin/nível/pet não mudam.
 */
export function resolveNearbyPeerAppearanceCached(
  playerId: string,
  characterId: number,
  tick: number,
): NearbyPeerAppearance {
  const key = peerKey(playerId, characterId);
  const cached = appearanceCache.get(key);
  const stale = !cached || (tick - cached.refreshedAtTick) >= APPEARANCE_REFRESH_TICKS;
  if (!stale && cached) {
    return cached.appearance;
  }

  const appearance = resolveNearbyPeerAppearance(playerId, characterId);
  const signature = appearanceSignature(appearance);
  if (cached && cached.signature === signature) {
    cached.refreshedAtTick = tick;
    return cached.appearance;
  }

  appearanceCache.set(key, { appearance, signature, refreshedAtTick: tick });
  return appearance;
}

/** Remove peers que saíram do mapa / desconectaram. */
export function pruneNearbyPeerAppearanceCache(
  liveKeys: ReadonlySet<string>,
): void {
  for (const key of appearanceCache.keys()) {
    if (!liveKeys.has(key)) {
      appearanceCache.delete(key);
    }
  }
}

export function clearNearbyPeerAppearanceCache(): void {
  appearanceCache.clear();
}

export function nearbyPeerAppearanceCacheKey(playerId: string, characterId: number): string {
  return peerKey(playerId, characterId);
}
