import type { PlayerLoadoutData } from '../../shared/world/playerLoadout.js';
import { syncEquipmentLoadoutFromGrid } from '../../Economy/economyGateway.js';
import {
  equipmentUiGridToEquipped,
  equippedToEquipmentUiGrid,
} from '../../shared/character/equipmentUiSlots.js';
import { normalizePlayerLoadoutData } from '../../shared/world/playerLoadout.js';
import {
  getCharacterProfile,
  setAuthoritativePlayerLoadout,
  syncAuthoritativeLoadoutFromEconomyProfile,
} from '../../Economy/economyStore.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';
import { rejectLoadoutMutationIfInBattle } from './loadoutMutationGuard.js';

export type SyncLoadoutResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

export function persistAuthoritativeLoadout(
  playerId: string,
  characterId: number,
  loadout: PlayerLoadoutData,
): PlayerLoadoutData {
  const normalized = normalizePlayerLoadoutData(loadout);
  const world = getWorldProfile(playerId, characterId);
  saveWorldProfile(playerId, characterId, {
    ...world,
    loadout: normalized,
  });
  setAuthoritativePlayerLoadout(playerId, characterId, normalized);
  return normalized;
}

/**
 * Persiste SET no worldProfile — mutação de inventário via economyGateway.
 */
export async function handleSyncLoadout(
  playerId: string,
  characterId: number,
  loadoutData: PlayerLoadoutData,
  intentId?: string,
): Promise<SyncLoadoutResult> {
  const blocked = rejectLoadoutMutationIfInBattle(playerId, characterId);
  if (blocked) return blocked;

  const result = await syncEquipmentLoadoutFromGrid(
    playerId,
    characterId,
    loadoutData,
    intentId,
  );
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  persistAuthoritativeLoadout(playerId, characterId, result.loadout);
  return { ok: true };
}

/** Espelha SET do economyStore no worldProfile (rotas legadas equip/unequip). */
export function mirrorEconomyLoadoutToWorld(
  playerId: string,
  characterId: number,
): PlayerLoadoutData | SyncLoadoutResult {
  const blocked = rejectLoadoutMutationIfInBattle(playerId, characterId);
  if (blocked) return blocked;

  const loadout = syncAuthoritativeLoadoutFromEconomyProfile(playerId, characterId);
  return persistAuthoritativeLoadout(playerId, characterId, loadout);
}

/** Loadout persistido no worldProfile (prioridade) ou economyStore. */
export function resolveAuthoritativePlayerLoadout(
  playerId: string,
  characterId: number,
): PlayerLoadoutData {
  const world = getWorldProfile(playerId, characterId);
  if (world.loadout?.equipmentUiGrid) {
    return normalizePlayerLoadoutData(world.loadout);
  }

  const profile = getCharacterProfile(playerId, characterId);
  const equipmentUiGrid = profile.equipmentUiGrid ?? equippedToEquipmentUiGrid(profile.equipped);
  return normalizePlayerLoadoutData({
    equipmentUiGrid,
    equipped: profile.equipped,
  });
}
