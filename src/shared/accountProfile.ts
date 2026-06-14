import type { AccountProfile } from './types/account.js';
import { createEmptyCharacterHub } from './characterHub.js';

/** Perfil vazio — cada conta carrega seu hub próprio no cliente/servidor. */
export function createEmptyAccountProfile(userId: string): AccountProfile {
  return {
    userId,
    characters: createEmptyCharacterHub(userId).slots.filter((slot) => slot !== null),
  };
}
