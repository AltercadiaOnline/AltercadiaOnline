import type { Combatant } from '../types.js';
import type { PetSnapshot } from './petModel.js';
import { getPetDefinition } from './petCatalog.js';
import { getDefaultPetColorId } from './petColorPalette.js';
import { getDefaultPetGenderId } from './petGender.js';
import { createInitialPetCareFields } from './petState.js';

export type CombatRole = 'PLAYER' | 'PET' | 'ENEMY';

export const PET_BASIC_ATTACK_SKILL_ID = 'pet_basic_attack';

export function buildPetActorId(ownerPlayerId: string): string {
  return `pet_${ownerPlayerId}`;
}

export function getCombatRole(combatant: Combatant): CombatRole {
  if (combatant.combatRole) return combatant.combatRole;
  if (combatant.id.startsWith('enemy_')) return 'ENEMY';
  if (combatant.id.startsWith('pet_')) return 'PET';
  return 'PLAYER';
}

export function isPetCombatant(combatant: Combatant): boolean {
  return getCombatRole(combatant) === 'PET';
}

/** Pet ativo na fila — status ACTIVE e HP > 0. */
export function isPetCombatantActive(combatant: Combatant): boolean {
  if (!isPetCombatant(combatant)) return false;
  if (combatant.petStatus === 'INACTIVE') return false;
  const hp = combatant.hpCurrent ?? combatant.hp;
  return hp > 0;
}

export function resolveCombatantHp(combatant: Combatant): number {
  return combatant.hpCurrent ?? combatant.hp ?? 0;
}

export function isCombatantAlive(combatant: Combatant): boolean {
  return resolveCombatantHp(combatant) > 0;
}

export function petSnapshotFromCombatant(combatant: Combatant): PetSnapshot | null {
  if (!isPetCombatant(combatant)) return null;
  const hpMax = combatant.hpMax ?? combatant.maxHp;
  const hpCurrent = resolveCombatantHp(combatant);
  const status = combatant.petStatus ?? (hpCurrent > 0 ? 'ACTIVE' : 'INACTIVE');
  const skill = combatant.skills[0];
  const kindId = combatant.petKindId ?? 'dimensional_cat';
  const def = getPetDefinition(kindId);
  const colorId = combatant.petColorId ?? getDefaultPetColorId(kindId);
  const gender = combatant.petGenderId ?? getDefaultPetGenderId();
  const care = createInitialPetCareFields(kindId);
  return {
    ...care,
    kindId,
    name: combatant.name || def.name,
    colorId,
    gender,
    hpMax,
    hpCurrent,
    status,
    baseDamage: skill?.damage ?? def.baseDamage,
    affinityXp: 0,
  };
}

/** Aplica HP pós-dano no pet — zera HP e marca INACTIVE se derrotado. */
export function applyPetCombatHp(combatant: Combatant, hpAfter: number): Combatant {
  if (!isPetCombatant(combatant)) {
    return { ...combatant, hp: hpAfter, hpCurrent: hpAfter };
  }
  const clamped = Math.max(0, hpAfter);
  if (clamped > 0) {
    return {
      ...combatant,
      hp: clamped,
      hpCurrent: clamped,
      petStatus: 'ACTIVE',
    };
  }
  return {
    ...combatant,
    hp: 0,
    hpCurrent: 0,
    petStatus: 'INACTIVE',
  };
}

export function wasPetJustDefeated(before: Combatant, after: Combatant): boolean {
  return isPetCombatant(before)
    && isPetCombatantActive(before)
    && after.petStatus === 'INACTIVE';
}
