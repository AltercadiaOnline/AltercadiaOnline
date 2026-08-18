/**
 * Identidade do personagem — dados fixos do slot, não “estado de gameplay”.
 *
 * Ordem oficial:
 *   login → escolhe slot → CharacterIdentity (characterId + class + …)
 *   enter-world / combate / HUD leem a identidade da sessão
 *   full-state-sync carrega SÓ estado (itens, XP, posição, pets, skins…)
 *
 * Classe, nome e shard NÃO se re-inferem com fallback IMPETUS/Operative.
 * Skin NÃO é identidade — troca via loja/intent e vem do snapshot/save.
 */

import type { AccountCharacter } from '../types/account.js';
import type { ClassType } from '../types/classes.js';
import { isClassType } from '../progression/movesetMasterySeed.js';

/** Campos gravados na criação e ligados ao `characterId` para sempre. */
export type CharacterIdentity = {
  readonly characterId: number;
  readonly displayName: string;
  readonly classId: ClassType;
  readonly serverId: string;
  readonly slotIndex: number;
};

/**
 * Estado mutável — vem de snapshot/save, nunca substitui a identidade.
 * (lista de referência; o payload real continua em AuthoritativePlayerSnapshot)
 */
export type CharacterRuntimeStateKind =
  | 'level'
  | 'xp'
  | 'wallet'
  | 'inventory'
  | 'equipmentItems'
  | 'worldPosition'
  | 'vitals'
  | 'pets'
  | 'marcos'
  | 'movesetMastery'
  | 'activeMovesets'
  | 'skinBundleId'
  | 'ownedSkins';

export function isCharacterIdentity(value: unknown): value is CharacterIdentity {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.characterId === 'number'
    && Number.isInteger(row.characterId)
    && row.characterId >= 1
    && typeof row.displayName === 'string'
    && row.displayName.trim().length > 0
    && isClassType(row.classId)
    && typeof row.serverId === 'string'
    && row.serverId.length > 0
    && typeof row.slotIndex === 'number'
    && Number.isInteger(row.slotIndex)
    && row.slotIndex >= 0
  );
}

/** Hub slot → identidade. Falha se a classe do slot estiver inválida (não inventa IMPETUS). */
export function characterIdentityFromHubSlot(
  slot: AccountCharacter,
): CharacterIdentity | null {
  if (!isClassType(slot.class)) return null;
  const displayName = slot.name.trim();
  if (!displayName) return null;
  return {
    characterId: slot.id,
    displayName,
    classId: slot.class,
    serverId: slot.serverId,
    slotIndex: slot.slotIndex,
  };
}

/** Classe autoritativa da identidade — sem fallback silencioso. */
export function resolveIdentityClassId(
  identity: CharacterIdentity | null | undefined,
): ClassType | null {
  return identity && isClassType(identity.classId) ? identity.classId : null;
}

/** Classe gravada no hub/perfil — null se a coluna ainda não existir ou estiver vazia. */
export function parseHubClassId(value: unknown): ClassType | null {
  return isClassType(value) ? value : null;
}
