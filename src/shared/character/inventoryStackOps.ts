import { getItemDefinition } from '../items/itemCatalog.js';
import { getItemMechanicalById } from '../items/itemCatalog.js';
import { getConsumableDefinition } from '../items/consumablesCatalog.js';
import {
  isChargedInventoryStackItemId,
  isChargedEquipmentItemId,
  resolveItemMaxCharges,
  resolveStackDurabilityCharges,
} from '../items/chargedEquipment.js';
import { ItemKind } from '../items/itemTypes.js';
import type { InventoryStack } from './equipmentState.js';
import {
  createEmptyInventorySlots,
  INVENTORY_SLOT_COUNT,
  type InventorySlotState,
} from './inventorySlots.js';

export type InventoryStackRules = {
  readonly stackable: boolean;
  readonly maxStack: number;
};

export type AddItemToInventoryResult = {
  readonly added: number;
  readonly overflow: number;
  readonly slots: InventorySlotState[];
};

const DEFAULT_GENERIC_MAX_STACK = 99;
const DEFAULT_CURRENCY_MAX_STACK = 9999;

/** Regras de pilha por tipo de item (catálogo = fonte da verdade). */
export function resolveInventoryStackRules(itemId: string): InventoryStackRules {
  const catalogItem = getItemMechanicalById(itemId);
  if (catalogItem?.isUnique) {
    return { stackable: false, maxStack: 1 };
  }

  if (catalogItem?.charges !== undefined && (catalogItem.maxStack ?? 1) <= 1) {
    return { stackable: false, maxStack: 1 };
  }

  const item = getItemDefinition(itemId);
  if (!item) {
    return { stackable: false, maxStack: 1 };
  }

  if (item.kind === ItemKind.Consumable) {
    const consumable = getConsumableDefinition(itemId);
    return {
      stackable: true,
      maxStack: consumable?.maxStack ?? 20,
    };
  }

  if (item.kind === ItemKind.Currency || item.kind === ItemKind.Generic) {
    const maxStack = catalogItem?.maxStack
      ?? (item.kind === ItemKind.Currency ? DEFAULT_CURRENCY_MAX_STACK : DEFAULT_GENERIC_MAX_STACK);
    return {
      stackable: maxStack > 1,
      maxStack,
    };
  }

  return { stackable: false, maxStack: 1 };
}

export function findFirstEmptyInventorySlotIndex(
  slots: readonly InventorySlotState[],
): number {
  return slots.findIndex((slot) => slot.itemId === null);
}

export type ConsumeOneInventorySlotResult = {
  readonly slots: InventorySlotState[];
  readonly itemId: string;
  readonly charges?: number;
};

/** Remove 1 unidade disponível (ignora lockedQuantity) do slot indicado. */
export function consumeOneFromInventorySlotIndex(
  slots: readonly InventorySlotState[],
  slotIndex: number,
): ConsumeOneInventorySlotResult | null {
  const slot = slots[slotIndex];
  if (!slot?.itemId || slot.quantity <= 0) return null;

  const locked = Math.max(0, Math.floor(slot.lockedQuantity ?? 0));
  const available = slot.quantity - locked;
  if (available <= 0) return null;

  const next = slots.map((entry) => ({ ...entry }));
  const target = next[slotIndex];
  if (!target?.itemId) return null;

  const itemId = target.itemId;
  const charges = target.charges;
  const nextQuantity = target.quantity - 1;

  if (nextQuantity <= 0) {
    next[slotIndex] = { itemId: null, quantity: 0 };
  } else {
    next[slotIndex] = {
      itemId,
      quantity: nextQuantity,
      ...(charges !== undefined ? { charges } : {}),
      ...(locked > 0 ? { lockedQuantity: locked } : {}),
    };
  }

  return {
    slots: next,
    itemId,
    ...(charges !== undefined ? { charges } : {}),
  };
}

export function inventorySlotsToStacks(
  slots: readonly InventorySlotState[],
): InventoryStack[] {
  const stacks: InventoryStack[] = [];
  for (const slot of slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    stacks.push({
      itemId: slot.itemId,
      quantity: slot.quantity,
      ...(slot.charges !== undefined ? { charges: slot.charges } : {}),
      ...(slot.lockedQuantity !== undefined ? { lockedQuantity: slot.lockedQuantity } : {}),
    });
  }
  return stacks;
}

/**
 * Adiciona item ao inventário em slots fixos.
 * Stackables preenchem pilha existente antes de ocupar slot vazio.
 */
export function addItemToInventorySlots(
  slots: readonly InventorySlotState[],
  itemId: string,
  quantity: number,
  capacity = INVENTORY_SLOT_COUNT,
): AddItemToInventoryResult {
  if (quantity <= 0) {
    return { added: 0, overflow: 0, slots: slots.map((slot) => ({ ...slot })) };
  }

  const next = slots.map((slot) => ({ ...slot }));
  while (next.length < capacity) {
    next.push({ itemId: null, quantity: 0 });
  }

  const rules = resolveInventoryStackRules(itemId);
  let remaining = quantity;
  let added = 0;

  if (rules.stackable) {
    for (const slot of next) {
      if (remaining <= 0) break;
      if (slot.itemId !== itemId) continue;

      const space = rules.maxStack - slot.quantity;
      if (space <= 0) continue;

      const delta = Math.min(space, remaining);
      slot.quantity += delta;
      remaining -= delta;
      added += delta;
    }

    while (remaining > 0) {
      const emptyIndex = findFirstEmptyInventorySlotIndex(next);
      if (emptyIndex < 0 || emptyIndex >= capacity) break;

      const delta = Math.min(rules.maxStack, remaining);
      next[emptyIndex] = { itemId, quantity: delta };
      remaining -= delta;
      added += delta;
    }
  } else {
    const isUnique = getItemMechanicalById(itemId)?.isUnique === true;
    while (remaining > 0) {
      if (isUnique) {
        const alreadyOwned = next.some((slot) => slot.itemId === itemId && slot.quantity > 0);
        if (alreadyOwned) break;
      }

      const emptyIndex = findFirstEmptyInventorySlotIndex(next);
      if (emptyIndex < 0 || emptyIndex >= capacity) break;

      next[emptyIndex] = {
        itemId,
        quantity: 1,
        ...(isChargedInventoryStackItemId(itemId)
          ? { charges: resolveItemMaxCharges(itemId) }
          : {}),
      };
      remaining -= 1;
      added += 1;
    }
  }

  return {
    added,
    overflow: remaining,
    slots: next.slice(0, capacity),
  };
}

export function addItemToInventoryStacks(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
  capacity = INVENTORY_SLOT_COUNT,
): AddItemToInventoryResult & { stacks: InventoryStack[] } {
  const slots = stacksToInventorySlotsWithStacking(stacks, capacity);
  const result = addItemToInventorySlots(slots, itemId, quantity, capacity);
  return {
    ...result,
    stacks: inventorySlotsToStacks(result.slots),
  };
}

/** Hidrata slots respeitando stack e maxStack (não 1 pilha = 1 slot cego). */
export function stacksToInventorySlotsWithStacking(
  stacks: readonly InventoryStack[],
  capacity = INVENTORY_SLOT_COUNT,
): InventorySlotState[] {
  let slots = createEmptyInventorySlots(capacity);
  for (const stack of stacks) {
    if (stack.quantity <= 0) continue;

    if (isChargedInventoryStackItemId(stack.itemId)) {
      const emptyIndex = findFirstEmptyInventorySlotIndex(slots);
      if (emptyIndex < 0 || emptyIndex >= capacity) continue;
      slots[emptyIndex] = {
        itemId: stack.itemId,
        quantity: stack.quantity,
        charges: resolveStackDurabilityCharges(stack),
        ...(stack.lockedQuantity !== undefined ? { lockedQuantity: stack.lockedQuantity } : {}),
      };
      continue;
    }

    const result = addItemToInventorySlots(slots, stack.itemId, stack.quantity, capacity);
    slots = result.slots;
  }
  return slots;
}
