import type { ItemDefinition } from './itemSchema.js';
import { ItemCategory } from './itemSchema.js';

function isRegistryItemMarketListable(item: ItemDefinition): boolean {
  if (item.category === ItemCategory.Currency) return false;
  return typeof item.valorBase === 'number' && item.valorBase > 0;
}

export const MarketBrowseCategory = {
  All: 'all',
  Materials: 'materials',
  Equipment: 'equipment',
  Consumables: 'consumables',
  Runes: 'runes',
  Books: 'books',
} as const;

export type MarketBrowseCategoryId =
  (typeof MarketBrowseCategory)[keyof typeof MarketBrowseCategory];

export type MarketBrowseItem = {
  readonly itemId: string;
  readonly label: string;
  readonly categoryId: MarketBrowseCategoryId;
};

const CATEGORY_LABELS: Record<MarketBrowseCategoryId, string> = {
  all: 'ALL',
  materials: 'Materiais',
  equipment: 'Equipamentos',
  consumables: 'Consumíveis',
  runes: 'Runas',
  books: 'Livros',
};

function resolveBrowseCategoryId(item: ItemDefinition): MarketBrowseCategoryId {
  switch (item.category) {
    case ItemCategory.Equipable:
      return MarketBrowseCategory.Equipment;
    case ItemCategory.Potion:
      return MarketBrowseCategory.Consumables;
    case ItemCategory.Rune:
      return MarketBrowseCategory.Runes;
    case ItemCategory.Book:
      return MarketBrowseCategory.Books;
    default:
      return MarketBrowseCategory.Materials;
  }
}

/**
 * Registro global de itens — fonte da verdade para busca/categorias do terminal de mercado.
 * Todo item novo deve chamar `ItemRegistry.register(itemData)` ao ser definido.
 */
class ItemRegistryStore {
  private readonly byId = new Map<string, ItemDefinition>();

  /** Registra ou atualiza um item no índice de mercado. */
  register(itemData: ItemDefinition): ItemDefinition {
    const id = itemData.id.trim();
    if (!id) {
      throw new Error('[ItemRegistry] itemData.id é obrigatório.');
    }
    this.byId.set(id, itemData);
    return itemData;
  }

  registerMany(items: readonly ItemDefinition[]): void {
    for (const item of items) {
      this.register(item);
    }
  }

  getById(itemId: string): ItemDefinition | undefined {
    return this.byId.get(itemId);
  }

  listAll(): readonly ItemDefinition[] {
    return [...this.byId.values()];
  }

  /** Sincroniza catálogo canônico — chamado ao abrir a HUD do mercado. */
  syncFromCatalog(catalog: readonly ItemDefinition[]): void {
    for (const item of catalog) {
      this.register(item);
    }
  }

  getMarketBrowseCategoryLabels(): ReadonlyArray<{
    readonly id: MarketBrowseCategoryId;
    readonly label: string;
  }> {
    return (Object.keys(CATEGORY_LABELS) as MarketBrowseCategoryId[]).map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
    }));
  }

  listMarketBrowseItems(
    categoryId: MarketBrowseCategoryId,
    searchQuery = '',
  ): readonly MarketBrowseItem[] {
    const query = searchQuery.trim().toLocaleLowerCase('pt-BR');
    const items: MarketBrowseItem[] = [];

    for (const item of this.byId.values()) {
      if (!isRegistryItemMarketListable(item)) continue;
      const browseCategory = resolveBrowseCategoryId(item);
      if (categoryId !== MarketBrowseCategory.All && browseCategory !== categoryId) continue;
      if (query && !item.name.toLocaleLowerCase('pt-BR').includes(query)) continue;
      items.push({
        itemId: item.id,
        label: item.name,
        categoryId: browseCategory,
      });
    }

    return items.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  /** Apenas testes — reinicia o registro. */
  clearForTests(): void {
    this.byId.clear();
  }
}

export const ItemRegistry = new ItemRegistryStore();

/** Atalho para registrar item fora do fluxo do catálogo principal. */
export function registerGameItem(itemData: ItemDefinition): ItemDefinition {
  return ItemRegistry.register(itemData);
}
