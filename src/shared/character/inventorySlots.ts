import type { InventoryStack } from './equipmentState.js';
import { stacksToInventorySlotsWithStacking } from './inventoryStackOps.js';

/** Capacidade fixa do inventário do jogador (10×4 — wide MMO). */
export const INVENTORY_SLOT_COUNT = 40;

export const INVENTORY_GRID_COLUMNS = 10;

export const INVENTORY_GRID_ROWS = INVENTORY_SLOT_COUNT / INVENTORY_GRID_COLUMNS;

export type InventorySlotState = {
  readonly itemId: string | null;
  readonly quantity: number;
  /** Runas/livros — cargas de durabilidade restantes. */
  readonly charges?: number;
  /** Unidades bloqueadas (depósito bancário em andamento). */
  readonly lockedQuantity?: number;
};

export type InventorySnapshot = {
  readonly slots: readonly InventorySlotState[];
  readonly capacity: number;
  readonly used: number;
};

export function createEmptyInventorySlots(
  count = INVENTORY_SLOT_COUNT,
): InventorySlotState[] {
  return Array.from({ length: count }, () => ({ itemId: null, quantity: 0 }));
}

export function countUsedInventorySlots(slots: readonly InventorySlotState[]): number {
  return slots.reduce((total, slot) => (slot.itemId ? total + 1 : total), 0);
}

/** Converte pilhas do servidor em slots fixos com regras de stack. */
export function stacksToInventorySlots(
  stacks: readonly InventoryStack[],
  capacity = INVENTORY_SLOT_COUNT,
): InventorySlotState[] {
  const slots = stacksToInventorySlotsWithStacking(stacks, capacity);
  const lockedByItem = new Map<string, number>();
  for (const stack of stacks) {
    const locked = stack.lockedQuantity ?? 0;
    if (locked > 0) {
      lockedByItem.set(stack.itemId, locked);
    }
  }
  if (lockedByItem.size === 0) return slots;

  return slots.map((slot) => {
    if (!slot.itemId) return slot;
    const lockedQuantity = lockedByItem.get(slot.itemId);
    return lockedQuantity ? { ...slot, lockedQuantity } : slot;
  });
}

export function buildInventorySnapshot(
  slots: readonly InventorySlotState[],
  capacity = INVENTORY_SLOT_COUNT,
): InventorySnapshot {
  return {
    slots,
    capacity,
    used: countUsedInventorySlots(slots),
  };
}
