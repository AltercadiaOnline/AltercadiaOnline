import { EquipmentSlot, type EquipmentSlotId } from './itemTypes.js';

/** Pesos padrão por slot de equipamento (kg). */
export const EQUIPMENT_SLOT_WEIGHT: Record<EquipmentSlotId, number> = {
  [EquipmentSlot.Head]: 8,
  [EquipmentSlot.Top]: 15,
  [EquipmentSlot.Bottom]: 10,
  [EquipmentSlot.Ring]: 0.1,
  [EquipmentSlot.Amulet]: 0.2,
  [EquipmentSlot.Book]: 2,
  [EquipmentSlot.Rune]: 1,
};

export const DEFAULT_ITEM_WEIGHT = 0.15;
export const DEFAULT_CONSUMABLE_WEIGHT = 0.5;
export const DEFAULT_CURRENCY_WEIGHT = 0.001;
