import type { MapId } from '../../shared/world/mapRegistry.js';
import { getMapDefinition } from '../../shared/world/mapRegistry.js';
import {
  isMapAllowedOnInstance,
  isNpcAllowedOnInstance,
  type ServerInstanceDefinition,
} from '../../shared/world/serverInstanceCatalog.js';
import { getResolvedNpcRegistry, type NpcRegistryEntry } from '../../shared/world/npcRegistry.js';
import {
  buildWorldCreaturesForMap,
  type WorldCreatureSnapshot,
} from '../../shared/world/worldCreatureSync.js';
import type { PlayerProfile } from '../models/playerProfile.js';
import { createDefaultWorldProfile } from '../../shared/world/playerWorldProfile.js';
import { getWorldProfile, saveWorldProfile } from '../world/worldProfileStore.js';
import { getServerInstanceContext } from './ServerInstanceContext.js';

export function getServerScopedNpcRegistry(
  instance: ServerInstanceDefinition = getServerInstanceContext(),
): readonly NpcRegistryEntry[] {
  return getResolvedNpcRegistry().filter((npc) =>
    isNpcAllowedOnInstance(npc.id, npc.mapId, instance),
  );
}

export function buildServerScopedWorldCreaturesForMap(
  mapId: MapId,
  instance: ServerInstanceDefinition = getServerInstanceContext(),
): readonly WorldCreatureSnapshot[] {
  if (!isMapAllowedOnInstance(mapId, instance)) {
    return [];
  }
  return buildWorldCreaturesForMap(mapId);
}

/** Garante que o perfil está em um mapa desta instância — corrige spawn se necessário. */
export function normalizeProfileForServerInstance(
  playerId: string,
  characterId: number,
  instance: ServerInstanceDefinition = getServerInstanceContext(),
): PlayerProfile {
  const profile = getWorldProfile(playerId, characterId);
  if (isMapAllowedOnInstance(profile.currentMapId, instance)) {
    return profile;
  }

  const mapDef = getMapDefinition(instance.defaultMapId);
  if (!mapDef) {
    return profile;
  }

  const spawnProfile = createDefaultWorldProfile(instance.defaultMapId);
  const corrected: PlayerProfile = {
    ...spawnProfile,
    ...(profile.sessionSync !== undefined ? { sessionSync: profile.sessionSync } : {}),
    ...(profile.loadout !== undefined ? { loadout: profile.loadout } : {}),
  };

  return saveWorldProfile(playerId, characterId, corrected);
}

export function rejectMapTransitionIfNotAllowed(
  targetMapId: string,
  instance: ServerInstanceDefinition = getServerInstanceContext(),
): boolean {
  return !isMapAllowedOnInstance(targetMapId, instance);
}
