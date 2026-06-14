import type { EquippedSlots, InventoryStack } from './equipmentState.js';
import {
  consumeOneFromInventorySlotIndex,
  addItemToInventorySlots,
  inventorySlotsToStacks,
} from './inventoryStackOps.js';
import {
  INVENTORY_SLOT_COUNT,
  stacksToInventorySlots,
} from './inventorySlots.js';
import { resolveEquippedFieldForItem } from './equipItemMapping.js';

export type EquipInventoryTransactionFailureReason =
  | 'invalid_slot'
  | 'not_equippable'
  | 'blocked_swap'
  | 'inventory_full';

export type EquipInventoryTransactionResult =
  | {
      readonly ok: true;
      readonly inventory: InventoryStack[];
      readonly equipped: EquippedSlots;
      readonly itemId: string;
      readonly equippedField: keyof EquippedSlots;
    }
  | { readonly ok: false; readonly reason: EquipInventoryTransactionFailureReason };

export type UnequipInventoryTransactionFailureReason = 'empty' | 'inventory_full';

export type UnequipInventoryTransactionResult =
  | {
      readonly ok: true;
      readonly inventory: InventoryStack[];
      readonly equipped: EquippedSlots;
      readonly itemId: string;
    }
  | { readonly ok: false; readonly reason: UnequipInventoryTransactionFailureReason };

function cloneEquipped(equipped: EquippedSlots): EquippedSlots {
  return { ...equipped };
}

/** Resolve slot atual pelo itemId (sempre fresh — não confiar em índice cacheado na UI). */
export function resolveInventorySlotIndexForItem(
  inventory: readonly InventoryStack[],
  itemId: string,
): number {
  const slots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT);
  return slots.findIndex((slot) => slot.itemId === itemId && slot.quantity > 0);
}

/** Consome 1 unidade e equipa — uma única mutação, sem dedupe extra (evita duplicar/remover 2x). */
export function applyEquipFromInventoryItem(
  inventory: readonly InventoryStack[],
  equipped: EquippedSlots,
  itemId: string,
): EquipInventoryTransactionResult {
  const slots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT);
  const slotIndex = resolveInventorySlotIndexForItem(inventory, itemId);
  if (slotIndex < 0) {
    return { ok: false, reason: 'invalid_slot' };
  }

  const slot = slots[slotIndex];
  if (!slot?.itemId || slot.itemId !== itemId || slot.quantity <= 0) {
    return { ok: false, reason: 'invalid_slot' };
  }

  const equippedField = resolveEquippedFieldForItem(itemId);
  if (!equippedField) {
    return { ok: false, reason: 'not_equippable' };
  }

  let nextSlots = slots.map((row) => ({ ...row }));
  let nextEquipped = cloneEquipped(equipped);
  const occupiedId = nextEquipped[equippedField] ?? null;

  if (occupiedId && occupiedId !== itemId) {
    const swapPreview = addItemToInventorySlots(nextSlots, occupiedId, 1);
    if (swapPreview.added < 1) {
      return { ok: false, reason: 'blocked_swap' };
    }
    nextSlots = swapPreview.slots;
    nextEquipped[equippedField] = null;
  }

  const consumed = consumeOneFromInventorySlotIndex(nextSlots, slotIndex);
  if (!consumed) {
    return { ok: false, reason: 'invalid_slot' };
  }
  nextSlots = consumed.slots;

  if (occupiedId !== itemId) {
    nextEquipped[equippedField] = itemId;
  }

  return {
    ok: true,
    inventory: inventorySlotsToStacks(nextSlots),
    equipped: nextEquipped,
    itemId,
    equippedField,
  };
}

/** @deprecated Prefer applyEquipFromInventoryItem — slotIndex da UI fica stale após 1º equip. */
export function applyEquipFromInventorySlot(
  inventory: readonly InventoryStack[],
  equipped: EquippedSlots,
  slotIndex: number,
  expectedItemId?: string,
): EquipInventoryTransactionResult {
  const slots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT);
  const slot = slots[slotIndex];
  if (!slot?.itemId || slot.quantity <= 0) {
    return { ok: false, reason: 'invalid_slot' };
  }
  if (expectedItemId && slot.itemId !== expectedItemId) {
    return { ok: false, reason: 'invalid_slot' };
  }
  return applyEquipFromInventoryItem(inventory, equipped, slot.itemId);
}

/** Remove do SET e devolve 1 unidade ao inventário. */
export function applyUnequipToInventory(
  inventory: readonly InventoryStack[],
  equipped: EquippedSlots,
  equippedField: keyof EquippedSlots,
): UnequipInventoryTransactionResult {
  const itemId = equipped[equippedField];
  if (!itemId) {
    return { ok: false, reason: 'empty' };
  }

  const slots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT);
  const preview = addItemToInventorySlots(slots, itemId, 1);
  if (preview.added < 1) {
    return { ok: false, reason: 'inventory_full' };
  }

  const nextEquipped = cloneEquipped(equipped);
  nextEquipped[equippedField] = null;

  return {
    ok: true,
    inventory: inventorySlotsToStacks(preview.slots),
    equipped: nextEquipped,
    itemId,
  };
}
