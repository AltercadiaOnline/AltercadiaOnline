import { describe, expect, it } from 'vitest';
import { getCreatureDropEntry, isZone1EquipableItemId, listZone1EquipableItemIds } from '../items/creatureDrops.js';
import { EQUIPABLE_VALOR_BASE, LOOT_ECONOMY_REGISTRY } from '../items/lootItemEconomyRegistry.js';
import { resolveCreatureLootConfig } from '../loot/creatureLootConfig.js';
import { VENDEDOR_NPC } from '../world/npcBuildingAnchors.js';
import {
  isNpcVendorDumpableEquipable,
  isNpcVendorSellableItem,
  resolveNpcBuyPriceFromValorBase,
  resolveNpcSellPriceFromValorBase,
} from './itemValorEconomy.js';
import { resolveNpcVendorRarityBlockReason } from './npcSellRarityPolicy.js';
import {
  getNpcVendorListings,
  ZONE1_SET_VENDOR_ITEM_IDS,
} from './npcVendorCatalog.js';
import { validateInventoryItemSale } from './npcVendorService.js';

describe('SET Zona 1 — drop, vitrine e dump', () => {
  it('rato dropa elmo; UrbanScavenger usa 5%', () => {
    expect(getCreatureDropEntry('rat')?.equipableItemId).toBe('gnawed_bone_helm');
    expect(resolveCreatureLootConfig('rat')?.equipDropChance).toBe(0.05);
    expect(resolveCreatureLootConfig('crow')?.equipDropChance).toBe(0.05);
    expect(resolveCreatureLootConfig('centipede')?.equipDropChance).toBe(0.03);
  });

  it('vitrine do vendedor cobre as 5 peças Z1 no padrão 150/100/50', () => {
    const listings = getNpcVendorListings(VENDEDOR_NPC);
    expect(listings.map((row) => row.itemId)).toEqual([...ZONE1_SET_VENDOR_ITEM_IDS]);

    const vendorIds = new Set(listings.map((row) => row.itemId));
    expect(vendorIds).toEqual(new Set(listZone1EquipableItemIds()));

    const valorBase = EQUIPABLE_VALOR_BASE.zone1;
    expect(valorBase).toBe(250);
    for (const listing of listings) {
      expect(listing.marketValueVolts).toBe(valorBase);
      expect(listing.npcBuyPriceVolts).toBe(resolveNpcBuyPriceFromValorBase(valorBase));
      expect(listing.npcSellPriceVolts).toBe(resolveNpcSellPriceFromValorBase(valorBase));
      expect(listing.npcSellPriceVolts).toBe(125);
      expect(listing.npcBuyPriceVolts).toBe(375);
      expect(listing.npcSellPriceVolts).toBeLessThan(listing.npcBuyPriceVolts);
    }
  });

  it('extra Z1 dumpa no NPC; SET Z2+ vai ao Marketplace', () => {
    expect(isZone1EquipableItemId('gnawed_bone_helm')).toBe(true);
    expect(isNpcVendorDumpableEquipable('gnawed_bone_helm')).toBe(true);
    expect(isNpcVendorSellableItem('gnawed_bone_helm')).toBe(true);
    expect(resolveNpcVendorRarityBlockReason('gnawed_bone_helm')).toBeNull();

    const dump = validateInventoryItemSale({
      itemId: 'gnawed_bone_helm',
      quantity: 1,
      inventoryQuantity: 2,
    });
    expect(dump.ok).toBe(true);
    if (dump.ok) {
      expect(dump.quote.unitPriceVolts).toBe(125);
    }

    expect(isNpcVendorDumpableEquipable('rail_armor')).toBe(false);
    expect(isNpcVendorSellableItem('rail_armor')).toBe(false);
    expect(resolveNpcVendorRarityBlockReason('rail_armor')).not.toBeNull();

    const blocked = validateInventoryItemSale({
      itemId: 'rail_armor',
      quantity: 1,
      inventoryQuantity: 1,
    });
    expect(blocked.ok).toBe(false);
  });

  it('elmo Z1 vale bem mais que o osso', () => {
    expect(LOOT_ECONOMY_REGISTRY.bones?.valorBase).toBe(28);
    expect(LOOT_ECONOMY_REGISTRY.gnawed_bone_helm?.valorBase).toBe(250);
    expect(resolveNpcSellPriceFromValorBase(28)).toBe(14);
    expect(resolveNpcSellPriceFromValorBase(250)).toBe(125);
  });
});
