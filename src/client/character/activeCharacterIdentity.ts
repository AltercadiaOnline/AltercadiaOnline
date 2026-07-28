/**
 * Sessão ativa: identidade do personagem selecionado.
 * Preenchida no char-select / enter-world — combate, HUD e moveset leem daqui
 * em vez de re-hidratar equipment store com defaults.
 */

import {
  characterIdentityFromHubSlot,
  type CharacterIdentity,
  resolveIdentityClassId,
} from '../../shared/character/characterIdentity.js';
import type { AccountCharacter } from '../../shared/types/account.js';
import type { ClassType } from '../../shared/types/classes.js';

let activeIdentity: CharacterIdentity | null = null;

export function getActiveCharacterIdentity(): CharacterIdentity | null {
  return activeIdentity;
}

export function clearActiveCharacterIdentity(): void {
  activeIdentity = null;
}

export function setActiveCharacterIdentity(identity: CharacterIdentity): void {
  activeIdentity = identity;
}

/** Char-select / enter-world — liga o slot do hub à sessão. */
export function bindActiveCharacterIdentityFromHubSlot(
  slot: AccountCharacter | null | undefined,
): CharacterIdentity | null {
  if (!slot) {
    activeIdentity = null;
    return null;
  }
  const identity = characterIdentityFromHubSlot(slot);
  activeIdentity = identity;
  return identity;
}

export function getActiveCharacterClassId(): ClassType | null {
  return resolveIdentityClassId(activeIdentity);
}

/** Classe da sessão, com fallback explícito só quando a identidade ainda não ligou. */
export function requireActiveCharacterClassId(
  fallback?: ClassType | null,
): ClassType {
  const fromIdentity = getActiveCharacterClassId();
  if (fromIdentity) return fromIdentity;
  if (fallback) return fallback;
  throw new Error(
    '[CharacterIdentity] Classe indisponível — selecione o personagem antes de entrar no mundo.',
  );
}
