import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import { ItemLocationSlot } from '../../../shared/character/itemSlotModel.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  equipFromInventoryFailureMessage,
  equipInventoryItemToSet,
  validateEquipInventoryItemToSet,
} from './equipFromInventory.js';
import {
  unequipFailureMessage,
  unequipSlotToInventory,
  validateUnequipSlotToInventory,
} from './unequipToInventory.js';

export type ToggleItemSlotResult =
  | { readonly ok: true; readonly mode: 'equip'; readonly itemId: string; readonly uiSlotId: EquipmentUiSlotId }
  | { readonly ok: true; readonly mode: 'unequip'; readonly itemId: string }
  | { readonly ok: false; readonly reason: string };

/** Valida toggle equip ↔ inventory sem mutar o store. */
export function validateToggleItemSlot(
  itemId: string,
  targetSlot?: EquipmentUiSlotId,
): ToggleItemSlotResult {
  const item = getPlayerItemStore().getItemById(itemId);
  if (!item) {
    return { ok: false, reason: 'Item não encontrado.' };
  }

  if (item.slot === ItemLocationSlot.Inventory) {
    const equip = validateEquipInventoryItemToSet(itemId, targetSlot);
    if (!equip.ok) {
      return { ok: false, reason: equipFromInventoryFailureMessage(equip.reason) };
    }
    return { ok: true, mode: 'equip', itemId, uiSlotId: equip.uiSlotId };
  }

  const unequip = validateUnequipSlotToInventory(item.slot);
  if (!unequip.ok) {
    return { ok: false, reason: unequipFailureMessage(unequip.reason) };
  }
  return { ok: true, mode: 'unequip', itemId: unequip.itemId };
}

/**
 * Toggle equip ↔ inventory — altera apenas `slot` do item no array único.
 * Offline/mock: muta o store e dispara PLAYER_ITEMS_UPDATED (UI redesenha).
 */
export function toggleItemSlot(itemId: string, targetSlot?: EquipmentUiSlotId): ToggleItemSlotResult {
  const item = getPlayerItemStore().getItemById(itemId);
  if (!item) {
    return { ok: false, reason: 'Item não encontrado.' };
  }

  if (item.slot === ItemLocationSlot.Inventory) {
    const equip = equipInventoryItemToSet(itemId, targetSlot);
    if (!equip.ok) {
      return { ok: false, reason: equipFromInventoryFailureMessage(equip.reason) };
    }
    return { ok: true, mode: 'equip', itemId, uiSlotId: equip.uiSlotId };
  }

  const unequip = unequipSlotToInventory(item.slot);
  if (!unequip.ok) {
    return { ok: false, reason: unequipFailureMessage(unequip.reason) };
  }
  return { ok: true, mode: 'unequip', itemId: unequip.itemId };
}

/** Resolve intenção de servidor a partir do estado atual do slot. */
export function resolveToggleItemSlotServerAction(
  itemId: string,
  targetSlot?: EquipmentUiSlotId,
):
  | { readonly type: 'EQUIP_FROM_INVENTORY'; readonly payload: { readonly itemId: string; readonly uiSlotId?: EquipmentUiSlotId } }
  | { readonly type: 'UNEQUIP_TO_INVENTORY'; readonly payload: { readonly slotId: EquipmentUiSlotId } }
  | null {
  const item = getPlayerItemStore().getItemById(itemId);
  if (!item) return null;

  if (item.slot === ItemLocationSlot.Inventory) {
    return {
      type: 'EQUIP_FROM_INVENTORY',
      payload: {
        itemId,
        ...(targetSlot !== undefined ? { uiSlotId: targetSlot } : {}),
      },
    };
  }

  return {
    type: 'UNEQUIP_TO_INVENTORY',
    payload: { slotId: item.slot },
  };
}
