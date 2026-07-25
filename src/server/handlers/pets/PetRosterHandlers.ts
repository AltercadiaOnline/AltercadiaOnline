import {
  activatePetSlotOnServer,
  applyPetAffectionOnServer,
  deactivatePetsOnServer,
  selectPetSlotOnServer,
} from '../../../Economy/economyGateway.js';
import { getPetRosterSnapshot } from '../../../Economy/petRosterStore.js';
import { getPetAffinityRecord } from '../../../Economy/petAffinityStore.js';
import type { PlayerPetRosterSnapshot } from '../../../shared/pet/petRoster.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type PetSlotPayload = {
  readonly slotIndex: number;
};

export type PetAffectionPayload = {
  readonly slotIndex?: number;
};

function buildPetRosterIntentData(
  playerId: string,
  characterId: number,
  extras?: Record<string, unknown>,
): { readonly roster: PlayerPetRosterSnapshot } & Record<string, unknown> {
  const snapshot = getPetRosterSnapshot(playerId, characterId);
  return {
    roster: {
      pets: snapshot.pets.map((pet) => ({ ...pet })),
      activeSlotIndex: snapshot.activeSlotIndex,
      selectedSlotIndex: snapshot.selectedSlotIndex,
    },
    ...extras,
  };
}

export function buildPetIntentAckData(
  playerId: string,
  characterId: number,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  const affinity = getPetAffinityRecord(playerId, characterId);
  return buildPetRosterIntentData(playerId, characterId, {
    affinity: {
      rationCharges: affinity.rationCharges,
      lastPetRationFeedAtMs: affinity.lastPetRationFeedAtMs,
      lastPetAffectionAtMs: affinity.lastPetAffectionAtMs,
    },
    ...extras,
  });
}

export class PetSelectSlotHandler extends BaseIntentHandler<PetSlotPayload> {
  readonly actionType = 'PET_SELECT_SLOT';

  async execute(playerId: string, payload: PetSlotPayload, intentId: string): Promise<void> {
    const result = selectPetSlotOnServer({
      playerId,
      characterId: this.characterId,
      slotIndex: payload.slotIndex,
      intentId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(
      playerId,
      intentId,
      true,
      buildPetRosterIntentData(playerId, this.characterId),
    );
  }
}

export class PetActivateSlotHandler extends BaseIntentHandler<PetSlotPayload> {
  readonly actionType = 'PET_ACTIVATE_SLOT';

  async execute(playerId: string, payload: PetSlotPayload, intentId: string): Promise<void> {
    const result = activatePetSlotOnServer({
      playerId,
      characterId: this.characterId,
      slotIndex: payload.slotIndex,
      intentId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(
      playerId,
      intentId,
      true,
      buildPetRosterIntentData(playerId, this.characterId, { message: result.message }),
    );
  }
}

export class PetDeactivateHandler extends BaseIntentHandler<Record<string, never>> {
  readonly actionType = 'PET_DEACTIVATE';

  async execute(playerId: string, _payload: Record<string, never>, intentId: string): Promise<void> {
    const result = deactivatePetsOnServer({
      playerId,
      characterId: this.characterId,
      intentId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(
      playerId,
      intentId,
      true,
      buildPetRosterIntentData(playerId, this.characterId, { message: 'Companheiro guardado.' }),
    );
  }
}

export class PetApplyAffectionHandler extends BaseIntentHandler<PetAffectionPayload> {
  readonly actionType = 'PET_APPLY_AFFECTION';

  async execute(playerId: string, payload: PetAffectionPayload, intentId: string): Promise<void> {
    const result = applyPetAffectionOnServer({
      playerId,
      characterId: this.characterId,
      ...(payload.slotIndex !== undefined ? { slotIndex: payload.slotIndex } : {}),
      intentId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(
      playerId,
      intentId,
      true,
      buildPetIntentAckData(playerId, this.characterId, {
        xpGained: result.xpGained,
        remainingMs: 0,
      }),
    );
  }
}

let selectHandler: PetSelectSlotHandler | null = null;
let activateHandler: PetActivateSlotHandler | null = null;
let deactivateHandler: PetDeactivateHandler | null = null;
let affectionHandler: PetApplyAffectionHandler | null = null;

export function getPetSelectSlotHandler(): PetSelectSlotHandler {
  if (!selectHandler) selectHandler = new PetSelectSlotHandler();
  return selectHandler;
}

export function getPetActivateSlotHandler(): PetActivateSlotHandler {
  if (!activateHandler) activateHandler = new PetActivateSlotHandler();
  return activateHandler;
}

export function getPetDeactivateHandler(): PetDeactivateHandler {
  if (!deactivateHandler) deactivateHandler = new PetDeactivateHandler();
  return deactivateHandler;
}

export function getPetApplyAffectionHandler(): PetApplyAffectionHandler {
  if (!affectionHandler) affectionHandler = new PetApplyAffectionHandler();
  return affectionHandler;
}
