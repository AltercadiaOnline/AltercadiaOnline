/**
 * Lookup autoritativo síncrono — servidor e lógica compartilhada que exige efeitos/stats.
 * Importa metadados estendidos estaticamente (sem lazy load).
 */
import {
  buildItemCatalogCoreRecord,
  buildItemCatalogMechanicalRecord,
} from './itemCatalogEntries.js';
import { ITEM_CATALOG_EXTRA_BY_ID } from './itemCatalogExtra.js';
import { mergeItemDefinitionById } from './itemCatalogMerge.js';
import type { ItemDefinition } from './itemSchema.js';

const ITEM_CATALOG_CORE_BY_ID = buildItemCatalogCoreRecord();
const ITEM_CATALOG_MECHANICAL_BY_ID = buildItemCatalogMechanicalRecord();

export function getAuthoritativeItemById(itemId: string): ItemDefinition | undefined {
  return mergeItemDefinitionById(itemId, {
    core: ITEM_CATALOG_CORE_BY_ID[itemId],
    mechanical: ITEM_CATALOG_MECHANICAL_BY_ID[itemId],
    extended: ITEM_CATALOG_EXTRA_BY_ID[itemId],
  });
}

/** @deprecated Preferir `getAuthoritativeItemById`. */
export function getCatalogItem(itemId: string): ItemDefinition | undefined {
  return getAuthoritativeItemById(itemId);
}
