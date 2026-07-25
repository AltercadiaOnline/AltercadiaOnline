import type { EquippedSlots, InventoryStack } from '../character/equipmentState.js';
import type { PersistedPetAffinitySlice } from '../persistence/characterPersistenceRecord.js';
import type { PlayerPetRosterSnapshot } from '../pet/petRoster.js';
import {
  parsePersistedPetAffinity,
  parsePersistedPetRoster,
} from '../persistence/parsePersistedPetState.js';

export type ProfileRow = {
  readonly id: string;
  readonly user_id: string;
  readonly character_id: number;
  /** Posição na char select (0..4). Independente de character_id. */
  readonly slot_index: number;
  readonly display_name: string | null;
  readonly email: string | null;
  readonly server_id: string;
  readonly level: number;
  readonly xp_current: number;
  readonly quests_data: Readonly<Record<string, unknown>>;
  readonly current_map_id: string | null;
  readonly last_position_x: number | null;
  readonly last_position_y: number | null;
  readonly facing: string;
  readonly persistence_version: number;
  readonly created_at: string;
  readonly updated_at: string;
};

export type CurrencyRow = {
  readonly user_id: string;
  readonly character_id: number;
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

export type CharacterPetsRow = {
  readonly id: string;
  readonly user_id: string;
  readonly character_id: number;
  readonly server_id: string;
  readonly roster: PlayerPetRosterSnapshot;
  readonly affinity: PersistedPetAffinitySlice;
  readonly updated_at: string;
};

export type PlayerGameDataBundle = {
  readonly profile: ProfileRow | null;
  readonly currency: CurrencyRow | null;
  readonly inventory: InventoryRow | null;
  readonly pets: CharacterPetsRow | null;
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

export function parseCharacterPetsRow(
  row: {
    readonly id: string;
    readonly user_id: string;
    readonly character_id: number;
    readonly server_id: string;
    readonly roster: unknown;
    readonly affinity: unknown;
    readonly updated_at: string;
  } | null,
): CharacterPetsRow | null {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    character_id: row.character_id,
    server_id: row.server_id,
    roster: parsePersistedPetRoster(row.roster),
    affinity: parsePersistedPetAffinity(row.affinity),
    updated_at: row.updated_at,
  };
}
