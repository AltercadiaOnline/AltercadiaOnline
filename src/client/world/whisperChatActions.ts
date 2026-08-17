import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { openWhisperTab } from './whisperChatStore.js';

export function openWhisperWithFriend(
  playerId: string,
  characterId: number,
  displayName: string,
): void {
  openWhisperTab(playerId, characterId, displayName);
}

export function submitWhisperMessage(
  targetPlayerId: string,
  targetCharacterId: number,
  raw: string,
): void {
  const text = normalizeSpeechBubbleText(raw);
  if (!text) return;
  getActionDispatcher().dispatch({
    type: 'CHAT_WHISPER',
    payload: { targetPlayerId, targetCharacterId, text },
  });
}
