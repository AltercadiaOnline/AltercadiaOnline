import { SPEECH_BUBBLE_MAX_TEXT_CHARS } from './speechBubbleConstants.js';

export const CHAT_GLOBAL_ORIGINS = ['PLAYER', 'GM'] as const;

export type ChatGlobalOrigin = (typeof CHAT_GLOBAL_ORIGINS)[number];

/** Mensagem de chat global — apenas origem PLAYER ou GM. */
export type ChatGlobalPayload = {
  readonly origin: ChatGlobalOrigin;
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly text: string;
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly sentAt: number;
};

/** Alinhado ao balão de fala (máx. 3 linhas). */
export const CHAT_GLOBAL_MAX_TEXT_LENGTH = SPEECH_BUBBLE_MAX_TEXT_CHARS;

export function isChatGlobalOrigin(value: unknown): value is ChatGlobalOrigin {
  return value === 'PLAYER' || value === 'GM';
}

export function isChatGlobalPayload(value: unknown): value is ChatGlobalPayload {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return (
    isChatGlobalOrigin(p.origin)
    && typeof p.playerId === 'string'
    && typeof p.characterId === 'number'
    && typeof p.displayName === 'string'
    && typeof p.text === 'string'
    && typeof p.mapId === 'string'
    && typeof p.x === 'number'
    && typeof p.y === 'number'
    && typeof p.sentAt === 'number'
  );
}

/** Chat global aceita somente mensagens de jogador ou GM — retorno falso evita render. */
export function isPlayerOrGmChatPayload(value: unknown): value is ChatGlobalPayload {
  return isChatGlobalPayload(value);
}
