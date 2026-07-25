/**
 * Itens aposentados do catálogo — removidos na hidratação / setInventory.
 * Diário de Memórias vive só na Ficha (conquistas), não como item.
 */
export const RETIRED_ITEM_IDS: ReadonlySet<string> = new Set(['diario_memorias']);

export function isRetiredItemId(itemId: string): boolean {
  return RETIRED_ITEM_IDS.has(itemId);
}

export function stripRetiredInventoryStacks<T extends { readonly itemId: string }>(
  stacks: readonly T[],
): T[] {
  return stacks.filter((row) => !isRetiredItemId(row.itemId));
}
