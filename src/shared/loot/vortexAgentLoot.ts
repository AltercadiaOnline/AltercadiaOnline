import { isVortexAgentCreatureId } from '../static/vortexAgentWave.js';
import { resolveItemLootRarity } from './lootRarity.js';
import {
  LOOT_REVEAL_SLOT_COUNT,
  type LootRevealSlot,
} from './lootRevealSlots.js';

/** Único item que o cassino do Agente Vórtex pode revelar. */
export const VORTEX_AGENT_FRAGMENT_ITEM_ID = 'soul_fragment' as const;

/**
 * Chance independente por slot (0–1). Mini-boss: pode sair 0 e pode preencher 2–4.
 * Não usa DROP_CHANCES das criaturas.
 */
export const VORTEX_AGENT_FRAGMENT_SLOT_CHANCE = 0.4;

export function isVortexAgentLootSource(sourceId: string): boolean {
  return isVortexAgentCreatureId(sourceId);
}

function resolveFragmentSlotChance(lootBonusMultiplier = 1): number {
  const bonus = Math.max(1, lootBonusMultiplier);
  return Math.min(1, VORTEX_AGENT_FRAGMENT_SLOT_CHANCE * bonus);
}

function fragmentRevealSlot(): LootRevealSlot {
  return {
    kind: 'ITEM',
    itemId: VORTEX_AGENT_FRAGMENT_ITEM_ID,
    rarity: resolveItemLootRarity(VORTEX_AGENT_FRAGMENT_ITEM_ID),
  };
}

/**
 * 4 slots independentes: fragmento ou vazio. Sem ouro, equip ou item garantido.
 */
export function rollVortexAgentLootReveal(
  rng: () => number = Math.random,
  lootBonusMultiplier = 1,
): LootRevealSlot[] {
  const chance = resolveFragmentSlotChance(lootBonusMultiplier);
  return Array.from({ length: LOOT_REVEAL_SLOT_COUNT }, () => (
    rng() < chance ? fragmentRevealSlot() : { kind: 'EMPTY' as const }
  ));
}
