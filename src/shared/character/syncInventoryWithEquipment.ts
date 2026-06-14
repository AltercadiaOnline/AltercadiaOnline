import type { EquippedSlots, InventoryStack } from './equipmentState.js';
import type { EquipmentUiGridState } from './equipmentUiSlots.js';
import type { InventorySlotState } from './inventorySlots.js';
import {
  consumeOneFromInventorySlotIndex,
  inventorySlotsToStacks,
  stacksToInventorySlotsWithStacking,
} from './inventoryStackOps.js';

function equippedItemIds(equipped: EquippedSlots): readonly string[] {
  return [
    equipped.head,
    equipped.top,
    equipped.bottom,
    equipped.ring,
    equipped.amulet,
    equipped.book,
    equipped.rune,
  ].filter((itemId): itemId is string => Boolean(itemId));
}

/** Remove do inventário cada item atualmente vestido no SET (1 cópia por slot equipado). */
export function removeEquippedItemsFromInventorySlots(
  slots: readonly InventorySlotState[],
  equipped: EquippedSlots,
): InventorySlotState[] {
  let next = slots.map((slot) => ({ ...slot }));

  for (const itemId of equippedItemIds(equipped)) {
    const slotIndex = next.findIndex((slot) => slot.itemId === itemId && slot.quantity > 0);
    if (slotIndex < 0) continue;

    const consumed = consumeOneFromInventorySlotIndex(next, slotIndex);
    if (consumed) {
      next = consumed.slots;
    }
  }

  return next;
}

export function removeEquippedItemsFromInventoryStacks(
  stacks: readonly InventoryStack[],
  equipped: EquippedSlots,
): InventoryStack[] {
  const slots = stacksToInventorySlotsWithStacking(stacks);
  const next = removeEquippedItemsFromInventorySlots(slots, equipped);
  return inventorySlotsToStacks(next);
}

/** Dedupe por grade UI — remove 1 cópia por slot vestido (anel E/D separados). */
export function removeEquippedItemsFromUiGrid(
  stacks: readonly InventoryStack[],
  grid: EquipmentUiGridState,
): InventoryStack[] {
  let next = stacksToInventorySlotsWithStacking(stacks).map((slot) => ({ ...slot }));

  for (const itemId of Object.values(grid)) {
    if (!itemId) continue;
    const slotIndex = next.findIndex((slot) => slot.itemId === itemId && slot.quantity > 0);
    if (slotIndex < 0) continue;

    const consumed = consumeOneFromInventorySlotIndex(next, slotIndex);
    if (consumed) {
      next = consumed.slots;
    }
  }

  return inventorySlotsToStacks(next);
}
