import type { InventoryStack } from './equipmentState.js';
import {
  addItemToInventorySlots,
  consumeOneFromInventorySlotIndex,
  inventorySlotsToStacks,
} from './inventoryStackOps.js';
import {
  INVENTORY_SLOT_COUNT,
  stacksToInventorySlots,
} from './inventorySlots.js';
import {
  canItemFitUiSlot,
  resolveTargetUiSlotForEquip,
} from './equipItemMapping.js';
import {
  equipmentUiGridToEquipped,
  EQUIPMENT_UI_SLOT_ORDER,
  type EquipmentUiGridState,
  type EquipmentUiSlotId,
} from './equipmentUiSlots.js';

export type EquipUiGridFailureReason =
  | 'invalid_slot'
  | 'not_equippable'
  | 'blocked_swap';

export type EquipUiGridResult =
  | {
      readonly ok: true;
      readonly inventory: InventoryStack[];
      readonly grid: EquipmentUiGridState;
      readonly uiSlotId: EquipmentUiSlotId;
      readonly itemId: string;
    }
  | { readonly ok: false; readonly reason: EquipUiGridFailureReason };

export type UnequipUiGridFailureReason = 'empty' | 'inventory_full';

export type UnequipUiGridResult =
  | {
      readonly ok: true;
      readonly inventory: InventoryStack[];
      readonly grid: EquipmentUiGridState;
      readonly itemId: string;
    }
  | { readonly ok: false; readonly reason: UnequipUiGridFailureReason };

function cloneGrid(grid: EquipmentUiGridState): EquipmentUiGridState {
  return { ...grid };
}

/** Equipa na grade visual do SET — preserva anel E/D e pernas/botas. */
export function applyEquipToUiGrid(
  inventory: readonly InventoryStack[],
  grid: EquipmentUiGridState,
  itemId: string,
  preferredUiSlot?: EquipmentUiSlotId,
): EquipUiGridResult {
  const uiSlotId = resolveTargetUiSlotForEquip(grid, itemId, preferredUiSlot);
  if (!uiSlotId) {
    return { ok: false, reason: 'not_equippable' };
  }
  if (!canItemFitUiSlot(itemId, uiSlotId)) {
    return { ok: false, reason: 'not_equippable' };
  }

  const slotIndex = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT)
    .findIndex((row) => row.itemId === itemId && row.quantity > 0);
  if (slotIndex < 0) {
    return { ok: false, reason: 'invalid_slot' };
  }

  let nextSlots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT).map((row) => ({ ...row }));
  let nextGrid = cloneGrid(grid);
  const occupiedId = nextGrid[uiSlotId];

  if (occupiedId && occupiedId !== itemId) {
    const swapPreview = addItemToInventorySlots(nextSlots, occupiedId, 1);
    if (swapPreview.added < 1) {
      return { ok: false, reason: 'blocked_swap' };
    }
    nextSlots = swapPreview.slots;
  }

  const consumed = consumeOneFromInventorySlotIndex(nextSlots, slotIndex);
  if (!consumed) {
    return { ok: false, reason: 'invalid_slot' };
  }
  nextSlots = consumed.slots;
  nextGrid[uiSlotId] = itemId;

  return {
    ok: true,
    inventory: inventorySlotsToStacks(nextSlots),
    grid: nextGrid,
    uiSlotId,
    itemId,
  };
}

export function applyUnequipFromUiGrid(
  inventory: readonly InventoryStack[],
  grid: EquipmentUiGridState,
  uiSlotId: EquipmentUiSlotId,
): UnequipUiGridResult {
  const itemId = grid[uiSlotId];
  if (!itemId) {
    return { ok: false, reason: 'empty' };
  }

  const slots = stacksToInventorySlots(inventory, INVENTORY_SLOT_COUNT);
  const preview = addItemToInventorySlots(slots, itemId, 1);
  if (preview.added < 1) {
    return { ok: false, reason: 'inventory_full' };
  }

  const nextGrid = cloneGrid(grid);
  nextGrid[uiSlotId] = null;

  return {
    ok: true,
    inventory: inventorySlotsToStacks(preview.slots),
    grid: nextGrid,
    itemId,
  };
}

export function equippedFromUiGrid(grid: EquipmentUiGridState) {
  return equipmentUiGridToEquipped(grid);
}

export type LoadoutGridTransitionFailureReason =
  | UnequipUiGridFailureReason
  | EquipUiGridFailureReason
  | 'loadout_mismatch';

export type LoadoutGridTransitionResult =
  | { readonly ok: true; readonly inventory: InventoryStack[]; readonly grid: EquipmentUiGridState }
  | { readonly ok: false; readonly reason: LoadoutGridTransitionFailureReason };

/**
 * Aplica transição autoritativa SET ↔ mochila (equip + desequip + swap).
 * Ordem: desocupa slots alterados → equipa novos itens (grid antes de dedupe na bag).
 */
export function applyEquipmentUiGridTransition(
  inventory: readonly InventoryStack[],
  currentGrid: EquipmentUiGridState,
  nextGrid: EquipmentUiGridState,
): LoadoutGridTransitionResult {
  let inv = inventory.map((row) => ({ ...row }));
  let grid = cloneGrid(currentGrid);

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    const current = currentGrid[slotId];
    const target = nextGrid[slotId];
    if (current && current !== target) {
      const unequip = applyUnequipFromUiGrid(inv, grid, slotId);
      if (!unequip.ok) {
        return { ok: false, reason: unequip.reason };
      }
      inv = unequip.inventory;
      grid = unequip.grid;
    }
  }

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    const target = nextGrid[slotId];
    if (!target || grid[slotId] === target) continue;

    const equip = applyEquipToUiGrid(inv, grid, target, slotId);
    if (!equip.ok) {
      return { ok: false, reason: equip.reason };
    }
    inv = equip.inventory;
    grid = equip.grid;
  }

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    if (grid[slotId] !== nextGrid[slotId]) {
      return { ok: false, reason: 'loadout_mismatch' };
    }
  }

  return { ok: true, inventory: inv, grid };
}
