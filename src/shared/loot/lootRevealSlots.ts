import type { BattleLootPreview } from './lootTypes.js';
import type { LootRarityId } from './lootTypes.js';

export const LOOT_REVEAL_SLOT_COUNT = 4;

export type LootRevealSlotKind = 'EMPTY' | 'GOLD' | 'ITEM';

/** Resultado autoritativo de um slot (posição fixa 0–3 no array). */
export type LootRevealSlot = {
  readonly kind: LootRevealSlotKind;
  readonly itemId?: string;
  readonly voltAmount?: number;
  readonly rarity?: LootRarityId;
};

/** Token legível para testes/logs — ex.: EMPTY, GOLD, ITEM_scrap */
export function lootRevealSlotToken(slot: LootRevealSlot): string {
  if (slot.kind === 'EMPTY') return 'EMPTY';
  if (slot.kind === 'GOLD') return 'GOLD';
  return `ITEM_${slot.itemId ?? 'unknown'}`;
}

export function buildEmptyLootRevealSlots(): readonly LootRevealSlot[] {
  return Array.from({ length: LOOT_REVEAL_SLOT_COUNT }, () => ({ kind: 'EMPTY' as const }));
}

/** Vitória PVE sem drops — cassino ainda abre (decisão de produto). */
export function allLootRevealSlotsEmpty(slots: readonly LootRevealSlot[]): boolean {
  return slots.length > 0 && slots.every((slot) => slot.kind === 'EMPTY');
}

function shuffleIndices(length: number, rng: () => number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices;
}

/**
 * @deprecated Use LootGenerator.generateBattleLoot — apenas fallback visual sem sorteio hardcore.
 * Distribui recompensas já calculadas em 4 slots (embaralhados).
 */
export function buildLootRevealSlots(
  preview: BattleLootPreview | null,
  rng: () => number = Math.random,
): readonly LootRevealSlot[] {
  const result = buildEmptyLootRevealSlots().map((slot) => ({ ...slot }));
  if (!preview) return result;

  const rewards: LootRevealSlot[] = [];

  if (preview.voltReward > 0) {
    rewards.push({ kind: 'GOLD', voltAmount: preview.voltReward });
  }

  for (const item of preview.items) {
    rewards.push({
      kind: 'ITEM',
      itemId: item.itemId,
      rarity: item.rarity,
    });
    for (let q = 1; q < item.quantity && rewards.length < LOOT_REVEAL_SLOT_COUNT; q += 1) {
      rewards.push({
        kind: 'ITEM',
        itemId: item.itemId,
        rarity: item.rarity,
      });
    }
  }

  const capped = rewards.slice(0, LOOT_REVEAL_SLOT_COUNT);
  const positions = shuffleIndices(LOOT_REVEAL_SLOT_COUNT, rng);

  for (let i = 0; i < capped.length; i += 1) {
    const slotIndex = positions[i];
    if (slotIndex === undefined) continue;
    result[slotIndex] = capped[i]!;
  }

  return result;
}

export function isLootRevealSlots(value: unknown): value is readonly LootRevealSlot[] {
  if (!Array.isArray(value) || value.length !== LOOT_REVEAL_SLOT_COUNT) return false;
  return value.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const kind = (entry as LootRevealSlot).kind;
    return kind === 'EMPTY' || kind === 'GOLD' || kind === 'ITEM';
  });
}
