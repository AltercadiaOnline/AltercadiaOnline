import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import type { EquipmentUiGridState } from '../../../shared/character/equipmentUiSlots.js';
import type { EquippedSlots } from '../../../shared/character/equipmentState.js';
import {
  equipFromInventoryItem,
  unequipToInventorySlot,
} from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { ERR_ACTION_FORBIDDEN, rejectLoadoutMutationIfInBattle } from '../../world/loadoutMutationGuard.js';

type SyncLoadoutPayload = {
  readonly equipmentUiGrid: EquipmentUiGridState;
  readonly equipped?: EquippedSlots;
};

type EquipPayload = {
  readonly itemId: string;
  readonly uiSlotId?: EquipmentUiSlotId;
};

type UnequipPayload = {
  readonly slotId: EquipmentUiSlotId;
};

function resolveLoadoutIntentError(message: string): string {
  return message === ERR_ACTION_FORBIDDEN ? ERR_ACTION_FORBIDDEN : message;
}

async function mirrorLoadout(
  playerId: string,
  characterId: number,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly message: string }> {
  const { mirrorEconomyLoadoutToWorld } = await import('../../world/loadoutGateway.js');
  const result = mirrorEconomyLoadoutToWorld(playerId, characterId);
  if ('ok' in result && result.ok === false) {
    return result;
  }
  return { ok: true };
}

export class SyncLoadoutHandler extends BaseIntentHandler<SyncLoadoutPayload> {
  readonly actionType = 'SYNC_LOADOUT';

  async execute(playerId: string, payload: SyncLoadoutPayload, intentId: string): Promise<void> {
    const { handleSyncLoadout } = await import('../../world/loadoutGateway.js');
    const result = await handleSyncLoadout(playerId, this.characterId, payload, intentId);
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, resolveLoadoutIntentError(result.message));
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export class EquipFromInventoryHandler extends BaseIntentHandler<EquipPayload> {
  readonly actionType = 'EQUIP_FROM_INVENTORY';

  async execute(playerId: string, payload: EquipPayload, intentId: string): Promise<void> {
    const blocked = rejectLoadoutMutationIfInBattle(playerId, this.characterId);
    if (blocked) {
      this.sendResponse(playerId, intentId, false, ERR_ACTION_FORBIDDEN);
      return;
    }

    const result = await equipFromInventoryItem(
      playerId,
      this.characterId,
      payload.itemId,
      intentId,
      payload.uiSlotId,
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, 'EQUIP_FAILED');
      return;
    }
    const mirrored = await mirrorLoadout(playerId, this.characterId);
    if (!mirrored.ok) {
      this.sendResponse(playerId, intentId, false, resolveLoadoutIntentError(mirrored.message));
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

export class UnequipToInventoryHandler extends BaseIntentHandler<UnequipPayload> {
  readonly actionType = 'UNEQUIP_TO_INVENTORY';

  async execute(playerId: string, payload: UnequipPayload, intentId: string): Promise<void> {
    const blocked = rejectLoadoutMutationIfInBattle(playerId, this.characterId);
    if (blocked) {
      this.sendResponse(playerId, intentId, false, ERR_ACTION_FORBIDDEN);
      return;
    }

    const result = await unequipToInventorySlot(
      playerId,
      this.characterId,
      payload.slotId,
      intentId,
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, 'UNEQUIP_FAILED');
      return;
    }
    const mirrored = await mirrorLoadout(playerId, this.characterId);
    if (!mirrored.ok) {
      this.sendResponse(playerId, intentId, false, resolveLoadoutIntentError(mirrored.message));
      return;
    }
    this.sendResponse(playerId, intentId, true);
  }
}

let syncHandler: SyncLoadoutHandler | null = null;
let equipHandler: EquipFromInventoryHandler | null = null;
let unequipHandler: UnequipToInventoryHandler | null = null;

export function getSyncLoadoutHandler(): SyncLoadoutHandler {
  if (!syncHandler) syncHandler = new SyncLoadoutHandler();
  return syncHandler;
}

export function getEquipFromInventoryHandler(): EquipFromInventoryHandler {
  if (!equipHandler) equipHandler = new EquipFromInventoryHandler();
  return equipHandler;
}

export function getUnequipToInventoryHandler(): UnequipToInventoryHandler {
  if (!unequipHandler) unequipHandler = new UnequipToInventoryHandler();
  return unequipHandler;
}
