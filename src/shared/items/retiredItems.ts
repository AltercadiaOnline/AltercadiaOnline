// @ts-nocheck
/**
 * Itens aposentados do catálogo — removidos na hidratação / setInventory.
 * Diário de Memórias vive só na Ficha (conquistas), não como item.
 */
export const RETIRED_ITEM_IDS = new Set(['diario_memorias']);
export function isRetiredItemId(itemId) {
    return RETIRED_ITEM_IDS.has(itemId);
}
export function stripRetiredInventoryStacks(stacks) {
    return stacks.filter((row) => !isRetiredItemId(row.itemId));
}
