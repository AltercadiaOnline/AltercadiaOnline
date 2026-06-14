import type { ResolvedCreatureLootConfig } from './creatureLootConfig.js';
import { resolveItemLootRarity } from './lootRarity.js';
import type { LootRevealSlot } from './lootRevealSlots.js';
import { LootRarity, type LootRarityId } from './lootTypes.js';
import { pickWeighted } from './weightedPick.js';

const TIER_PRIORITY: Record<SlotTier, number> = {
  empty: 0,
  gold: 1,
  [LootRarity.Common]: 2,
  [LootRarity.Uncommon]: 3,
  [LootRarity.Rare]: 4,
  [LootRarity.Epic]: 5,
  [LootRarity.Legendary]: 6,
};

export type SlotTier = 'empty' | 'gold' | LootRarityId;

export type SlotOutcome = {
  readonly tier: SlotTier;
};

/**
 * Sorteio ponderado de material genérico da criatura para a raridade do slot.
 * Equipável exclusivo não entra aqui — ver `applyEquipDropPass`.
 */
export function pickWeightedCreatureItem(
  config: ResolvedCreatureLootConfig,
  tier: LootRarityId,
  rng: () => number,
): string | null {
  const exact = config.genericItems.filter((candidate) => candidate.rarity === tier);
  const pool = exact.length > 0
    ? exact
    : config.genericItems.filter(
      (candidate) => TIER_PRIORITY[candidate.rarity] <= TIER_PRIORITY[tier],
    );

  if (pool.length === 0) return null;

  return pickWeighted(
    pool.map((candidate) => ({ weight: candidate.weight, value: candidate.itemId })),
    rng,
  );
}

export function outcomeToRevealSlot(
  outcome: SlotOutcome,
  config: ResolvedCreatureLootConfig,
  voltShare: number,
  rng: () => number,
): LootRevealSlot {
  if (outcome.tier === 'empty') {
    return { kind: 'EMPTY' };
  }
  if (outcome.tier === 'gold') {
    return {
      kind: 'GOLD',
      voltAmount: Math.max(0, voltShare),
    };
  }

  const itemId = pickWeightedCreatureItem(config, outcome.tier, rng);
  if (!itemId) {
    return voltShare > 0
      ? { kind: 'GOLD', voltAmount: voltShare }
      : { kind: 'EMPTY' };
  }

  return {
    kind: 'ITEM',
    itemId,
    rarity: outcome.tier,
  };
}

function slotReplacePriority(slot: LootRevealSlot): number {
  if (slot.kind === 'EMPTY') return 0;
  if (slot.kind === 'GOLD') return 1;
  if (slot.kind === 'ITEM') {
    const rarity = slot.rarity ?? LootRarity.Common;
    return TIER_PRIORITY[rarity] ?? 2;
  }
  return 100;
}

function pickReplaceIndexForEquip(slots: readonly LootRevealSlot[]): number {
  let bestIndex = 0;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (let i = 0; i < slots.length; i += 1) {
    const priority = slotReplacePriority(slots[i] ?? { kind: 'EMPTY' });
    if (priority < bestPriority) {
      bestPriority = priority;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function slotsAlreadyContainEquip(
  slots: readonly LootRevealSlot[],
  equipableItemId: string,
): boolean {
  return slots.some((slot) => slot.kind === 'ITEM' && slot.itemId === equipableItemId);
}

/**
 * Um roll por batalha — substitui o slot de menor valor pelo equipável exclusivo.
 */
export function applyEquipDropPass(
  slots: LootRevealSlot[],
  config: ResolvedCreatureLootConfig,
  rng: () => number,
): boolean {
  const equipId = config.equipableItemId;
  if (!equipId || config.equipDropChance <= 0) return false;
  if (slotsAlreadyContainEquip(slots, equipId)) return false;
  if (rng() >= config.equipDropChance) return false;

  const replaceIndex = pickReplaceIndexForEquip(slots);
  slots[replaceIndex] = {
    kind: 'ITEM',
    itemId: equipId,
    rarity: resolveItemLootRarity(equipId),
  };
  return true;
}

export function listAllowedItemIds(config: ResolvedCreatureLootConfig): readonly string[] {
  const ids = config.genericItems.map((candidate) => candidate.itemId);
  if (config.equipableItemId) {
    return [...ids, config.equipableItemId];
  }
  return ids;
}

export function assertLootUsesOnlyCreatureItems(
  slots: readonly LootRevealSlot[],
  config: ResolvedCreatureLootConfig,
): boolean {
  const allowed = new Set(listAllowedItemIds(config));
  return slots.every((slot) => slot.kind !== 'ITEM' || (slot.itemId !== undefined && allowed.has(slot.itemId)));
}

export type { CreatureGenericDropCandidate } from './creatureLootConfig.js';
