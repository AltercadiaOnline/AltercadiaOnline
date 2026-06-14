import type { InventoryStack } from './equipmentState.js';
import type { EquipmentUiGridState, EquipmentUiSlotId } from './equipmentUiSlots.js';
import {
  EQUIPMENT_UI_SLOT_ORDER,
  createEmptyEquipmentUiGrid,
  equipmentUiGridToEquipped,
  equippedToEquipmentUiGrid,
} from './equipmentUiSlots.js';
import {
  canItemFitUiSlot,
  resolveTargetUiSlotForEquip,
} from './equipItemMapping.js';
import {
  inventorySlotsToStacks,
  stacksToInventorySlotsWithStacking,
} from './inventoryStackOps.js';
import { removeEquippedItemsFromUiGrid } from './syncInventoryWithEquipment.js';
import type { InventorySlotState } from './inventorySlots.js';
import { INVENTORY_SLOT_COUNT, stacksToInventorySlots } from './inventorySlots.js';

/** Slot do item — mochila ou posição visual do SET. */
export const ItemLocationSlot = {
  Inventory: 'inventory',
} as const;

export type ItemLocationSlotId = typeof ItemLocationSlot.Inventory | EquipmentUiSlotId;

export type PlayerItemRecord = {
  readonly instanceId: string;
  readonly itemId: string;
  slot: ItemLocationSlotId;
  quantity: number;
  readonly charges?: number;
  readonly lockedQuantity?: number;
};

export type ItemSlotMutationFailure =
  | 'invalid_slot'
  | 'not_equippable'
  | 'blocked_swap';

export type ItemSlotMutationResult =
  | { readonly ok: true; readonly items: PlayerItemRecord[]; readonly uiSlotId: EquipmentUiSlotId }
  | { readonly ok: false; readonly reason: ItemSlotMutationFailure };

let instanceSeq = 0;

function nextInstanceId(prefix: string, itemId: string): string {
  instanceSeq += 1;
  return `${prefix}:${itemId}:${instanceSeq}`;
}

function cloneItems(items: readonly PlayerItemRecord[]): PlayerItemRecord[] {
  return items.map((row) => ({ ...row }));
}

function buildEquipmentGridFromItems(items: readonly PlayerItemRecord[]): EquipmentUiGridState {
  const grid = createEmptyEquipmentUiGrid();
  for (const row of items) {
    if (row.slot === ItemLocationSlot.Inventory) continue;
    grid[row.slot] = row.itemId;
  }
  return grid;
}

function findInventoryRow(items: readonly PlayerItemRecord[], itemId: string): number {
  return items.findIndex(
    (row) => row.itemId === itemId && row.slot === ItemLocationSlot.Inventory && row.quantity > 0,
  );
}

function findEquippedRow(items: readonly PlayerItemRecord[], slot: EquipmentUiSlotId): number {
  return items.findIndex((row) => row.slot === slot);
}

/** Monta array autoritativo a partir do snapshot do servidor. */
export function buildItemRecordsFromServerBundle(
  stacks: readonly InventoryStack[],
  uiGrid?: EquipmentUiGridState,
  equipped?: import('./equipmentState.js').EquippedSlots,
): PlayerItemRecord[] {
  const grid = uiGrid ?? equippedToEquipmentUiGrid(equipped ?? {});
  const hasEquipped = EQUIPMENT_UI_SLOT_ORDER.some((slotId) => Boolean(grid[slotId]));
  const inventoryStacks = hasEquipped ? removeEquippedItemsFromUiGrid(stacks, grid) : stacks;
  const items: PlayerItemRecord[] = [];

  for (const stack of inventoryStacks) {
    items.push({
      instanceId: nextInstanceId('inv', stack.itemId),
      itemId: stack.itemId,
      slot: ItemLocationSlot.Inventory,
      quantity: stack.quantity,
      ...(stack.charges !== undefined ? { charges: stack.charges } : {}),
      ...(stack.lockedQuantity !== undefined ? { lockedQuantity: stack.lockedQuantity } : {}),
    });
  }

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    const itemId = grid[slotId];
    if (!itemId) continue;
    items.push({
      instanceId: nextInstanceId('eq', itemId),
      itemId,
      slot: slotId,
      quantity: 1,
    });
  }

  return items;
}

export function inventoryStacksFromItems(items: readonly PlayerItemRecord[]): InventoryStack[] {
  const invRows = items.filter((row) => row.slot === ItemLocationSlot.Inventory);
  const slots = stacksToInventorySlotsWithStacking(
    invRows.map((row) => ({
      itemId: row.itemId,
      quantity: row.quantity,
      ...(row.charges !== undefined ? { charges: row.charges } : {}),
      ...(row.lockedQuantity !== undefined ? { lockedQuantity: row.lockedQuantity } : {}),
    })),
  );
  return inventorySlotsToStacks(slots);
}

export function inventorySlotsFromItems(items: readonly PlayerItemRecord[]): InventorySlotState[] {
  const coalesced = coalescePlayerItemRecords(items);
  const grid = equipmentGridFromItems(coalesced);
  const stacks = inventoryStacksFromItems(coalesced);
  const dedupedStacks = removeEquippedItemsFromUiGrid(stacks, grid);
  return stacksToInventorySlots(dedupedStacks, INVENTORY_SLOT_COUNT);
}

export function equipmentGridFromItems(items: readonly PlayerItemRecord[]): EquipmentUiGridState {
  return buildEquipmentGridFromItems(items);
}

export function equippedSlotsFromItems(items: readonly PlayerItemRecord[]) {
  return equipmentUiGridToEquipped(buildEquipmentGridFromItems(items));
}

/** Garante que itens vestidos no SET não permaneçam também na mochila. */
export function coalescePlayerItemRecords(items: readonly PlayerItemRecord[]): PlayerItemRecord[] {
  const grid = equipmentGridFromItems(items);
  const stacks = inventoryStacksFromItems(items);
  const dedupedStacks = removeEquippedItemsFromUiGrid(stacks, grid);

  const chargesBySlot = new Map<EquipmentUiSlotId, number>();
  for (const row of items) {
    if (row.slot === ItemLocationSlot.Inventory) continue;
    if (row.charges !== undefined) {
      chargesBySlot.set(row.slot, row.charges);
    }
  }

  const coalesced = buildItemRecordsFromServerBundle(dedupedStacks, grid);
  return coalesced.map((row) => {
    if (row.slot === ItemLocationSlot.Inventory) return row;
    const charges = chargesBySlot.get(row.slot);
    return charges !== undefined ? { ...row, charges } : row;
  });
}

/** Equipa: atualiza `slot` do item (sem clonar — qty>1 divide o registro). */
export function assignItemToEquipmentSlot(
  items: readonly PlayerItemRecord[],
  itemId: string,
  preferredUiSlot?: EquipmentUiSlotId,
): ItemSlotMutationResult {
  const grid = buildEquipmentGridFromItems(items);
  const uiSlotId = resolveTargetUiSlotForEquip(grid, itemId, preferredUiSlot);
  if (!uiSlotId || !canItemFitUiSlot(itemId, uiSlotId)) {
    return { ok: false, reason: 'not_equippable' };
  }

  const invIdx = findInventoryRow(items, itemId);
  if (invIdx < 0) {
    return { ok: false, reason: 'invalid_slot' };
  }

  const next = cloneItems(items);
  const invRow = next[invIdx]!;
  const occupantIdx = findEquippedRow(next, uiSlotId);
  const occupantId = occupantIdx >= 0 ? next[occupantIdx]!.itemId : null;

  if (occupantId && occupantId !== itemId) {
    const swapTargetIdx = findInventoryRow(next, occupantId);
    if (swapTargetIdx < 0 && invRow.quantity <= 1) {
      return { ok: false, reason: 'blocked_swap' };
    }
    if (occupantIdx >= 0) {
      next[occupantIdx]!.slot = ItemLocationSlot.Inventory;
      next[occupantIdx]!.quantity = 1;
    }
  }

  if (invRow.quantity > 1) {
    invRow.quantity -= 1;
    next.push({
      instanceId: nextInstanceId('eq', itemId),
      itemId,
      slot: uiSlotId,
      quantity: 1,
      ...(invRow.charges !== undefined ? { charges: invRow.charges } : {}),
    });
  } else {
    invRow.slot = uiSlotId;
    invRow.quantity = 1;
  }

  if (occupantId && occupantId !== itemId && occupantIdx >= 0) {
    const mergedInvIdx = findInventoryRow(next, occupantId);
    if (mergedInvIdx >= 0 && mergedInvIdx !== occupantIdx) {
      next[mergedInvIdx]!.quantity += 1;
      next.splice(occupantIdx, 1);
    }
  }

  return { ok: true, items: coalescePlayerItemRecords(next), uiSlotId };
}

/** Desequipa: `slot` volta para `inventory`. */
export function assignEquipmentSlotToInventory(
  items: readonly PlayerItemRecord[],
  uiSlotId: EquipmentUiSlotId,
): ItemSlotMutationResult | { readonly ok: false; readonly reason: 'empty' | 'inventory_full' } {
  const eqIdx = findEquippedRow(items, uiSlotId);
  if (eqIdx < 0) {
    return { ok: false, reason: 'empty' };
  }

  const next = cloneItems(items);
  const row = next[eqIdx]!;
  const mergeIdx = findInventoryRow(next, row.itemId);

  if (mergeIdx >= 0) {
    next[mergeIdx]!.quantity += 1;
    next.splice(eqIdx, 1);
  } else {
    row.slot = ItemLocationSlot.Inventory;
  }

  const slots = stacksToInventorySlots(inventoryStacksFromItems(next), INVENTORY_SLOT_COUNT);
  const used = slots.filter((slot) => slot.itemId).length;
  if (used > INVENTORY_SLOT_COUNT) {
    return { ok: false, reason: 'inventory_full' };
  }

  return { ok: true, items: coalescePlayerItemRecords(next), uiSlotId };
}

export function filterItemsBySlot(
  items: readonly PlayerItemRecord[],
  slot: ItemLocationSlotId,
): readonly PlayerItemRecord[] {
  return items.filter((row) => row.slot === slot);
}

export function filterInventoryItems(items: readonly PlayerItemRecord[]): readonly PlayerItemRecord[] {
  return filterItemsBySlot(items, ItemLocationSlot.Inventory);
}

export function filterEquippedItems(items: readonly PlayerItemRecord[]): readonly PlayerItemRecord[] {
  return items.filter((row) => row.slot !== ItemLocationSlot.Inventory);
}

/**
 * Preserva SET local quando o servidor ainda não espelhou o equipamento
 * (ex.: loot pós-batalha com grid vazio, mas elmo/armadura vestidos no cliente).
 * Só mantém slot local se o item não voltou para os stacks autoritativos.
 */
export function mergeEquipmentUiGridPreservingLocalEquipped(
  serverGrid: EquipmentUiGridState,
  localGrid: EquipmentUiGridState,
  serverStacks: readonly InventoryStack[],
): EquipmentUiGridState {
  const merged: EquipmentUiGridState = { ...serverGrid };
  const stackQty = new Map<string, number>();

  for (const row of serverStacks) {
    stackQty.set(row.itemId, (stackQty.get(row.itemId) ?? 0) + row.quantity);
  }

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    if (merged[slotId]) continue;

    const localItemId = localGrid[slotId];
    if (!localItemId) continue;
    if ((stackQty.get(localItemId) ?? 0) > 0) continue;

    merged[slotId] = localItemId;
  }

  return merged;
}

/** itemId presente na mochila e no SET ao mesmo tempo — estado inválido para MMO. */
export function findInventoryEquipmentOverlap(
  items: readonly PlayerItemRecord[],
): readonly string[] {
  const equippedIds = new Set<string>();
  for (const row of items) {
    if (row.slot === ItemLocationSlot.Inventory) continue;
    equippedIds.add(row.itemId);
  }
  const overlap: string[] = [];
  for (const row of items) {
    if (row.slot !== ItemLocationSlot.Inventory) continue;
    if (equippedIds.has(row.itemId) && !overlap.includes(row.itemId)) {
      overlap.push(row.itemId);
    }
  }
  return overlap;
}
