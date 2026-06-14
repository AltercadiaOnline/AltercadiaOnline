import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import {
  assignEquipmentSlotToInventory,
} from '../../../shared/character/itemSlotModel.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { getCarryCapacityStore } from '../capacity/carryCapacityStore.js';

export type UnequipToInventoryFailureReason = 'empty' | 'capacity' | 'inventory_full';

export type UnequipToInventoryResult =
  | { readonly ok: true; readonly itemId: string }
  | { readonly ok: false; readonly reason: UnequipToInventoryFailureReason };

const INVENTORY_FULL_MESSAGE = 'Inventário cheio — libere espaço antes de desequipar.';

/** Valida sem mutar — slot → inventory no preview. */
export function validateUnequipSlotToInventory(
  slotId: EquipmentUiSlotId,
): UnequipToInventoryResult {
  const row = getPlayerItemStore().getItemInSlot(slotId);
  if (!row) {
    return { ok: false, reason: 'empty' };
  }

  const capacity = getCarryCapacityStore();
  if (!capacity.canAddItem(row.itemId, 1)) {
    return { ok: false, reason: 'capacity' };
  }

  const preview = assignEquipmentSlotToInventory(getPlayerItemStore().getItems(), slotId);
  if (!preview.ok) {
    return { ok: false, reason: preview.reason === 'inventory_full' ? 'inventory_full' : 'empty' };
  }

  return { ok: true, itemId: row.itemId };
}

/** Offline/mock: altera `slot` para inventory. */
export function unequipSlotToInventory(slotId: EquipmentUiSlotId): UnequipToInventoryResult {
  const row = getPlayerItemStore().getItemInSlot(slotId);
  if (!row) {
    return { ok: false, reason: 'empty' };
  }

  const capacity = getCarryCapacityStore();
  if (!capacity.canAddItem(row.itemId, 1)) {
    capacity.notifyCapacityBlocked();
    return { ok: false, reason: 'capacity' };
  }

  const result = getPlayerItemStore().unequipSlot(slotId);
  if (!result.ok) {
    return { ok: false, reason: result.reason === 'inventory_full' ? 'inventory_full' : 'empty' };
  }

  return { ok: true, itemId: row.itemId };
}

export function unequipFailureMessage(reason: UnequipToInventoryFailureReason): string {
  if (reason === 'empty') return 'Nada equipado neste slot.';
  if (reason === 'capacity') return 'Capacidade de carga excedida.';
  return INVENTORY_FULL_MESSAGE;
}
