import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';

/** True enquanto equip/desequip aguarda confirmação do servidor (modo online). */
export function hasPendingItemMutation(): boolean {
  return getPendingIntentRegistry().hasPendingItemMutation();
}

export function isInventoryItemMutationPending(itemId: string): boolean {
  return getPendingIntentRegistry().isInventoryItemMutationPending(itemId);
}

export function isEquipSlotMutationPending(slotId: EquipmentUiSlotId): boolean {
  return getPendingIntentRegistry().isEquipSlotMutationPending(slotId);
}

export function subscribeItemMutationPending(listener: () => void): () => void {
  return getPendingIntentRegistry().subscribeChange(listener);
}
