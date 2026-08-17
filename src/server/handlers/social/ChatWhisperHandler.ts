import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { normalizeSpeechBubbleText } from '../../../shared/world/speechBubbleText.js';
import { validateGlobalChatOnServer } from '../../chat/globalChatModeratorServer.js';
import { resolveChatGlobalDisplayName } from '../../chat/chatGlobalBroadcast.js';
import { deliverChatWhisperPayload } from '../../chat/chatWhisperDeliver.js';
import { hasFriend } from '../../social/friendListStore.js';
import type { ChatWhisperPayload, ChatWhisperSendPayload } from '../../../shared/social/chatWhisperTypes.js';

export class ChatWhisperHandler extends BaseIntentHandler<ChatWhisperSendPayload> {
  readonly actionType = 'CHAT_WHISPER';

  async execute(
    playerId: string,
    payload: ChatWhisperSendPayload,
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

    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'Alvo inválido.');
      return;
    }

    if (targetPlayerId === playerId && targetCharacterId === characterId) {
      this.sendResponse(playerId, intentId, false, 'Não é possível enviar mensagem para si mesmo.');
      return;
    }

    const linked =
      hasFriend(playerId, characterId, targetPlayerId, targetCharacterId)
      || hasFriend(targetPlayerId, targetCharacterId, playerId, characterId);
    if (!linked) {
      this.sendResponse(playerId, intentId, false, 'Só é possível falar com quem está na lista de amigos.');
      return;
    }

    const fromWorld = getWorldGameState().getByPlayer(playerId, characterId);
    if (!fromWorld) {
      this.sendResponse(playerId, intentId, false, 'Você precisa estar no mundo para enviar mensagem privada.');
      return;
    }

    const toWorld = getWorldGameState().getByPlayer(targetPlayerId, targetCharacterId);
    if (!toWorld) {
      this.sendResponse(playerId, intentId, false, 'O jogador não está online.');
      return;
    }

    const fromDisplayName = resolveChatGlobalDisplayName(playerId, characterId);
    const toDisplayName =
      toWorld.displayName.trim()
      || resolveChatGlobalDisplayName(targetPlayerId, targetCharacterId);

    const whisper: ChatWhisperPayload = {
      fromPlayerId: playerId,
      fromCharacterId: characterId,
      fromDisplayName,
      toPlayerId: targetPlayerId,
      toCharacterId: targetCharacterId,
      toDisplayName,
      text,
      sentAt: Date.now(),
    };

    const delivered = deliverChatWhisperPayload(
      [fromWorld.connectionId, toWorld.connectionId],
      whisper,
    );
    if (!delivered) {
      this.sendResponse(playerId, intentId, false, 'CHAT_BROADCAST_UNAVAILABLE');
      return;
    }

    this.sendResponse(playerId, intentId, true, { whisper });
  }
}

let handler: ChatWhisperHandler | null = null;

export function getChatWhisperHandler(): ChatWhisperHandler {
  if (!handler) handler = new ChatWhisperHandler();
  return handler;
}
