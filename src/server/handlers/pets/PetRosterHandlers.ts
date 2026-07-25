// @ts-nocheck
import { activatePetSlotOnServer, applyPetAffectionOnServer, deactivatePetsOnServer, selectPetSlotOnServer, } from '../../../Economy/economyGateway.js';
import { getPetRosterSnapshot } from '../../../Economy/petRosterStore.js';
import { getPetAffinityRecord } from '../../../Economy/petAffinityStore.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
function buildPetRosterIntentData(playerId, characterId, extras) {
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
export function buildPetIntentAckData(playerId, characterId, extras) {
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
export class PetSelectSlotHandler extends BaseIntentHandler {
    actionType = 'PET_SELECT_SLOT';
    async execute(playerId, payload, intentId) {
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
        this.sendResponse(playerId, intentId, true, buildPetRosterIntentData(playerId, this.characterId));
    }
}
export class PetActivateSlotHandler extends BaseIntentHandler {
    actionType = 'PET_ACTIVATE_SLOT';
    async execute(playerId, payload, intentId) {
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
        this.sendResponse(playerId, intentId, true, buildPetRosterIntentData(playerId, this.characterId, { message: result.message }));
    }
}
export class PetDeactivateHandler extends BaseIntentHandler {
    actionType = 'PET_DEACTIVATE';
    async execute(playerId, _payload, intentId) {
        const result = deactivatePetsOnServer({
            playerId,
            characterId: this.characterId,
            intentId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        this.sendResponse(playerId, intentId, true, buildPetRosterIntentData(playerId, this.characterId, { message: 'Companheiro guardado.' }));
    }
}
export class PetApplyAffectionHandler extends BaseIntentHandler {
    actionType = 'PET_APPLY_AFFECTION';
    async execute(playerId, payload, intentId) {
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
        this.sendResponse(playerId, intentId, true, buildPetIntentAckData(playerId, this.characterId, {
            xpGained: result.xpGained,
            remainingMs: 0,
        }));
    }
}
let selectHandler = null;
let activateHandler = null;
let deactivateHandler = null;
let affectionHandler = null;
export function getPetSelectSlotHandler() {
    if (!selectHandler)
        selectHandler = new PetSelectSlotHandler();
    return selectHandler;
}
export function getPetActivateSlotHandler() {
    if (!activateHandler)
        activateHandler = new PetActivateSlotHandler();
    return activateHandler;
}
export function getPetDeactivateHandler() {
    if (!deactivateHandler)
        deactivateHandler = new PetDeactivateHandler();
    return deactivateHandler;
}
export function getPetApplyAffectionHandler() {
    if (!affectionHandler)
        affectionHandler = new PetApplyAffectionHandler();
    return affectionHandler;
}
