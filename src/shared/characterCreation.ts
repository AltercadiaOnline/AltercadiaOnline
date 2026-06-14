import type { ClassType } from './types/classes.js';

export type CreateCharacterInput = {
  name: string;
  class: ClassType;
  slotIndex: number;
};

export type CreateCharacterValidation =
  | { ok: true; name: string; class: ClassType; slotIndex: number }
  | { ok: false; message: string };

const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'_-]{1,15}$/u;

export function normalizeCharacterName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateCreateCharacterInput(input: CreateCharacterInput): CreateCharacterValidation {
  const name = normalizeCharacterName(input.name);
  const slotIndex = input.slotIndex;

  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 4) {
    return { ok: false, message: 'Slot de personagem inválido.' };
  }

  if (name.length < 2) {
    return { ok: false, message: 'O nome precisa ter pelo menos 2 caracteres.' };
  }

  if (!NAME_PATTERN.test(name)) {
    return { ok: false, message: 'Use apenas letras, números e espaços no nome.' };
  }

  const validClasses: ClassType[] = ['IMPETUS', 'COGITOR', 'TUTATOR', 'DISSOLUTUS'];
  if (!validClasses.includes(input.class)) {
    return { ok: false, message: 'Selecione uma classe válida.' };
  }

  return { ok: true, name, class: input.class, slotIndex };
}

export function nextCharacterId(existingIds: readonly number[]): number {
  if (existingIds.length === 0) return 1;
  return Math.max(...existingIds) + 1;
}
