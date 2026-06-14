import { createDefaultWorldProfile } from '../../shared/world/playerWorldProfile.js';
import type { PlayerProfile } from '../models/playerProfile.js';
import { getMapDefinition } from '../../shared/world/mapRegistry.js';
import type { MapId } from '../../shared/world/mapRegistry.js';

const profiles = new Map<string, PlayerProfile>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function getWorldProfile(playerId: string, characterId: number): PlayerProfile {
  const key = profileKey(playerId, characterId);
  const existing = profiles.get(key);
  if (existing) return { ...existing, lastPosition: { ...existing.lastPosition } };

  const created = createDefaultWorldProfile();
  profiles.set(key, created);
  return { ...created, lastPosition: { ...created.lastPosition } };
}

export function saveWorldProfile(
  playerId: string,
  characterId: number,
  profile: PlayerProfile,
): PlayerProfile {
  const mapDef = getMapDefinition(profile.currentMapId as MapId);
  const normalized: PlayerProfile = {
    currentMapId: mapDef ? profile.currentMapId : createDefaultWorldProfile().currentMapId,
    lastPosition: {
      x: profile.lastPosition.x,
      y: profile.lastPosition.y,
    },
    facing: profile.facing,
    ...(profile.sessionSync !== undefined ? { sessionSync: profile.sessionSync } : {}),
    ...(profile.loadout !== undefined ? { loadout: profile.loadout } : {}),
  };

  profiles.set(profileKey(playerId, characterId), normalized);
  return { ...normalized, lastPosition: { ...normalized.lastPosition } };
}

/** Testes — limpa estado in-memory. */
export function resetWorldProfileStore(): void {
  profiles.clear();
}
