import { ALQUIMISTA_NPC, VENDEDOR_NPC } from '../world/npcBuildingAnchors.js';
import { ANCIAO_CAEL_NPC_ID } from './caelPetService.js';
import { getAuthoritativeItemById } from '../items/itemCatalogAuthoritative.js';
import { ItemCategory } from '../items/itemSchema.js';

/** Tabela de preços do NPC — compra, revenda e âncora de mercado (editável). */
export type NpcVendorListing = {
  readonly itemId: string;
  /** Preço que o NPC cobra do jogador (compra). */
  readonly npcBuyPriceVolts: number;
  /** Preço que o NPC paga ao jogador (revenda). */
  readonly npcSellPriceVolts: number;
  /** null = aguardando média global do Marketplace. */
  readonly marketValueVolts: number | null;
};

export type NpcVendorCatalogEntry = {
  readonly vendorId: string;
  readonly listings: readonly NpcVendorListing[];
};

/** Abas do Laboratório — mapeadas por categoria do catálogo. */
export type LabShopTabId = 'potions' | 'runes' | 'books';

export const LAB_SHOP_TABS: readonly { readonly id: LabShopTabId; readonly label: string }[] = [
  { id: 'potions', label: 'Poções' },
  { id: 'runes', label: 'Runas' },
  { id: 'books', label: 'Livros' },
] as const;

const CATEGORY_TO_LAB_TAB: Partial<Record<ItemCategory, LabShopTabId>> = {
  [ItemCategory.Potion]: 'potions',
  [ItemCategory.Rune]: 'runes',
  [ItemCategory.Book]: 'books',
};

/** Catálogo data-driven — um registro por NPC vendedor. */
export const NPC_VENDOR_CATALOG: readonly NpcVendorCatalogEntry[] = [
  {
    vendorId: 'mercenario',
    listings: [
      {
        itemId: 'spray_alerta_binario',
        npcBuyPriceVolts: 40,
        npcSellPriceVolts: 15,
        marketValueVolts: 30,
      },
      {
        itemId: 'spray_terminal_hackeado',
        npcBuyPriceVolts: 60,
        npcSellPriceVolts: 25,
        marketValueVolts: 45,
      },
      {
        itemId: 'spray_vigilante',
        npcBuyPriceVolts: 80,
        npcSellPriceVolts: 35,
        marketValueVolts: 60,
      },
    ],
  },
  {
    vendorId: VENDEDOR_NPC,
    listings: [],
  },
  {
    vendorId: ANCIAO_CAEL_NPC_ID,
    listings: [],
  },
  {
    vendorId: ALQUIMISTA_NPC,
    listings: [
      {
        itemId: 'potion_suporte_menor',
        npcBuyPriceVolts: 30,
        npcSellPriceVolts: 10,
        marketValueVolts: 20,
      },
      {
        itemId: 'potion_suporte_media',
        npcBuyPriceVolts: 55,
        npcSellPriceVolts: 18,
        marketValueVolts: 37,
      },
      {
        itemId: 'potion_suporte_maior',
        npcBuyPriceVolts: 75,
        npcSellPriceVolts: 25,
        marketValueVolts: 50,
      },
      {
        itemId: 'tonico_fluxo_menor',
        npcBuyPriceVolts: 55,
        npcSellPriceVolts: 18,
        marketValueVolts: 37,
      },
      {
        itemId: 'tonico_fluxo_maior',
        npcBuyPriceVolts: 65,
        npcSellPriceVolts: 21,
        marketValueVolts: 43,
      },
      {
        itemId: 'runa_furia',
        npcBuyPriceVolts: 180,
        npcSellPriceVolts: 90,
        marketValueVolts: 140,
      },
      {
        itemId: 'runa_reflexo',
        npcBuyPriceVolts: 200,
        npcSellPriceVolts: 100,
        marketValueVolts: 155,
      },
      {
        itemId: 'runa_volts_overclock',
        npcBuyPriceVolts: 240,
        npcSellPriceVolts: 120,
        marketValueVolts: 185,
      },
      {
        itemId: 'runa_passo_fantasma',
        npcBuyPriceVolts: 220,
        npcSellPriceVolts: 110,
        marketValueVolts: 170,
      },
      {
        itemId: 'livro_sorte',
        npcBuyPriceVolts: 350,
        npcSellPriceVolts: 175,
        marketValueVolts: 265,
      },
      {
        itemId: 'livro_estudo_tatico',
        npcBuyPriceVolts: 420,
        npcSellPriceVolts: 210,
        marketValueVolts: 320,
      },
      {
        itemId: 'livro_critico',
        npcBuyPriceVolts: 380,
        npcSellPriceVolts: 190,
        marketValueVolts: 290,
      },
      {
        itemId: 'livro_forca',
        npcBuyPriceVolts: 400,
        npcSellPriceVolts: 200,
        marketValueVolts: 305,
      },
    ],
  },
] as const;

export function getNpcVendorListings(vendorId: string): readonly NpcVendorListing[] {
  return NPC_VENDOR_CATALOG.find((entry) => entry.vendorId === vendorId)?.listings ?? [];
}

export function findNpcVendorListing(
  vendorId: string,
  itemId: string,
): NpcVendorListing | undefined {
  return getNpcVendorListings(vendorId).find((listing) => listing.itemId === itemId);
}

/** Spread NPC (compra − revenda) — espelha a listagem da loja. */
export function resolveNpcPriceSpread(listing: NpcVendorListing): number {
  return listing.npcBuyPriceVolts - listing.npcSellPriceVolts;
}

export function resolveLabShopTabForItem(itemId: string): LabShopTabId | null {
  const item = getAuthoritativeItemById(itemId);
  if (!item) return null;
  return CATEGORY_TO_LAB_TAB[item.category] ?? null;
}

export function filterLabListingsByTab(
  listings: readonly NpcVendorListing[],
  tab: LabShopTabId,
): readonly NpcVendorListing[] {
  return listings.filter((listing) => resolveLabShopTabForItem(listing.itemId) === tab);
}

export function isLabVendor(vendorId: string): boolean {
  return vendorId === ALQUIMISTA_NPC;
}
