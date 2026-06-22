import type { EquippedSlots, InventoryStack } from '../character/equipmentState.js';
import { getBookDefinition, getRuneDefinition } from './runesBooksCatalog.js';
import { getItemMechanicalById } from './itemCatalog.js';
import { CHARGED_EQUIPMENT_MAX_CHARGES } from './chargedEquipmentConstants.js';

export { CHARGED_EQUIPMENT_MAX_CHARGES } from './chargedEquipmentConstants.js';

export function isChargedEquipmentItemId(itemId: string): boolean {
  return Boolean(getRuneDefinition(itemId) || getBookDefinition(itemId));
}

/** Runas e livros — pilhas com campo `charges` no inventário. */
export function isChargedInventoryStackItemId(itemId: string): boolean {
  return isChargedEquipmentItemId(itemId);
}

export function resolveItemMaxCharges(itemId: string): number {
  if (isChargedEquipmentItemId(itemId)) return CHARGED_EQUIPMENT_MAX_CHARGES;
  const fromCatalog = getItemMechanicalById(itemId)?.charges;
  return fromCatalog !== undefined ? fromCatalog : 0;
}

export function resolveStackDurabilityCharges(stack: InventoryStack): number {
  const max = resolveItemMaxCharges(stack.itemId);
  if (max <= 0) {
    return stack.charges ?? 0;
  }
  const raw = stack.charges ?? max;
  return Math.max(0, Math.min(max, Math.floor(raw)));
}

export function resolveEquippedStackCharges(
  inventory: readonly InventoryStack[],
  itemId: string | null | undefined,
): number {
  if (!itemId || !isChargedEquipmentItemId(itemId)) return 0;
  const row = inventory.find((stack) => stack.itemId === itemId);
  if (!row) return CHARGED_EQUIPMENT_MAX_CHARGES;
  return resolveStackDurabilityCharges(row);
}

export function resolveEquippedRuneDurability(
  inventory: readonly InventoryStack[],
  equipped: EquippedSlots,
): number {
  return resolveEquippedStackCharges(inventory, equipped.rune);
}

export function resolveEquippedBookDurability(
  inventory: readonly InventoryStack[],
  equipped: EquippedSlots,
): number {
  return resolveEquippedStackCharges(inventory, equipped.book);
}

export function withDefaultChargedStack(stack: InventoryStack): InventoryStack {
  if (!isChargedInventoryStackItemId(stack.itemId)) return stack;
  if (stack.charges !== undefined) return stack;
  return { ...stack, charges: resolveItemMaxCharges(stack.itemId) };
}

export function normalizeChargedInventoryStacks(
  stacks: readonly InventoryStack[],
): InventoryStack[] {
  return stacks.map((stack) => withDefaultChargedStack(stack));
}

export function resolveRuneCombatProcsPerBattle(runeId: string): number {
  const rune = getRuneDefinition(runeId);
  return rune?.combatProcsPerBattle ?? 5;
}

export function resolveChargedEquipmentLabel(itemId: string): string | null {
  if (getRuneDefinition(itemId)) return 'Runa';
  if (getBookDefinition(itemId)) return 'Livro';
  return null;
}
