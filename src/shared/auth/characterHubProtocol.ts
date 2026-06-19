import { isAccountCharacterHub, type AccountCharacterHub } from '../characterHub.js';
import type { ClassType } from '../types/classes.js';

export type CharacterHubResponse = {
  readonly ok: true;
  readonly hub: AccountCharacterHub;
};

export type CharacterHubErrorResponse = {
  readonly ok: false;
  readonly message: string;
};

export type CreateCharacterRequest = {
  readonly slotIndex: number;
  readonly name: string;
  readonly class: ClassType;
};

export function isCharacterHubResponse(value: unknown): value is CharacterHubResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.ok === true && isAccountCharacterHub(record.hub);
}

export function isCharacterHubErrorResponse(value: unknown): value is CharacterHubErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.ok === false && typeof record.message === 'string';
}

/** Extrai mensagem legível de erros HTTP do character hub (SecurityGuard ou API). */
export function resolveCharacterHubErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (record.ok !== false) return null;

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error.trim();
  }

  if (typeof record.code === 'string') {
    const codeMessages: Record<string, string> = {
      AUTH_REQUIRED: 'Sessão expirada. Faça login novamente.',
      AUTH_INVALID: 'Sessão inválida. Faça login novamente.',
      AUTH_MISMATCH: 'Conta inconsistente. Faça login novamente.',
      WRONG_SERVER: 'Servidor incorreto. Escolha o shard correto.',
      PROFILE_NOT_READY: 'Personagem ainda não provisionado.',
    };
    return codeMessages[record.code] ?? record.code;
  }

  return null;
}
