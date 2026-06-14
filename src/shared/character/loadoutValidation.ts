import { canItemFitUiSlot } from './equipItemMapping.js';
import type { InventoryStack } from './equipmentState.js';
import {
  EQUIPMENT_UI_SLOT_ORDER,
  type EquipmentUiGridState,
  type EquipmentUiSlotId,
} from './equipmentUiSlots.js';

function countItems(pool: Map<string, number>, itemId: string, delta: number): void {
  pool.set(itemId, (pool.get(itemId) ?? 0) + delta);
}

/** Pool = mochila + itens atualmente vestidos (equip não duplica na bag). */
function buildLoadoutItemPool(
  inventory: readonly InventoryStack[],
  currentGrid: EquipmentUiGridState,
): Map<string, number> {
  const pool = new Map<string, number>();

  for (const row of inventory) {
    countItems(pool, row.itemId, row.quantity);
  }
  for (const itemId of Object.values(currentGrid)) {
    if (itemId) countItems(pool, itemId, 1);
  }

  return pool;
}

/**
 * Valida transição de SET — cada item do grid futuro deve existir no pool
 * (inventário autoritativo + equipamento atual).
 */
export function validateLoadoutTransition(
  nextGrid: EquipmentUiGridState,
  inventory: readonly InventoryStack[],
  currentGrid: EquipmentUiGridState,
): boolean {
  const pool = buildLoadoutItemPool(inventory, currentGrid);

  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    const itemId = nextGrid[slotId];
    if (!itemId) continue;
    if (!canItemFitUiSlot(itemId, slotId)) return false;

    const remaining = (pool.get(itemId) ?? 0) - 1;
    if (remaining < 0) return false;
    pool.set(itemId, remaining);
  }

  return true;
}

export function sanitizeEquipmentUiGrid(grid: EquipmentUiGridState): EquipmentUiGridState {
  const next = { ...grid };
  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    const itemId = next[slotId];
    if (!itemId || !canItemFitUiSlot(itemId, slotId)) {
      next[slotId] = null;
    }
  }
  return next;
}

export function resolveEquippedSlotForItem(
  grid: EquipmentUiGridState,
  itemId: string,
): EquipmentUiSlotId | null {
  for (const slotId of EQUIPMENT_UI_SLOT_ORDER) {
    if (grid[slotId] === itemId) return slotId;
  }
  return null;
}
