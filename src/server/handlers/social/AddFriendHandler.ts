import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { getPlayerSocket } from '../../net/playerSocketLookup.js';
import { notifyPlayer } from '../../net/logServiceChannel.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { addFriend } from '../../social/friendListStore.js';

export type AddFriendPayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
};

export class AddFriendHandler extends BaseIntentHandler<AddFriendPayload> {
  readonly actionType = 'ADD_FRIEND';

  async execute(playerId: string, payload: AddFriendPayload, intentId: string): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'Alvo de amizade inválido.');
      return;
    }

    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    if (targetPlayerId === playerId && targetCharacterId === characterId) {
      this.sendResponse(playerId, intentId, false, 'Não é possível adicionar a si mesmo.');
      return;
    }

    const targetName =
      getAuthoritativeProgression(targetPlayerId, targetCharacterId).characterProfile.displayName?.trim()
      || getWorldGameState().getByPlayer(targetPlayerId, targetCharacterId)?.displayName.trim()
      || 'Operative';

    const fromName =
      getAuthoritativeProgression(playerId, characterId).characterProfile.displayName?.trim()
      || getWorldGameState().getByPlayer(playerId, characterId)?.displayName.trim()
      || 'Operative';

    const added = addFriend(playerId, characterId, {
      playerId: targetPlayerId,
      characterId: targetCharacterId,
      displayName: targetName,
      addedAt: Date.now(),
    });
    if (!added.ok) {
      this.sendResponse(playerId, intentId, false, added.reason);
      return;
    }

    const targetSocket = getPlayerSocket(targetPlayerId);
    if (targetSocket) {
      notifyPlayer(targetSocket, `${fromName} adicionou você como amigo.`);
    }

    const online = Boolean(getWorldGameState().getByPlayer(targetPlayerId, targetCharacterId));
    this.sendResponse(playerId, intentId, true, {
      targetPlayerId,
      targetCharacterId,
      message: `${targetName} foi adicionado como amigo.`,
      friend: { ...added.entry, online },
    });
  }
}

let handler: AddFriendHandler | null = null;

export function getAddFriendHandler(): AddFriendHandler {
  if (!handler) handler = new AddFriendHandler();
  return handler;
}
