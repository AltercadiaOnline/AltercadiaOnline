import { CHAT_GLOBAL_MAX_TEXT_LENGTH } from '../world/globalChatTypes.js';

export const CHAT_WHISPER_MAX_TEXT_LENGTH = CHAT_GLOBAL_MAX_TEXT_LENGTH;

export type ChatWhisperPayload = {
  readonly fromPlayerId: string;
  readonly fromCharacterId: number;
  readonly fromDisplayName: string;
  readonly toPlayerId: string;
  readonly toCharacterId: number;
  readonly toDisplayName: string;
  readonly text: string;
  readonly sentAt: number;
};

export type ChatWhisperSendPayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
  readonly text: string;
};

export function isChatWhisperPayload(value: unknown): value is ChatWhisperPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.fromPlayerId === 'string'
    && record.fromPlayerId.length > 0
    && typeof record.fromCharacterId === 'number'
    && Number.isFinite(record.fromCharacterId)
    && typeof record.fromDisplayName === 'string'
    && typeof record.toPlayerId === 'string'
    && record.toPlayerId.length > 0
    && typeof record.toCharacterId === 'number'
    && Number.isFinite(record.toCharacterId)
    && typeof record.toDisplayName === 'string'
    && typeof record.text === 'string'
    && record.text.length > 0
    && typeof record.sentAt === 'number'
    && Number.isFinite(record.sentAt)
  );
}

export function whisperPeerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}
