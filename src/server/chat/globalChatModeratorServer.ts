import { Filter } from 'bad-words';
import { CHAT_GLOBAL_INAPPROPRIATE_MESSAGE, type ChatModerationResult } from '../../shared/chat/chatModerationConstants.js';
import { getGlobalChatModerator } from '../../shared/chat/globalChatModerator.js';

const profanityFilter = new Filter();

/** Validação autoritativa — bad-words + lista customizada do jogo. */
export function validateGlobalChatOnServer(text: string): ChatModerationResult {
  const gameCheck = getGlobalChatModerator().validate(text);
  if (!gameCheck.ok) return gameCheck;

  const trimmed = text.trim();
  for (const variant of getGlobalChatModerator().moderationVariants(trimmed)) {
    if (profanityFilter.isProfane(variant)) {
      return { ok: false, reason: CHAT_GLOBAL_INAPPROPRIATE_MESSAGE };
    }
  }

  return { ok: true };
}
