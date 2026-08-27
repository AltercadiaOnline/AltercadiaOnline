import { describe, expect, it } from 'vitest';
import { PVP_RANKED_STAKE_MIN_VOLTS } from '../combat/pvp/pvpRankedDuelStake.js';
import { ItemLootKind } from '../items/itemSchema.js';
import { ZoneId } from '../items/itemTypes.js';
import { LOOT_ECONOMY_REGISTRY } from '../items/lootItemEconomyRegistry.js';
import { LootRarity } from '../loot/lootTypes.js';
import {
  DROP_SINK_ANCHOR_POTION_MENOR_NPC_BUY,
  DROP_ZONE_NPC_SELL_FLOOR,
  resolveDropMaterialNpcSellVolts,
  resolveDropMaterialValorBase,
} from './dropItemValor.js';
import { resolveNpcSellPriceFromValorBase, resolveNpcBuyPriceFromValorBase } from './itemValorEconomy.js';
import { findNpcVendorListing } from './npcVendorCatalog.js';
import { ALQUIMISTA_NPC } from '../world/npcBuildingAnchors.js';

const z1CraftCommon = {
  zoneId: ZoneId.Zone1,
  lootKind: ItemLootKind.Crafting,
  lootRarity: LootRarity.Common,
} as const;

describe('dropItemValor — curva de farm', () => {
  it('osso Z1 vende a 14 V no NPC (valorBase 28)', () => {
    expect(resolveDropMaterialNpcSellVolts(z1CraftCommon)).toBe(14);
    expect(resolveDropMaterialValorBase(z1CraftCommon)).toBe(28);
    expect(resolveNpcSellPriceFromValorBase(28)).toBe(14);
  });

  it('DirectValue comum e Uncommon sobem sobre o piso da zona', () => {
    expect(
      resolveDropMaterialNpcSellVolts({
        zoneId: ZoneId.Zone1,
        lootKind: ItemLootKind.DirectValue,
        lootRarity: LootRarity.Common,
      }),
    ).toBe(18);
    expect(
      resolveDropMaterialNpcSellVolts({
        zoneId: ZoneId.Zone1,
        lootKind: ItemLootKind.DirectValue,
        lootRarity: LootRarity.Uncommon,
      }),
    ).toBe(25);
  });

  it('pisos de zona sobem de forma progressiva', () => {
    const floors = [
      DROP_ZONE_NPC_SELL_FLOOR[ZoneId.Zone1],
      DROP_ZONE_NPC_SELL_FLOOR[ZoneId.Zone2],
      DROP_ZONE_NPC_SELL_FLOOR[ZoneId.Zone3],
      DROP_ZONE_NPC_SELL_FLOOR[ZoneId.Zone4],
      DROP_ZONE_NPC_SELL_FLOOR[ZoneId.Zone5],
    ];
    for (let i = 1; i < floors.length; i += 1) {
      expect(floors[i]).toBeGreaterThan(floors[i - 1]!);
    }
  });

  it('dois comuns Z1 não compram a poção menor (sink intacto)', () => {
    const npcSell = resolveDropMaterialNpcSellVolts(z1CraftCommon);
    expect(npcSell * 2).toBeLessThanOrEqual(DROP_SINK_ANCHOR_POTION_MENOR_NPC_BUY);
    const listing = findNpcVendorListing(ALQUIMISTA_NPC, 'potion_suporte_menor');
    expect(listing?.npcBuyPriceVolts).toBe(DROP_SINK_ANCHOR_POTION_MENOR_NPC_BUY);
  });

  it('quatro comuns Z1 cobrem a aposta mínima do púlpito', () => {
    const npcSell = resolveDropMaterialNpcSellVolts(z1CraftCommon);
    expect(npcSell * 4).toBeGreaterThanOrEqual(PVP_RANKED_STAKE_MIN_VOLTS);
  });

  it('revenda NPC fica abaixo da compra (sem arbitragem)', () => {
    const valorBase = resolveDropMaterialValorBase({
      zoneId: ZoneId.Zone3,
      lootKind: ItemLootKind.DirectValue,
      lootRarity: LootRarity.Uncommon,
    });
    const sell = resolveNpcSellPriceFromValorBase(valorBase);
    const buy = resolveNpcBuyPriceFromValorBase(valorBase);
    expect(sell).toBeLessThan(buy);
  });
});

describe('lootItemEconomyRegistry — materiais derivados, loja congelada', () => {
  it('aplica a curva nos drops da zona 1', () => {
    expect(LOOT_ECONOMY_REGISTRY.bones?.valorBase).toBe(28);
    expect(LOOT_ECONOMY_REGISTRY.crow_eye?.valorBase).toBe(36);
    expect(LOOT_ECONOMY_REGISTRY.spider_venom?.valorBase).toBe(50);
  });

  it('Fragmento de Alma fica fora da curva', () => {
    expect(LOOT_ECONOMY_REGISTRY.soul_fragment?.valorBase).toBe(45);
  });

  it('poções e runas da loja não mudam', () => {
    expect(LOOT_ECONOMY_REGISTRY.potion_suporte_menor?.valorBase).toBe(20);
    expect(LOOT_ECONOMY_REGISTRY.tonico_fluxo_menor?.valorBase).toBe(37);
    expect(LOOT_ECONOMY_REGISTRY.runa_furia?.valorBase).toBe(580);
    expect(LOOT_ECONOMY_REGISTRY.livro_sorte?.valorBase).toBe(480);
  });

  it('equipável de drop não entra na curva de material', () => {
    expect(LOOT_ECONOMY_REGISTRY.black_feather_pants?.valorBase).toBe(250);
    expect(LOOT_ECONOMY_REGISTRY.rail_armor?.valorBase).toBe(420);
    expect(LOOT_ECONOMY_REGISTRY.gnawed_bone_helm?.valorBase).toBe(250);
  });
});
