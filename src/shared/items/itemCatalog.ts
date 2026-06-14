/**
 * Fonte da verdade do sistema de itens do Altercadia.
 *
 * Todo id, peso, slot, efeito, cooldown e carga de runa/poção deve ser
 * definido aqui (`ITEM_CATALOG`). Cliente, combate, CAP e UI apenas leem
 * estes dados via `getItemById` — nunca inventam stats localmente.
 */
import { catalogItemToLegacy } from './catalogLegacyAdapter.js';
import { buildItemCatalogRecord, CATALOG_ENTRIES } from './itemCatalogEntries.js';
import { ItemRegistry } from './ItemRegistry.js';
import {
  ItemCategory,
  type ItemDefinition,
  type ItemEffectDefinition,
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

export const ZONE_DEFINITIONS: readonly ZoneDefinition[] = [
  { id: ZoneId.Zone1, name: 'Beco dos Fundos', levelMin: 1, levelMax: 10 },
  { id: ZoneId.Zone2, name: 'Metrô Abandonado', levelMin: 10, levelMax: 20 },
  { id: ZoneId.Zone3, name: 'Estacionamento Noturno', levelMin: 20, levelMax: 30 },
  { id: ZoneId.Zone4, name: 'Telhados', levelMin: 30, levelMax: 40 },
  { id: ZoneId.Zone5, name: 'Esgoto Subterrâneo', levelMin: 40, levelMax: 99 },
];

/** Catálogo canônico Altercadia — lista completa de itens. */
export const ITEM_CATALOG_BY_ID: Record<string, ItemDefinition> = buildItemCatalogRecord();
ItemRegistry.registerMany(Object.values(ITEM_CATALOG_BY_ID));

/** Índice por id — lookup O(1) interno. */
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

export function getItemById(id: string): ItemDefinition | undefined {
  return ITEM_CATALOG_BY_ID[id];
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

export function getCatalogItem(itemId: string): ItemDefinition | undefined {
  return ITEM_CATALOG_BY_ID[itemId];
}

export function getItemDefinition(itemId: string): LegacyItemDefinition | undefined {
  const item = getCatalogItem(itemId);
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
