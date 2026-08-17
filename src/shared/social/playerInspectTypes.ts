import {
  EQUIPMENT_UI_SLOT_ORDER,
  type EquipmentUiSlotId,
} from '../character/equipmentUiSlots.js';

export const INSPECT_PLAYER_ACTION = 'INSPECT_PLAYER' as const;

export type InspectPlayerPayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
  readonly screenX?: number;
  readonly screenY?: number;
};

export type PlayerInspectEquipSlot = {
  readonly slotId: EquipmentUiSlotId;
  readonly itemId: string | null;
  readonly itemName: string | null;
};

export type PlayerInspectView = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly level: number;
  readonly online: boolean;
  readonly equipment: readonly PlayerInspectEquipSlot[];
  readonly canAddFriend: boolean;
  readonly canInviteDuel: boolean;
  readonly canTrade: boolean;
};

export function isPlayerInspectView(value: unknown): value is PlayerInspectView {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.playerId !== 'string' || record.playerId.length === 0) return false;
  if (typeof record.characterId !== 'number' || !Number.isFinite(record.characterId)) return false;
  if (typeof record.displayName !== 'string') return false;
  if (typeof record.level !== 'number' || !Number.isFinite(record.level)) return false;
  if (typeof record.online !== 'boolean') return false;
  if (typeof record.canAddFriend !== 'boolean') return false;
  if (typeof record.canInviteDuel !== 'boolean') return false;
  if (typeof record.canTrade !== 'boolean') return false;
  if (!Array.isArray(record.equipment)) return false;
  if (record.equipment.length !== EQUIPMENT_UI_SLOT_ORDER.length) return false;
  for (const slot of record.equipment) {
    if (!slot || typeof slot !== 'object') return false;
    const row = slot as Record<string, unknown>;
    if (typeof row.slotId !== 'string') return false;
    if (row.itemId !== null && typeof row.itemId !== 'string') return false;
    if (row.itemName !== null && typeof row.itemName !== 'string') return false;
  }
  return true;
}
