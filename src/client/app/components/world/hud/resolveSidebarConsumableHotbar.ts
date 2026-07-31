import type { InventoryStack } from '../../../../../shared/character/equipmentState.js';
import { getConsumableDefinition } from '../../../../../shared/items/consumablesCatalog.js';
import { ConsumableEffectType } from '../../../../../shared/items/itemTypes.js';
import { resolveInventoryItemLabel } from '../../../../ui/inventory/inventoryItemDisplay.js';

export const SIDEBAR_CONSUMABLE_HOTBAR_SLOTS = 4;

export type SidebarConsumableHotbarEntry = {
  readonly itemId: string;
  readonly quantity: number;
  readonly label: string;
  readonly healValue: number;
};

function healValueOf(itemId: string): number {
  const def = getConsumableDefinition(itemId);
  if (!def) return 0;
  let best = 0;
  for (const effect of def.effects) {
    if (effect.type === ConsumableEffectType.HealHp) {
      best = Math.max(best, effect.value);
    }
  }
  return best;
}

/**
 * Espelho do inventário — até N consumíveis (poções), heal primeiro.
 * Não muta store; só seleciona o que mostrar na hotbar lateral.
 */
export function resolveSidebarConsumableHotbar(
  stacks: readonly InventoryStack[],
  maxSlots: number = SIDEBAR_CONSUMABLE_HOTBAR_SLOTS,
): readonly SidebarConsumableHotbarEntry[] {
  const byId = new Map<string, number>();
  for (const stack of stacks) {
    if (stack.quantity <= 0) continue;
    if (!getConsumableDefinition(stack.itemId)) continue;
    byId.set(stack.itemId, (byId.get(stack.itemId) ?? 0) + stack.quantity);
  }

  const rows: SidebarConsumableHotbarEntry[] = [];
  for (const [itemId, quantity] of byId) {
    rows.push({
      itemId,
      quantity,
      label: resolveInventoryItemLabel(itemId),
      healValue: healValueOf(itemId),
    });
  }

  rows.sort((a, b) => {
    if (a.healValue !== b.healValue) return b.healValue - a.healValue;
    return a.itemId.localeCompare(b.itemId);
  });

  return rows.slice(0, Math.max(0, maxSlots));
}
