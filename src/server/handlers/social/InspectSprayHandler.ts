import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { hasFriend } from '../../social/friendListStore.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { tacticalSprayService } from '../../../shared/social/tacticalSprayStore.js';
import {
  sanitizeSprayLegacyMessage,
  type SprayInspectView,
} from '../../../shared/social/spraySocialTypes.js';

export type InspectSprayPayload = {
  readonly sprayId: string;
};

function isAuthorOnline(playerId: string, characterId: number): boolean {
  return getWorldGameState().getByPlayer(playerId, characterId) !== null;
}

export function buildSprayInspectView(
  sprayId: string,
  viewerPlayerId: string,
  viewerCharacterId: number,
): SprayInspectView | null {
  const spray = tacticalSprayService.getSprayById(sprayId);
  if (!spray) return null;

  const profile = getAuthoritativeProgression(spray.userId, spray.authorCharacterId).characterProfile;
  const worldName = getWorldGameState().getByPlayer(spray.userId, spray.authorCharacterId)?.displayName;
  const displayName = profile.displayName?.trim() || worldName?.trim() || spray.authorNickname || 'Operative';
  const isAuthor = spray.userId === viewerPlayerId && spray.authorCharacterId === viewerCharacterId;

  return {
    sprayId: spray.id,
    mapId: spray.zoneId,
    tileX: spray.posX,
    tileY: spray.posY,
    sprayAssetId: spray.sprayAssetId,
    author: {
      playerId: spray.userId,
      characterId: spray.authorCharacterId,
      displayName,
      level: Math.max(1, Math.floor(profile.level || 1)),
      online: isAuthorOnline(spray.userId, spray.authorCharacterId),
      legacyMessage: sanitizeSprayLegacyMessage(profile.legacyMessage),
    },
    canEditLegacy: false,
    canAddFriend: !isAuthor && !hasFriend(viewerPlayerId, viewerCharacterId, spray.userId, spray.authorCharacterId),
  };
}

export class InspectSprayHandler extends BaseIntentHandler<InspectSprayPayload> {
  readonly actionType = 'INSPECT_SPRAY';

  async execute(playerId: string, payload: InspectSprayPayload, intentId: string): Promise<void> {
    const sprayId = typeof payload.sprayId === 'string' ? payload.sprayId.trim() : '';
    if (!sprayId) {
      this.sendResponse(playerId, intentId, false, 'SPRAY_NOT_FOUND');
      return;
    }

    const view = buildSprayInspectView(sprayId, playerId, this.characterId);
    if (!view) {
      this.sendResponse(playerId, intentId, false, 'SPRAY_NOT_FOUND');
      return;
    }

    this.sendResponse(playerId, intentId, true, { inspect: view });
  }
}

let handler: InspectSprayHandler | null = null;

export function getInspectSprayHandler(): InspectSprayHandler {
  if (!handler) handler = new InspectSprayHandler();
  return handler;
}
