import { getWorldProfile } from '../../world/worldProfileStore.js';
import { normalizeSpeechBubbleText } from '../../../shared/world/speechBubbleText.js';
import type { ChatGlobalPayload } from '../../../shared/world/globalChatTypes.js';
import { validateGlobalChatOnServer } from '../../chat/globalChatModeratorServer.js';
import {
  broadcastChatGlobalPayload,
  resolveChatGlobalDisplayName,
} from '../../chat/chatGlobalBroadcast.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type ChatGlobalSendPayload = {
  readonly text: string;
};

/**
 * Chat global via player-intent — valida, monta payload e faz fanout `chat-global`.
 * Requer personagem com perfil de mundo.
 */
export class ChatGlobalSendHandler extends BaseIntentHandler<ChatGlobalSendPayload> {
  readonly actionType = 'CHAT_GLOBAL_SEND';

  async execute(
    playerId: string,
    payload: ChatGlobalSendPayload,
    intentId: string,
  ): Promise<void> {
    const text = normalizeSpeechBubbleText(payload.text ?? '');
    if (!text) {
      this.sendResponse(playerId, intentId, false, 'Mensagem vazia.');
      return;
    }

    const moderation = validateGlobalChatOnServer(text);
    if (!moderation.ok) {
      this.sendResponse(playerId, intentId, false, moderation.reason);
      return;
    }

    const characterId = this.characterId;
    if (!characterId || characterId < 1) {
      this.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }

    const profile = getWorldProfile(playerId, characterId);
    const chatPayload: ChatGlobalPayload = {
      origin: 'PLAYER',
      playerId,
      characterId,
      displayName: resolveChatGlobalDisplayName(playerId, characterId),
      text,
      mapId: profile.currentMapId,
      x: profile.lastPosition.x,
      y: profile.lastPosition.y,
      sentAt: Date.now(),
    };

    if (!broadcastChatGlobalPayload(chatPayload)) {
      this.sendResponse(playerId, intentId, false, 'CHAT_BROADCAST_UNAVAILABLE');
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      text: chatPayload.text,
      mapId: chatPayload.mapId,
      sentAt: chatPayload.sentAt,
    });
  }
}

let handler: ChatGlobalSendHandler | null = null;

export function getChatGlobalSendHandler(): ChatGlobalSendHandler {
  if (!handler) handler = new ChatGlobalSendHandler();
  return handler;
}
