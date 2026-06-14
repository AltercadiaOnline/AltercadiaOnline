import type { EquipmentUiGridState, EquipmentUiSlotId } from './equipmentUiSlots.js';
import type { InventorySlotState } from './inventorySlots.js';
import { resolveItemWeight, stackWeight } from '../items/itemWeight.js';

/** CAP base + bônus por nível: 400 + (level - 1) × 20. */
export const BASE_CARRY_CAPACITY = 400;
export const CARRY_CAPACITY_PER_LEVEL = 20;

/** A partir de 90% da CAP, UI entra em alerta amarelo. */
export const CAPACITY_WARNING_RATIO = 0.9;

export type CapacityVisualLevel = 'normal' | 'warning' | 'overload';

export type CarryCapacityInput = {
  readonly inventorySlots: readonly InventorySlotState[];
  readonly equipment: EquipmentUiGridState;
  readonly playerLevel: number;
};

export type CarryCapacitySnapshot = {
  readonly currentWeight: number;
  readonly maxWeight: number;
  readonly inventoryWeight: number;
  readonly equipmentWeight: number;
  readonly isEncumbered: boolean;
  /** @deprecated Use isEncumbered */
  readonly isOverloaded: boolean;
  readonly visualLevel: CapacityVisualLevel;
  readonly formatted: string;
};

export function resolveCapacityVisualLevel(
  currentWeight: number,
  maxWeight: number,
): CapacityVisualLevel {
  if (maxWeight <= 0) return 'normal';
  const ratio = currentWeight / maxWeight;
  if (ratio >= 1) return 'overload';
  if (ratio >= CAPACITY_WARNING_RATIO) return 'warning';
  return 'normal';
}

export function resolveMaxCarryCapacity(playerLevel: number): number {
  const level = Math.max(1, Math.floor(playerLevel));
  return BASE_CARRY_CAPACITY + (level - 1) * CARRY_CAPACITY_PER_LEVEL;
}

export function calculateInventoryWeight(slots: readonly InventorySlotState[]): number {
  let total = 0;
  for (const slot of slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    total += stackWeight(slot.itemId, slot.quantity);
  }
  return roundWeight(total);
}

export function calculateEquipmentWeight(equipment: EquipmentUiGridState): number {
  let total = 0;
  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue;
    total += resolveItemWeight(itemId);
  }
  return roundWeight(total);
}

/** Soma SET + inventário — recalcular só em eventos de item, nunca por frame. */
export function calculateTotalWeight(input: CarryCapacityInput): CarryCapacitySnapshot {
  const inventoryWeight = calculateInventoryWeight(input.inventorySlots);
  const equipmentWeight = calculateEquipmentWeight(input.equipment);
  const currentWeight = roundWeight(inventoryWeight + equipmentWeight);
  const maxWeight = resolveMaxCarryCapacity(input.playerLevel);
  const isEncumbered = currentWeight > maxWeight;
  const visualLevel = resolveCapacityVisualLevel(currentWeight, maxWeight);

  return {
    currentWeight,
    maxWeight,
    inventoryWeight,
    equipmentWeight,
    isEncumbered,
    isOverloaded: isEncumbered,
    visualLevel,
    formatted: `CAP: ${formatWeight(currentWeight)} / ${formatWeight(maxWeight)}`,
  };
}

function cloneInventorySlots(
  slots: readonly InventorySlotState[],
): InventorySlotState[] {
  return slots.map((slot) => ({ ...slot }));
}

/** Simula retirar 1 unidade do inventário ao equipar a partir da mochila. */
function consumeOneFromInventory(
  slots: InventorySlotState[],
  itemId: string,
): InventorySlotState[] {
  const next = cloneInventorySlots(slots);
  for (let i = 0; i < next.length; i++) {
    const slot = next[i];
    if (!slot?.itemId || slot.itemId !== itemId) continue;
    if (slot.quantity <= 1) {
      next[i] = { itemId: null, quantity: 0 };
    } else {
      next[i] = { itemId, quantity: slot.quantity - 1 };
    }
    return next;
  }
  return next;
}

/** Verifica se equipar o item manteria o peso dentro da CAP. */
export function canEquipItemWeight(
  input: CarryCapacityInput,
  slotId: EquipmentUiSlotId,
  itemId: string,
): boolean {
  const equipment = { ...input.equipment, [slotId]: itemId };
  const inventorySlots = consumeOneFromInventory(
    [...input.inventorySlots],
    itemId,
  );
  const projected = calculateTotalWeight({
    inventorySlots,
    equipment,
    playerLevel: input.playerLevel,
  });
  return projected.currentWeight <= projected.maxWeight;
}

export function calculateAdditionalItemWeight(itemId: string, quantity: number): number {
  return roundWeight(stackWeight(itemId, quantity));
}

export function canAddItemWeight(
  input: CarryCapacityInput,
  itemId: string,
  quantity: number,
): boolean {
  if (quantity <= 0) return true;
  const snapshot = calculateTotalWeight(input);
  const additional = calculateAdditionalItemWeight(itemId, quantity);
  return snapshot.currentWeight + additional <= snapshot.maxWeight;
}

/** Máximo adicionável sem estourar CAP (busca binária sobre a quantidade pedida). */
export function resolveMaxAddableItemQuantity(
  input: CarryCapacityInput,
  itemId: string,
  requestedQuantity: number,
): number {
  const qty = Math.max(0, Math.floor(requestedQuantity));
  if (qty <= 0) return 0;

  let lo = 0;
  let hi = qty;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (canAddItemWeight(input, itemId, mid)) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export function formatWeight(value: number): string {
  return value.toFixed(1);
}

function roundWeight(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export const CAPACITY_OVERLOAD_MESSAGE = 'Você está muito pesado para carregar isso';
