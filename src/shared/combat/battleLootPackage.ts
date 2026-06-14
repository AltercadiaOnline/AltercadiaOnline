import type { BattleLootPreview } from '../loot/lootTypes.js';
import { isLootRevealSlots, type LootRevealSlot } from '../loot/lootRevealSlots.js';

/** Pacote autoritativo de loot pós-batalha (4 slots + preview). */
export type LootPackage = {
  readonly battleId: string;
  readonly lootId: string;
  readonly lootReveal: readonly LootRevealSlot[];
  readonly lootPreview: BattleLootPreview;
};

/** @deprecated Prefer LootPackage */
export type BattleLootPackagePayload = LootPackage;

export function isBattleLootPackagePayload(value: unknown): value is BattleLootPackagePayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const preview = record.lootPreview;
  const validPreview = typeof preview === 'object'
    && preview !== null
    && typeof (preview as Record<string, unknown>).lootId === 'string';
  return (
    typeof record.battleId === 'string'
    && typeof record.lootId === 'string'
    && isLootRevealSlots(record.lootReveal)
    && validPreview
  );
}
