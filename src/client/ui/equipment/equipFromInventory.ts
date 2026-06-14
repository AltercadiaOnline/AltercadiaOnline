import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import {
  canEquipItemWeight,
  CAPACITY_OVERLOAD_MESSAGE,
} from '../../../shared/character/carryCapacity.js';
import { findCompatibleEquipmentUiSlot } from '../../../shared/character/equipItemMapping.js';
import {
  assignItemToEquipmentSlot,
  inventorySlotsFromItems,
  type ItemSlotMutationFailure,
} from '../../../shared/character/itemSlotModel.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { alertSystem } from '../alertSystem.js';
import { getPlayerEquipmentStore } from './playerEquipmentStore.js';

export type EquipFromInventoryFailureReason =
  | ItemSlotMutationFailure
  | 'equip_failed';

export type EquipFromInventoryResult =
  | { readonly ok: true; readonly itemId: string; readonly uiSlotId: EquipmentUiSlotId }
  | { readonly ok: false; readonly reason: EquipFromInventoryFailureReason };

function canEquipWeight(itemId: string, uiSlotId: EquipmentUiSlotId): boolean {
  const equipmentSnapshot = getPlayerEquipmentStore().getSnapshot();
  const itemStore = getPlayerItemStore();
  return canEquipItemWeight(
    {
      inventorySlots: inventorySlotsFromItems(itemStore.getItems()),
      equipment: itemStore.toEquipmentGrid(),
      playerLevel: equipmentSnapshot.level,
    },
    uiSlotId,
    itemId,
  );
}

/** Valida sem mutar — online envia intenção; motor só altera `slot` no preview. */
export function validateEquipInventoryItemToSet(
  itemId: string,
  preferredUiSlot?: EquipmentUiSlotId,
): EquipFromInventoryResult {
  const uiSlotId = preferredUiSlot ?? findCompatibleEquipmentUiSlot(itemId);
  if (!uiSlotId) {
    return { ok: false, reason: 'not_equippable' };
  }
  if (!canEquipWeight(itemId, uiSlotId)) {
    return { ok: false, reason: 'equip_failed' };
  }

  const preview = assignItemToEquipmentSlot(
    getPlayerItemStore().getItems(),
    itemId,
    preferredUiSlot,
  );
  if (!preview.ok) {
    return preview;
  }

  return { ok: true, itemId, uiSlotId: preview.uiSlotId };
}

/** Offline/mock: atualiza `slot` do item no array único. */
export function equipInventoryItemToSet(
  itemId: string,
  preferredUiSlot?: EquipmentUiSlotId,
): EquipFromInventoryResult {
  const uiSlotId = preferredUiSlot ?? findCompatibleEquipmentUiSlot(itemId);
  if (!uiSlotId) {
    return { ok: false, reason: 'not_equippable' };
  }
  if (!canEquipWeight(itemId, uiSlotId)) {
    alertSystem(CAPACITY_OVERLOAD_MESSAGE);
    return { ok: false, reason: 'equip_failed' };
  }

  const result = getPlayerItemStore().equipItemById(itemId, preferredUiSlot);
  if (!result.ok) {
    return result;
  }

  return { ok: true, itemId, uiSlotId: result.uiSlotId };
}

export function equipFromInventoryFailureMessage(reason: EquipFromInventoryFailureReason): string {
  switch (reason) {
    case 'invalid_slot':
      return 'Item indisponível neste slot.';
    case 'not_equippable':
      return 'Este item não pode ser equipado no SET.';
    case 'blocked_swap':
      return 'Libere o slot do SET ou espaço no inventário antes de equipar outro item.';
    case 'equip_failed':
      return 'Não foi possível equipar — verifique capacidade de carga.';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}
