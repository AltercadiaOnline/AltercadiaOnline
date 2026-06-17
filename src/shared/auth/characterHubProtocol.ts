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
