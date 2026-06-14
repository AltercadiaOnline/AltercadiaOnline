import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { resolveInventoryStackRules } from '../../../shared/character/inventoryStackOps.js';
import { INVENTORY_SLOT_COUNT } from '../../../shared/character/inventorySlots.js';

const LAB_PURCHASE_UI_CAP = 99;

/** Quantidade máxima comprável — respeita saldo, pilhas e slots livres. */
export function resolveMaxLabPurchaseQuantity(
  itemId: string,
  inventory: InventorySnapshot,
  walletVolts: number,
  unitPriceVolts: number,
): number {
  if (unitPriceVolts <= 0) return 1;

  const byWallet = Math.floor(walletVolts / unitPriceVolts);
  if (byWallet <= 0) return 1;

  const rules = resolveInventoryStackRules(itemId);

  if (!rules.stackable) {
    const emptySlots = countEmptyInventorySlots(inventory);
    return Math.max(1, Math.min(byWallet, emptySlots, LAB_PURCHASE_UI_CAP));
  }

  let remainingCapacity = 0;
  for (const slot of inventory.slots) {
    if (slot.itemId === itemId && slot.quantity > 0) {
      remainingCapacity += Math.max(0, rules.maxStack - slot.quantity);
    }
  }

  for (const slot of inventory.slots) {
    if (!slot.itemId) {
      remainingCapacity += rules.maxStack;
    }
  }

  return Math.max(1, Math.min(byWallet, remainingCapacity, LAB_PURCHASE_UI_CAP));
}

function countEmptyInventorySlots(inventory: InventorySnapshot): number {
  let empty = 0;
  const capacity = Math.min(inventory.capacity, INVENTORY_SLOT_COUNT);
  for (let i = 0; i < capacity; i += 1) {
    const slot = inventory.slots[i];
    if (!slot?.itemId) empty += 1;
  }
  return empty;
}

/** Atalhos rápidos de quantidade para poções empilháveis. */
export function resolveLabQuantityPresets(maxQuantity: number): readonly number[] {
  const presets = [1, 5, 10, 20].filter((value) => value <= maxQuantity);
  if (presets.length === 0 || presets[presets.length - 1] !== maxQuantity) {
    if (maxQuantity > 1 && !presets.includes(maxQuantity)) {
      return [...presets, maxQuantity];
    }
  }
  return presets.length > 0 ? presets : [1];
}
