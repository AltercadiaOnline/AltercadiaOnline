import type { BattleLootPreview } from '../loot/lootTypes.js';
import { isLootRevealSlots, type LootRevealSlot } from '../loot/lootRevealSlots.js';
import { clampPveEncounterPackSize } from './pveEncounterPack.js';

/** Pacote autoritativo de loot pós-batalha (4 slots × giros + preview). */
export type LootPackage = {
  readonly battleId: string;
  readonly lootId: string;
  readonly lootReveal: readonly LootRevealSlot[];
  readonly lootPreview: BattleLootPreview;
  readonly lootReveals?: readonly (readonly LootRevealSlot[])[];
  readonly spinCount?: number;
};

/** @deprecated Prefer LootPackage */
export type BattleLootPackagePayload = LootPackage;

function isLootRevealsList(value: unknown): value is readonly (readonly LootRevealSlot[])[] {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) return false;
  return value.every((entry) => isLootRevealSlots(entry));
}

export function isBattleLootPackagePayload(value: unknown): value is BattleLootPackagePayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const preview = record.lootPreview;
  const validPreview = typeof preview === 'object'
    && preview !== null
    && typeof (preview as Record<string, unknown>).lootId === 'string';
  const spinCount = record.spinCount;
  const validSpin = spinCount === undefined
    || (typeof spinCount === 'number' && clampPveEncounterPackSize(spinCount) === spinCount);
  return (
    typeof record.battleId === 'string'
    && typeof record.lootId === 'string'
    && isLootRevealSlots(record.lootReveal)
    && isLootRevealsList(record.lootReveals)
    && validSpin
    && validPreview
  );
}
