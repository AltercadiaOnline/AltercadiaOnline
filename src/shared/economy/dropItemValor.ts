import { ItemLootKind } from '../items/itemSchema.js';
import { ZoneId } from '../items/itemTypes.js';
import { LootRarity, type LootRarityId } from '../loot/lootTypes.js';
import { NPC_SELL_PRICE_RATIO } from './ShopManager.js';

/**
 * Piso de revenda NPC — material de craft comum da zona.
 * Um botão por zona retuna o farm inteiro (tipo × raridade em cima).
 *
 * Âncoras que NÃO sobem com esta curva (anti-inflação / economia quente):
 * - poção menor na bancada = 30 V (2 comuns Z1 = 28)
 * - stake mínimo PvP = 50 V (~4 comuns Z1)
 * - ouro do cassino (`DOLLAR_VOLT_BY_ZONE`) — canal separado
 */
export const DROP_ZONE_NPC_SELL_FLOOR: Readonly<Record<ZoneId, number>> = {
  [ZoneId.Zone1]: 14,
  [ZoneId.Zone2]: 24,
  [ZoneId.Zone3]: 40,
  [ZoneId.Zone4]: 64,
  [ZoneId.Zone5]: 100,
};

/** Craft = forja futura (guarda). DirectValue = vendor / P2P. */
export const DROP_KIND_NPC_SELL_MULT: Readonly<Record<ItemLootKind, number>> = {
  [ItemLootKind.Crafting]: 1,
  [ItemLootKind.DirectValue]: 1.3,
};

/**
 * Common gira no NPC. Uncommon é o degrau de listagem/craft.
 * Rare/Epic o NPC local não compra — o mult só ancora o Marketplace.
 */
export const DROP_RARITY_NPC_SELL_MULT: Readonly<Record<LootRarityId, number>> = {
  [LootRarity.Common]: 1,
  [LootRarity.Uncommon]: 1.4,
  [LootRarity.Rare]: 2,
  [LootRarity.Epic]: 2.7,
  [LootRarity.Legendary]: 3.5,
};

/** Espelho da listagem do alquimista — sink de combate (não alterar aqui). */
export const DROP_SINK_ANCHOR_POTION_MENOR_NPC_BUY = 30;

export type DropMaterialValorInput = {
  readonly zoneId: ZoneId;
  readonly lootKind: ItemLootKind;
  readonly lootRarity: LootRarityId;
};

export function resolveDropMaterialNpcSellVolts(input: DropMaterialValorInput): number {
  const floor = DROP_ZONE_NPC_SELL_FLOOR[input.zoneId];
  const kindMult = DROP_KIND_NPC_SELL_MULT[input.lootKind];
  const rarityMult = DROP_RARITY_NPC_SELL_MULT[input.lootRarity];
  return Math.max(1, Math.round(floor * kindMult * rarityMult));
}

/** `valorBase` para o ShopManager (revenda NPC = valorBase × 50%). */
export function resolveDropMaterialValorBase(input: DropMaterialValorInput): number {
  const npcSell = resolveDropMaterialNpcSellVolts(input);
  return Math.max(2, Math.round(npcSell / NPC_SELL_PRICE_RATIO));
}
