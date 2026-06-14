import type { BattleLootPreview } from '../../shared/loot/lootTypes.js';

let pendingBattleLoot: BattleLootPreview | null = null;

/** Reserva preview de loot (fallback mock / compat). */
export function captureBattleLootPreview(preview: BattleLootPreview): void {
  pendingBattleLoot = preview;
}

/** @deprecated Use captureBattleLootPreview */
export function captureBattleLoot(payload: {
  lootId?: string;
  dollarVolt: number;
  itemIds: readonly string[];
  creatureId?: string;
}): void {
  if (!payload.lootId) return;
  pendingBattleLoot = {
    lootId: payload.lootId,
    sourceId: payload.creatureId ?? 'unknown',
    voltReward: payload.dollarVolt,
    items: payload.itemIds.map((itemId) => ({
      itemId,
      quantity: 1,
      rarity: 'common' as const,
    })),
  };
}

export function peekPendingBattleLoot(): BattleLootPreview | null {
  return pendingBattleLoot;
}

export function consumePendingBattleLoot(): BattleLootPreview | null {
  const loot = pendingBattleLoot;
  pendingBattleLoot = null;
  return loot;
}

export function clearPendingBattleLoot(): void {
  pendingBattleLoot = null;
}
