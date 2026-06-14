import type { EquippedSlots, InventoryStack } from '../character/equipmentState.js';
import {
  getBookDefinition,
  getEquipableItem,
  getRuneDefinition,
} from '../items/itemCatalog.js';
import { resolveEquippedStackCharges } from '../items/chargedEquipment.js';

const EQUIPPED_SLOT_FIELDS = [
  'head',
  'top',
  'bottom',
  'ring',
  'amulet',
  'book',
  'rune',
] as const satisfies readonly (keyof EquippedSlots)[];

function availableStackQuantity(stack: InventoryStack): number {
  return Math.max(0, stack.quantity - (stack.lockedQuantity ?? 0));
}

function inventoryOwnsEquipable(
  inventory: readonly InventoryStack[],
  itemId: string,
): boolean {
  const row = inventory.find((stack) => stack.itemId === itemId);
  return row !== undefined && availableStackQuantity(row) >= 1;
}

function itemMatchesEquippedField(itemId: string, field: keyof EquippedSlots): boolean {
  if (field === 'rune') {
    return Boolean(getRuneDefinition(itemId));
  }
  if (field === 'book') {
    return Boolean(getBookDefinition(itemId));
  }

  const equip = getEquipableItem(itemId);
  if (!equip) return false;
  return equip.slot === field;
}

function inventoryOwnsForSlot(
  inventory: readonly InventoryStack[],
  itemId: string,
  field: keyof EquippedSlots,
): boolean {
  if (!itemMatchesEquippedField(itemId, field)) return false;

  if (field === 'rune' || field === 'book') {
    return resolveEquippedStackCharges(inventory, itemId) > 0;
  }

  return inventoryOwnsEquipable(inventory, itemId);
}

function ownsEquippedSlot(
  inventory: readonly InventoryStack[],
  currentEquipped: EquippedSlots,
  itemId: string,
  field: keyof EquippedSlots,
): boolean {
  if (!itemMatchesEquippedField(itemId, field)) return false;

  if (currentEquipped[field] === itemId) return true;

  return inventoryOwnsForSlot(inventory, itemId, field);
}

/**
 * Converte snapshot do cliente em equipamento autoritativo.
 * Campos ausentes no snapshot são ignorados; null/'' limpa o slot.
 * Itens já vestidos em `currentEquipped` permanecem válidos mesmo dedupados da mochila.
 */
export function authorizeEquippedSnapshot(
  snapshot: EquippedSlots,
  inventory: readonly InventoryStack[],
  currentEquipped: EquippedSlots = {},
): EquippedSlots {
  const authorized: EquippedSlots = {};

  for (const field of EQUIPPED_SLOT_FIELDS) {
    if (!(field in snapshot)) continue;

    const itemId = snapshot[field];
    if (itemId == null || itemId === '') {
      authorized[field] = null;
      continue;
    }

    authorized[field] = ownsEquippedSlot(inventory, currentEquipped, itemId, field) ? itemId : null;
  }

  return authorized;
}

/** Mescla snapshot validado sobre o equipamento persistido (campos omitidos permanecem). */
export function mergeAuthorizedEquippedSnapshot(
  current: EquippedSlots,
  snapshot: EquippedSlots,
  inventory: readonly InventoryStack[],
): EquippedSlots {
  const patch = authorizeEquippedSnapshot(snapshot, inventory, current);
  return { ...current, ...patch };
}
