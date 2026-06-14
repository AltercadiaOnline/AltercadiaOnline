import { EconomyEventType } from '../../shared/economy/events.js';
import {
  equipmentUiGridToEquipped,
  equippedToEquipmentUiGrid,
} from '../../shared/character/equipmentUiSlots.js';
import {
  sanitizeEquipmentUiGrid,
  validateLoadoutTransition,
} from '../../shared/character/loadoutValidation.js';
import { applyEquipmentUiGridTransition } from '../../shared/character/equipUiGridTransaction.js';
import {
  normalizePlayerLoadoutData,
  type PlayerLoadoutData,
} from '../../shared/world/playerLoadout.js';
import {
  executeEconomyTransaction,
  getCharacterProfile,
  setAuthoritativePlayerLoadout,
  syncAuthoritativeLoadoutFromEconomyProfile,
} from '../../Economy/economyStore.js';
import { globalEventBus } from '../../Economy/EventBus.js';
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

function inventoryUpdatedPayload(
  playerId: string,
  characterId: number,
  items: readonly import('../../shared/character/equipmentState.js').InventoryStack[],
  loadout: PlayerLoadoutData,
  extras?: { readonly intentId?: string; readonly revision?: number },
) {
  return {
    playerId,
    characterId,
    items: items.map((row) => ({ ...row })),
    equipped: loadout.equipped ?? equipmentUiGridToEquipped(loadout.equipmentUiGrid),
    equipmentUiGrid: loadout.equipmentUiGrid,
    ...extras,
  };
}

/**
 * Persiste SET no worldProfile e economyStore — fonte da verdade para loot/UI.
 */
export async function handleSyncLoadout(
  playerId: string,
  characterId: number,
  loadoutData: PlayerLoadoutData,
  intentId?: string,
): Promise<SyncLoadoutResult> {
  const blocked = rejectLoadoutMutationIfInBattle(playerId, characterId);
  if (blocked) return blocked;

  const profile = getCharacterProfile(playerId, characterId);
  const currentGrid = profile.equipmentUiGrid ?? equippedToEquipmentUiGrid(profile.equipped);
  const normalized = normalizePlayerLoadoutData({
    equipmentUiGrid: sanitizeEquipmentUiGrid(loadoutData.equipmentUiGrid),
    ...(loadoutData.equipped !== undefined ? { equipped: loadoutData.equipped } : {}),
  });

  if (!validateLoadoutTransition(normalized.equipmentUiGrid, profile.inventory, currentGrid)) {
    return { ok: false, message: 'Loadout inválido — item indisponível ou slot incorreto.' };
  }

  let inventorySnapshot: import('../../shared/character/equipmentState.js').InventoryStack[] = [];

  const tx = await executeEconomyTransaction(playerId, characterId, async (store) => {
    const transition = applyEquipmentUiGridTransition(
      store.getInventory(),
      currentGrid,
      normalized.equipmentUiGrid,
    );
    if (!transition.ok) {
      switch (transition.reason) {
        case 'inventory_full':
          throw new Error('Inventário cheio — libere espaço antes de desequipar.');
        case 'empty':
          throw new Error('Nada equipado neste slot.');
        case 'invalid_slot':
        case 'not_equippable':
        case 'blocked_swap':
        case 'loadout_mismatch':
          throw new Error('Loadout inválido — item indisponível ou slot incorreto.');
        default: {
          const _exhaustive: never = transition.reason;
          throw new Error(_exhaustive);
        }
      }
    }

    // Grid antes do dedupe — evita remover item recém-devolvido à mochila.
    store.setEquipmentUiGrid(transition.grid);
    store.setInventory(transition.inventory);
    inventorySnapshot = store.getInventory().map((row) => ({ ...row }));
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  persistAuthoritativeLoadout(playerId, characterId, normalized);

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: inventoryUpdatedPayload(
      playerId,
      characterId,
      inventorySnapshot,
      normalized,
      { ...(intentId ? { intentId } : {}) },
    ),
  });

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
