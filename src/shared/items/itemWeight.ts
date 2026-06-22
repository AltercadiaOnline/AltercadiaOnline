import { getItemMechanicalById } from './itemCatalog.js';
import { EquipmentSlot, ItemKind } from './itemTypes.js';
import {
  DEFAULT_CONSUMABLE_WEIGHT,
  DEFAULT_CURRENCY_WEIGHT,
  DEFAULT_ITEM_WEIGHT,
  EQUIPMENT_SLOT_WEIGHT,
} from './itemWeightConstants.js';

export function resolveItemWeight(itemId: string): number {
  const catalog = getItemMechanicalById(itemId);
  if (catalog) return catalog.weight;

  return DEFAULT_ITEM_WEIGHT;
}

export function stackWeight(itemId: string, quantity: number): number {
  if (quantity <= 0) return 0;
  return resolveItemWeight(itemId) * quantity;
}

export {
  DEFAULT_CONSUMABLE_WEIGHT,
  DEFAULT_CURRENCY_WEIGHT,
  DEFAULT_ITEM_WEIGHT,
  EQUIPMENT_SLOT_WEIGHT,
} from './itemWeightConstants.js';
