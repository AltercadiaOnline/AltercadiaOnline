import { resolveCreatureLootConfig, type ResolvedCreatureLootConfig } from '../shared/loot/creatureLootConfig.js';
import type { DropChancesConfig } from '../shared/loot/dropChances.js';
import {
  applyEquipDropPass,
  outcomeToRevealSlot,
  type SlotOutcome,
} from '../shared/loot/creatureLootRoll.js';
import {
  buildEmptyLootRevealSlots,
  LOOT_REVEAL_SLOT_COUNT,
  type LootRevealSlot,
} from '../shared/loot/lootRevealSlots.js';
import {
  battleLootPreviewFromBundle,
  type BattleLootBundle,
  type BattleLootPreview,
  type LootItemRoll,
} from '../shared/loot/lootTypes.js';
import { LootRarity } from '../shared/loot/lootTypes.js';

export type LootGeneratorOptions = {
  readonly sourceId: string;
  readonly winnerId: string;
  readonly defeatedLevel?: number;
  readonly lootBonusMultiplier?: number;
  readonly rng?: () => number;
  readonly dropChances?: DropChancesConfig;
};

export type BattleLootGeneration = {
  readonly bundle: BattleLootBundle;
  readonly preview: BattleLootPreview;
  readonly lootReveal: readonly LootRevealSlot[];
};

function rollPercent(rng: () => number): number {
  return rng() * 100;
}

/**
 * Um sorteio por slot — faixas exclusivas por prioridade (hardcore: pode sair vazio).
 */
export function rollSlotTier(
  chances: DropChancesConfig,
  rng: () => number,
  opts: { readonly allowEpic?: boolean } = {},
): SlotOutcome {
  const r = rollPercent(rng);
  const allowEpic = opts.allowEpic !== false;

  if (allowEpic && r < chances.itemEpicPercent) {
    return { tier: LootRarity.Epic };
  }
  if (r < chances.itemRarePercent) {
    return { tier: LootRarity.Rare };
  }
  if (r < chances.itemUncommonPercent) {
    return { tier: LootRarity.Uncommon };
  }
  if (r < chances.itemCommonPercent) {
    return { tier: LootRarity.Common };
  }
  if (r < chances.goldPercent) {
    return { tier: 'gold' };
  }
  return { tier: 'empty' };
}

/** Se um slot for épico, os demais são rerrolados sem faixa épica. */
export function applyEpicExclusivity(
  outcomes: SlotOutcome[],
  chances: DropChancesConfig,
  rng: () => number,
): void {
  const epicIndex = outcomes.findIndex((o) => o.tier === LootRarity.Epic);
  if (epicIndex === -1) return;

  for (let i = 0; i < outcomes.length; i += 1) {
    if (i === epicIndex) continue;
    outcomes[i] = rollSlotTier(chances, rng, { allowEpic: false });
    if (outcomes[i]?.tier === LootRarity.Epic) {
      outcomes[i] = { tier: LootRarity.Rare };
    }
  }
}

export function rollLootRevealSlots(
  chances: DropChancesConfig,
  rng: () => number = Math.random,
): SlotOutcome[] {
  const outcomes: SlotOutcome[] = [];
  let epicClaimed = false;

  for (let i = 0; i < LOOT_REVEAL_SLOT_COUNT; i += 1) {
    const outcome = rollSlotTier(chances, rng, { allowEpic: !epicClaimed });
    if (outcome.tier === LootRarity.Epic) epicClaimed = true;
    outcomes.push(outcome);
  }

  applyEpicExclusivity(outcomes, chances, rng);
  return outcomes;
}

function splitVolts(total: number, goldSlotCount: number): number[] {
  if (goldSlotCount <= 0 || total <= 0) return [];
  const base = Math.floor(total / goldSlotCount);
  const amounts = Array.from({ length: goldSlotCount }, () => base);
  let remainder = total - base * goldSlotCount;
  let i = 0;
  while (remainder > 0) {
    amounts[i % goldSlotCount] = (amounts[i % goldSlotCount] ?? 0) + 1;
    remainder -= 1;
    i += 1;
  }
  return amounts;
}


function revealSlotsFromOutcomes(
  outcomes: readonly SlotOutcome[],
  config: ResolvedCreatureLootConfig,
  totalVolts: number,
  rng: () => number,
): LootRevealSlot[] {
  const goldCount = outcomes.filter((o) => o.tier === 'gold').length;
  const voltParts = splitVolts(totalVolts, goldCount);
  let goldIdx = 0;

  return outcomes.map((outcome) => {
    const share = outcome.tier === 'gold' ? (voltParts[goldIdx++] ?? 0) : 0;
    return outcomeToRevealSlot(outcome, config, share, rng);
  });
}

function bundleFromReveal(
  lootReveal: readonly LootRevealSlot[],
  sourceId: string,
  winnerId: string,
): BattleLootBundle {
  let voltReward = 0;
  const itemMap = new Map<string, LootItemRoll>();

  for (const slot of lootReveal) {
    if (slot.kind === 'GOLD') {
      voltReward += slot.voltAmount ?? 0;
    }
    if (slot.kind === 'ITEM' && slot.itemId) {
      const existing = itemMap.get(slot.itemId);
      const rarity = slot.rarity ?? LootRarity.Common;
      if (existing) {
        itemMap.set(slot.itemId, { ...existing, quantity: existing.quantity + 1 });
      } else {
        itemMap.set(slot.itemId, { itemId: slot.itemId, quantity: 1, rarity });
      }
    }
  }

  return {
    lootId: crypto.randomUUID(),
    sourceId,
    winnerId,
    voltReward,
    items: [...itemMap.values()],
  };
}

/**
 * Gera 4 slots do loot cassino pós-batalha + bundle pendente (autoritativo).
 */
export function generateBattleLoot(options: LootGeneratorOptions): BattleLootGeneration | null {
  const rng = options.rng ?? Math.random;
  const defeatedLevel = options.defeatedLevel ?? 1;
  const lootBonus = options.lootBonusMultiplier ?? 1;

  const config = resolveCreatureLootConfig(options.sourceId, defeatedLevel, lootBonus);
  if (!config) return null;

  const chances = options.dropChances ?? config.dropChances;

  const outcomes = rollLootRevealSlots(chances, rng);
  const goldSlotCount = outcomes.filter((o) => o.tier === 'gold').length;
  const totalVolts = goldSlotCount > 0
    ? config.voltRange.min + Math.floor(rng() * (config.voltRange.max - config.voltRange.min + 1))
    : 0;

  const lootReveal = revealSlotsFromOutcomes(outcomes, config, totalVolts, rng);
  applyEquipDropPass(lootReveal, config, rng);

  const bundle = bundleFromReveal(lootReveal, options.sourceId, options.winnerId);
  const preview = battleLootPreviewFromBundle(bundle);
  return { bundle, preview, lootReveal };
}

export function generateEmptyBattleLoot(
  sourceId: string,
  winnerId: string,
): BattleLootGeneration {
  const lootReveal = buildEmptyLootRevealSlots();
  const bundle: BattleLootBundle = {
    lootId: crypto.randomUUID(),
    sourceId,
    winnerId,
    voltReward: 0,
    items: [],
  };
  return {
    bundle,
    preview: battleLootPreviewFromBundle(bundle),
    lootReveal,
  };
}

export { resolveCreatureLootConfig } from '../shared/loot/creatureLootConfig.js';
