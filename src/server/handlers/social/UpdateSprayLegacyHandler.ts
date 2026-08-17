import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import {
  patchAuthoritativeProgression,
  getAuthoritativeProgression,
} from '../../progression/authoritativeProgressionStore.js';
import { persistCharacterSession } from '../../persistence/PersistenceGateway.js';
import {
  sanitizeSprayLegacyMessage,
  SPRAY_LEGACY_MESSAGE_MAX_CHARS,
} from '../../../shared/social/spraySocialTypes.js';
import { tacticalSprayService } from '../../../shared/social/tacticalSprayStore.js';

export type UpdateSprayLegacyPayload = {
  readonly message: string;
  readonly sprayId?: string;
};

export class UpdateSprayLegacyHandler extends BaseIntentHandler<UpdateSprayLegacyPayload> {
  readonly actionType = 'UPDATE_SPRAY_LEGACY';

  async execute(playerId: string, payload: UpdateSprayLegacyPayload, intentId: string): Promise<void> {
    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const sprayId = typeof payload.sprayId === 'string' ? payload.sprayId.trim() : '';
    if (sprayId) {
      const spray = tacticalSprayService.getSprayById(sprayId);
      if (!spray) {
        this.sendResponse(playerId, intentId, false, 'SPRAY_NOT_FOUND');
        return;
      }
      if (spray.userId !== playerId || spray.authorCharacterId !== characterId) {
        this.sendResponse(playerId, intentId, false, 'NOT_SPRAY_AUTHOR');
        return;
      }
    }

    const message = sanitizeSprayLegacyMessage(payload.message);
    if (typeof payload.message === 'string' && payload.message.length > SPRAY_LEGACY_MESSAGE_MAX_CHARS) {
      this.sendResponse(playerId, intentId, false, `Máximo de ${SPRAY_LEGACY_MESSAGE_MAX_CHARS} caracteres.`);
      return;
    }

    patchAuthoritativeProgression(playerId, characterId, {
      characterProfile: { legacyMessage: message },
    });
    await persistCharacterSession(playerId, characterId, { reason: 'progression', force: true });

    const saved = getAuthoritativeProgression(playerId, characterId).characterProfile.legacyMessage ?? '';
    this.sendResponse(playerId, intentId, true, { legacyMessage: saved });
  }
}

let handler: UpdateSprayLegacyHandler | null = null;

export function getUpdateSprayLegacyHandler(): UpdateSprayLegacyHandler {
  if (!handler) handler = new UpdateSprayLegacyHandler();
  return handler;
}
