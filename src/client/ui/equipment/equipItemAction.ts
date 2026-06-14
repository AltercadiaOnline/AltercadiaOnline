import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import * as InventoryService from '../../services/inventory/InventoryService.js';

/** @deprecated Use InventoryService — mantido para imports legados na UI. */
export function dispatchEquipFromInventory(itemId: string, slot?: EquipmentUiSlotId): boolean {
  return InventoryService.equipFromInventory(itemId, slot).ok;
}

/** @deprecated Use InventoryService — mantido para imports legados na UI. */
export function dispatchUnequipFromSlot(slotId: EquipmentUiSlotId): boolean {
  return InventoryService.unequipFromSlot(slotId).ok;
}

/** @deprecated Use InventoryService — mantido para imports legados na UI. */
export function dispatchEquipItem(itemId: string, slot?: EquipmentUiSlotId): boolean {
  return InventoryService.toggleItemSlot(itemId, slot).ok;
}
