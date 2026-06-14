import type { EquipmentUiSlotId as SlotId } from '../../../shared/character/equipmentUiSlots.js';
import {
  findCompatibleEquipmentUiSlot,
} from '../../../shared/character/equipItemMapping.js';
import { equipInventoryItemToSet } from './equipFromInventory.js';

export function findCompatibleEquipmentSlot(itemId: string): SlotId | null {
  return findCompatibleEquipmentUiSlot(itemId);
}

export function tryEquipFromInventory(itemId: string): boolean {
  return equipInventoryItemToSet(itemId).ok;
}
