import { ItemCategory, type ItemDefinition } from './itemSchema.js';

/**
 * Preço piso P2P automático para itens do catálogo sem entrada explícita em LOOT_ECONOMY_REGISTRY.
 * Todo item tradable (não-moeda) passa pelo marketplace após build do catálogo.
 */
export function resolveDefaultMarketplaceValorBase(item: ItemDefinition): number | null {
  if (item.category === ItemCategory.Currency) return null;
  if (item.isTradable === false) return null;

  const level = Math.max(1, item.requiresLevel ?? 1);

  switch (item.category) {
    case ItemCategory.Equipable:
      return 120 + level * 28;
    case ItemCategory.Potion:
      return 85;
    case ItemCategory.Rune:
      return 420;
    case ItemCategory.Book:
      return 360;
    default:
      return 28;
  }
}

/** Garante valorBase de mercado quando o item é tradable e ainda não tem economia explícita. */
export function applyMarketplaceCatalogDefaults(item: ItemDefinition): ItemDefinition {
  if (typeof item.valorBase === 'number' && item.valorBase > 0) {
    return item;
  }

  const valorBase = resolveDefaultMarketplaceValorBase(item);
  if (valorBase === null) {
    return item;
  }

  return {
    ...item,
    valorBase,
  };
}

export function isMarketplaceBrowseListableItem(item: ItemDefinition): boolean {
  if (item.category === ItemCategory.Currency) return false;
  if (item.isTradable === false) return false;
  return typeof item.valorBase === 'number' && item.valorBase > 0;
}
