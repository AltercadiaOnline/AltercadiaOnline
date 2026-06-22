/**
 * Metadados pesados do catálogo — chunk separado para lazy loading no cliente.
 * Descrição, efeitos e lore não entram no bundle inicial.
 */
import { buildItemCatalogExtraRecord } from './itemCatalogEntries.js';

export const ITEM_CATALOG_EXTRA_BY_ID = buildItemCatalogExtraRecord();
