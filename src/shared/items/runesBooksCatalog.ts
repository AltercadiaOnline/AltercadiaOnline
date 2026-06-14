import { ItemCategory } from './itemSchema.js';
import { CATALOG_ENTRIES } from './itemCatalogEntries.js';
import { catalogItemToLegacy } from './catalogLegacyAdapter.js';
import type { BookDefinition, RuneDefinition } from './itemTypes.js';

export const RUNES_CATALOG: readonly RuneDefinition[] = CATALOG_ENTRIES
  .filter((item) => item.category === ItemCategory.Rune)
  .map((item) => catalogItemToLegacy(item) as RuneDefinition);

export const BOOKS_CATALOG: readonly BookDefinition[] = CATALOG_ENTRIES
  .filter((item) => item.category === ItemCategory.Book)
  .map((item) => catalogItemToLegacy(item) as BookDefinition);

const runeById = new Map(RUNES_CATALOG.map((item) => [item.id, item]));
const bookById = new Map(BOOKS_CATALOG.map((item) => [item.id, item]));

export function getRuneDefinition(itemId: string): RuneDefinition | undefined {
  return runeById.get(itemId);
}

export function getBookDefinition(itemId: string): BookDefinition | undefined {
  return bookById.get(itemId);
}
