// @ts-nocheck
import { getConsumableDefinition } from '../../shared/items/consumablesCatalog.js';
import { ConsumableUsage } from '../../shared/items/itemTypes.js';
import { resolveInventoryItemAbbrev, resolveInventoryItemLabel, } from '../ui/inventory/inventoryItemDisplay.js';
/** Espelha `activeConsumables` do snapshot — apenas poções/tônicos de combate. */
export function resolveBattleConsumableRows(stacks) {
    if (!stacks?.length)
        return [];
    const rows = [];
    for (const stack of stacks) {
        if (stack.quantity < 1)
            continue;
        const def = getConsumableDefinition(stack.itemId);
        if (!def || def.usage !== ConsumableUsage.InCombat)
            continue;
        rows.push({
            itemId: stack.itemId,
            name: resolveInventoryItemLabel(stack.itemId),
            abbrev: resolveInventoryItemAbbrev(stack.itemId),
            quantity: stack.quantity,
        });
    }
    return rows;
}
