import { getItemDefinition } from '../../../shared/items/itemCatalog.js';
import { ItemKind } from '../../../shared/items/itemTypes.js';

export function resolveInventoryItemLabel(itemId: string): string {
  return getItemDefinition(itemId)?.name ?? itemId;
}

/** Abreviação exibida no quadradinho até termos sprites de item. */
export function resolveInventoryItemAbbrev(itemId: string): string {
  const item = getItemDefinition(itemId);
  if (!item) return '?';

  const words = item.name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0]!.charAt(0)}${words[1]!.charAt(0)}`.toUpperCase();
  }
  return item.name.slice(0, 2).toUpperCase();
}

export function resolveInventoryItemKindClass(itemId: string): string {
  const item = getItemDefinition(itemId);
  if (!item) return 'slot-item--kind-unknown';

  switch (item.kind) {
    case ItemKind.Equipable:
      return 'slot-item--kind-equip';
    case ItemKind.Consumable:
      return 'slot-item--kind-consumable';
    case ItemKind.Rune:
      return 'slot-item--kind-rune';
    case ItemKind.Book:
      return 'slot-item--kind-book';
    case ItemKind.Currency:
      return 'slot-item--kind-currency';
    default:
      return 'slot-item--kind-generic';
  }
}
