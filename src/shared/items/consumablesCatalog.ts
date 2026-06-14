import { ItemCategory } from './itemSchema.js';
import { CATALOG_ENTRIES } from './itemCatalogEntries.js';
import { catalogItemToLegacy } from './catalogLegacyAdapter.js';
import type { ConsumableDefinition } from './itemTypes.js';
import { ItemKind } from './itemTypes.js';

export const CONSUMABLES_CATALOG: readonly ConsumableDefinition[] = CATALOG_ENTRIES
  .filter((item) => item.category === ItemCategory.Potion)
  .map((item) => catalogItemToLegacy(item) as ConsumableDefinition);

const byId = new Map(CONSUMABLES_CATALOG.map((item) => [item.id, item]));

export function getConsumableDefinition(itemId: string): ConsumableDefinition | undefined {
  return byId.get(itemId);
}
