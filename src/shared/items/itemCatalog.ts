/**
 * Fonte da verdade do sistema de itens do Altercadia.
 *
 * Core (id, nome, iconPath) — bundle inicial via `getItemById`.
 * Extended (descrição, efeitos, lore) — lazy via `getExtendedItemDetails`.
 * Mecânica (peso, slot, economia) — `getItemMechanicalById` / `getAuthoritativeItemById`.
 */
import { catalogItemToLegacy } from './catalogLegacyAdapter.js';
import {
  buildItemCatalogCoreRecord,
  buildItemCatalogMechanicalRecord,
  buildItemCatalogRecord,
  CATALOG_ENTRIES,
} from './itemCatalogEntries.js';
import { getAuthoritativeItemById, getCatalogItem } from './itemCatalogAuthoritative.js';
import { mergeItemDefinitionById, mergeItemDefinitionParts } from './itemCatalogMerge.js';
import { ItemRegistry } from './ItemRegistry.js';
import {
  ItemCategory,
  type ItemCoreDefinition,
  type ItemDefinition,
  type ItemEffectDefinition,
  type ItemExtendedDetails,
  type ItemMechanicalDefinition,
  type ItemSlotCode,
} from './itemSchema.js';
import type {
  BookDefinition,
  ConsumableDefinition,
  EquipableItemDefinition,
  GenericItemDefinition,
  ItemDefinition as LegacyItemDefinition,
  RuneDefinition,
  ZoneDefinition,
} from './itemTypes.js';
import { ItemKind, ZoneId } from './itemTypes.js';

export type {
  ItemDefinition,
  ItemCoreDefinition,
  ItemExtendedDetails,
  ItemMechanicalDefinition,
  ItemEffectDefinition,
  ItemSlotCode,
  ItemEffectValueType,
  NormalizedItemDefinition,
  UnifiedItemDefinition,
} from './itemSchema.js';
export { ItemCategory } from './itemSchema.js';

export { projectToNormalizedItem } from './itemSchemaProjection.js';
export { resolveItemWeight, stackWeight } from './itemWeight.js';
export { POTION_COMBAT_COOLDOWN } from './itemCatalogEntries.js';
export { DIARIO_MEMORIAS_ITEM_ID } from './soulboundItems.js';
export { getAuthoritativeItemById, getCatalogItem } from './itemCatalogAuthoritative.js';

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = [
  { id: ZoneId.Zone1, name: 'Beco dos Fundos', levelMin: 1, levelMax: 10 },
  { id: ZoneId.Zone2, name: 'Metrô Abandonado', levelMin: 10, levelMax: 20 },
  { id: ZoneId.Zone3, name: 'Estacionamento Noturno', levelMin: 20, levelMax: 30 },
  { id: ZoneId.Zone4, name: 'Telhados', levelMin: 30, levelMax: 40 },
  { id: ZoneId.Zone5, name: 'Esgoto Subterrâneo', levelMin: 40, levelMax: 99 },
];

/** Catálogo completo — registro interno e ItemRegistry. */
export const ITEM_CATALOG_BY_ID: Record<string, ItemDefinition> = buildItemCatalogRecord();
ItemRegistry.registerMany(Object.values(ITEM_CATALOG_BY_ID));

/** Core — metadados leves para renderização de slots/ícones. */
export const ITEM_CATALOG_CORE_BY_ID: Record<string, ItemCoreDefinition> =
  buildItemCatalogCoreRecord();

/** Mecânica — peso, slot, economia, flags (sem descrição/efeitos). */
export const ITEM_CATALOG_MECHANICAL_BY_ID: Record<string, ItemMechanicalDefinition> =
  buildItemCatalogMechanicalRecord();

/** Índice por id — lista completa (autoritativa). */
export const ITEM_CATALOG: readonly ItemDefinition[] = Object.values(ITEM_CATALOG_BY_ID);

/** @deprecated Use `ITEM_CATALOG` (array). Mantido para compatibilidade. */
export const ITEM_CATALOG_LIST: readonly ItemDefinition[] = ITEM_CATALOG;

function legacyList(): LegacyItemDefinition[] {
  return ITEM_CATALOG_LIST.map(catalogItemToLegacy);
}

/** @deprecated Preferir `ITEM_CATALOG` — lista legada para compatibilidade. */
export const GENERIC_ITEM_CATALOG: readonly GenericItemDefinition[] = legacyList().filter(
  (item): item is GenericItemDefinition =>
    item.kind === ItemKind.Generic || item.kind === ItemKind.Currency,
);

/** @deprecated Preferir `ITEM_CATALOG` — lista legada para compatibilidade. */
export const EQUIPABLE_ITEM_CATALOG: readonly EquipableItemDefinition[] = legacyList().filter(
  (item): item is EquipableItemDefinition => item.kind === ItemKind.Equipable,
);

/** Metadados leves — id, nome e iconPath (bundle inicial). */
export function getItemById(id: string): ItemCoreDefinition | undefined {
  return ITEM_CATALOG_CORE_BY_ID[id];
}

export function getItemMechanicalById(id: string): ItemMechanicalDefinition | undefined {
  return ITEM_CATALOG_MECHANICAL_BY_ID[id];
}

let extraCatalogCache: Record<string, ItemExtendedDetails> | null = null;
let extraCatalogLoadPromise: Promise<Record<string, ItemExtendedDetails>> | null = null;

async function ensureExtraCatalogLoaded(): Promise<Record<string, ItemExtendedDetails>> {
  if (extraCatalogCache) return extraCatalogCache;
  if (!extraCatalogLoadPromise) {
    extraCatalogLoadPromise = import('./itemCatalogExtra.js').then((module) => {
      extraCatalogCache = module.ITEM_CATALOG_EXTRA_BY_ID;
      return extraCatalogCache;
    });
  }
  return extraCatalogLoadPromise;
}

/** Pré-carrega metadados estendidos em background (ex.: ao entrar no mundo). */
export function prefetchItemCatalogExtra(): Promise<void> {
  return ensureExtraCatalogLoaded().then(() => undefined);
}

/**
 * Metadados pesados — descrição, efeitos e lore.
 * Carregados sob demanda (hover/clique) via dynamic import.
 */
export async function getExtendedItemDetails(
  itemId: string,
): Promise<ItemExtendedDetails | undefined> {
  const extraById = await ensureExtraCatalogLoaded();
  return extraById[itemId];
}

/** Monta definição completa para tooltip/UI após lazy load dos metadados estendidos. */
export async function resolveItemDefinitionForDisplay(
  itemId: string,
): Promise<ItemDefinition | undefined> {
  const extended = await getExtendedItemDetails(itemId);
  return mergeItemDefinitionById(itemId, {
    core: getItemById(itemId),
    mechanical: getItemMechanicalById(itemId),
    extended,
  });
}

export const ITEM_ICON_PUBLIC_DIR = '/assets/items';

/** Caminho PNG padrão — `/assets/items/{itemId}.png`. */
export function buildDefaultItemIconPath(itemId: string): string {
  return `${ITEM_ICON_PUBLIC_DIR}/${itemId}.png`;
}

/**
 * Ícone público do item.
 * Usa `iconPath` explícito quando definido; senão, convenção `/assets/items/{itemId}.png`.
 */
export function getItemIconPath(itemId: string): string | undefined {
  const item = getItemById(itemId);
  if (!item) return undefined;
  if (typeof item.iconPath === 'string' && item.iconPath.length > 0) {
    return item.iconPath;
  }
  return buildDefaultItemIconPath(itemId);
}

export function getItemDefinition(itemId: string): LegacyItemDefinition | undefined {
  const item = getAuthoritativeItemById(itemId);
  return item ? catalogItemToLegacy(item) : undefined;
}

export function getNormalizedItemDefinition(itemId: string): ItemDefinition | undefined {
  return getCatalogItem(itemId);
}

export function getEquipableItem(itemId: string): EquipableItemDefinition | undefined {
  const legacy = getItemDefinition(itemId);
  return legacy?.kind === ItemKind.Equipable ? legacy : undefined;
}

export function getItemsByCategory(category: ItemCategory): readonly ItemDefinition[] {
  return ITEM_CATALOG_LIST.filter((item) => item.category === category);
}

export {
  ItemRegistry,
  registerGameItem,
  MarketBrowseCategory,
  type MarketBrowseCategoryId,
  type MarketBrowseItem,
} from './ItemRegistry.js';

export { CONSUMABLES_CATALOG, getConsumableDefinition } from './consumablesCatalog.js';
export {
  RUNES_CATALOG,
  BOOKS_CATALOG,
  getRuneDefinition,
  getBookDefinition,
} from './runesBooksCatalog.js';

export type { BookDefinition, ConsumableDefinition, RuneDefinition } from './itemTypes.js';

export {
  calculateTotalStats,
  createEmptyTotalStats,
  equipmentIdsToSlots,
  type EquipmentSlot,
  type PlayerTotalStats,
} from './itemUtils.js';

/** Reexport para testes — entradas brutas do catálogo. */
export { CATALOG_ENTRIES };

/** Monta item completo a partir de partes (útil em testes). */
export { mergeItemDefinitionParts };
