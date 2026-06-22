import { getItemMechanicalById } from '../items/itemCatalog.js';
import { EquipmentUiSlotId, type EquipmentUiSlotId as UiSlotId } from './equipmentUiSlots.js';

/** Calças (P) → legs; botas (B) → boots — slot canônico do catálogo. */
export function resolveCatalogBottomUiSlot(itemId: string): UiSlotId {
  const slotCode = getItemMechanicalById(itemId)?.slot;
  if (slotCode === 'B') return EquipmentUiSlotId.Boots;
  return EquipmentUiSlotId.Legs;
}

export function alternateBottomUiSlot(slotId: UiSlotId): UiSlotId {
  return slotId === EquipmentUiSlotId.Legs
    ? EquipmentUiSlotId.Boots
    : EquipmentUiSlotId.Legs;
}
