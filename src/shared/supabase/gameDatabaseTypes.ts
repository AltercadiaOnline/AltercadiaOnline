import type { EquippedSlots, InventoryStack } from '../character/equipmentState.js';

export type ProfileRow = {
  readonly id: string;
  readonly user_id: string;
  readonly character_id: number;
  readonly display_name: string | null;
  readonly email: string | null;
  readonly server_id: string;
  readonly created_at: string;
  readonly updated_at: string;
};

export type CurrencyRow = {
  readonly user_id: string;
  readonly server_id: string;
  readonly dollar_volt: number;
  readonly alter_coins: number;
  readonly updated_at: string;
};

export type InventoryRow = {
  readonly id: string;
  readonly user_id: string;
  readonly character_id: number;
  readonly server_id: string;
  readonly stacks: InventoryStack[];
  readonly equipped: EquippedSlots;
  readonly updated_at: string;
};

export type PlayerGameDataBundle = {
  readonly profile: ProfileRow | null;
  readonly currency: CurrencyRow | null;
  readonly inventory: InventoryRow | null;
};

export function parseInventoryStacks(raw: unknown): InventoryStack[] {
  if (!Array.isArray(raw)) return [];
  const stacks: InventoryStack[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const itemId = row.itemId;
    const quantity = row.quantity;
    if (typeof itemId !== 'string' || typeof quantity !== 'number') continue;
    stacks.push({
      itemId,
      quantity,
      ...(typeof row.charges === 'number' ? { charges: row.charges } : {}),
      ...(typeof row.lockedQuantity === 'number' ? { lockedQuantity: row.lockedQuantity } : {}),
    });
  }
  return stacks;
}

export function parseEquippedSlots(raw: unknown): EquippedSlots {
  if (!raw || typeof raw !== 'object') return {};
  const equipped: EquippedSlots = {};
  const record = raw as Record<string, unknown>;
  for (const key of ['head', 'top', 'bottom', 'ring', 'amulet', 'book', 'rune'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.length > 0) {
      equipped[key] = value;
    }
  }
  return equipped;
}
