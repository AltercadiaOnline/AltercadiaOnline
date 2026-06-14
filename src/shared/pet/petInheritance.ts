import { MAX_BIOLOGICAL_AGE, resolvePetBiologicalAge } from './petState.js';

/** Tokens de Lembrança gerados quando um companheiro falece. */
export type PetInheritanceTokenId =
  | 'pena_memoria'
  | 'coleira_prata'
  | 'essencia_ancestral'
  | 'token_reencarnacao';

export type PetInheritanceTokenDefinition = {
  readonly id: PetInheritanceTokenId;
  readonly name: string;
  readonly description: string;
  readonly minAgeYears: number;
  readonly maxAgeYears: number;
  readonly xpBonusPercent: number;
  readonly dropBonusPercent: number;
  readonly statsBonusPercent: number;
  readonly preservesSkill: boolean;
};

export const PET_INHERITANCE_TOKENS: Readonly<Record<PetInheritanceTokenId, PetInheritanceTokenDefinition>> = {
  pena_memoria: {
    id: 'pena_memoria',
    name: 'Pena de Memória',
    description: 'Lembrança de um vínculo sincero. +2% XP permanente enquanto equipada.',
    minAgeYears: 10,
    maxAgeYears: 15,
    xpBonusPercent: 2,
    dropBonusPercent: 0,
    statsBonusPercent: 0,
    preservesSkill: false,
  },
  coleira_prata: {
    id: 'coleira_prata',
    name: 'Coleira de Prata',
    description: 'Marca de lealdade duradoura. +5% XP e +2% Drop.',
    minAgeYears: 16,
    maxAgeYears: 20,
    xpBonusPercent: 5,
    dropBonusPercent: 2,
    statsBonusPercent: 0,
    preservesSkill: false,
  },
  essencia_ancestral: {
    id: 'essencia_ancestral',
    name: 'Essência Ancestral',
    description: 'Eco dimensional de um guardião veterano. +10% XP e +5% Stats.',
    minAgeYears: 21,
    maxAgeYears: 24,
    xpBonusPercent: 10,
    dropBonusPercent: 0,
    statsBonusPercent: 5,
    preservesSkill: false,
  },
  token_reencarnacao: {
    id: 'token_reencarnacao',
    name: 'Token de Reencarnação',
    description: 'Preserva 1 skill do antecessor para o próximo companheiro dimensional.',
    minAgeYears: MAX_BIOLOGICAL_AGE,
    maxAgeYears: MAX_BIOLOGICAL_AGE,
    xpBonusPercent: 0,
    dropBonusPercent: 0,
    statsBonusPercent: 0,
    preservesSkill: true,
  },
};

export function resolveInheritanceTokenId(ageYears: number): PetInheritanceTokenId | null {
  const age = Math.min(MAX_BIOLOGICAL_AGE, Math.max(0, ageYears));
  if (age >= MAX_BIOLOGICAL_AGE) return 'token_reencarnacao';
  if (age >= 21) return 'essencia_ancestral';
  if (age >= 16) return 'coleira_prata';
  if (age >= 10) return 'pena_memoria';
  return null;
}

export function getInheritanceTokenDefinition(
  tokenId: PetInheritanceTokenId,
): PetInheritanceTokenDefinition {
  return PET_INHERITANCE_TOKENS[tokenId];
}

export function resolveInheritanceTokenFromPet(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): PetInheritanceTokenId | null {
  const ageYears = resolvePetBiologicalAge(birthDateMs, agingPauseMs, now);
  return resolveInheritanceTokenId(ageYears);
}

/** Skill simbólica preservada no Token de Reencarnação (25 anos). */
export function resolvePreservedSkillId(
  tokenId: PetInheritanceTokenId | null,
  affinityPercent: number,
): string | null {
  if (tokenId !== 'token_reencarnacao') return null;
  if (affinityPercent >= 80) return 'pet_bond_soulmate_echo';
  if (affinityPercent >= 40) return 'pet_bond_stable_echo';
  return 'pet_bond_training_echo';
}
