import type { PetKindId } from './petCatalog.js';
import type { PetColorId } from './petColorPalette.js';
import type { PetGenderId } from './petGender.js';
import type { PetSnapshot } from './petModel.js';
import { resolvePetAffinityPercentFromXp } from './petAffinity.js';
import { resolvePetBond } from './petBond.js';
import type { PetInheritanceTokenId } from './petInheritance.js';
import {
  resolveInheritanceTokenId,
  resolvePreservedSkillId,
} from './petInheritance.js';
import type { PetLifePhase } from './petLifecycleConfig.js';
import { resolvePetLifePhase } from './petLifecycleConfig.js';
import {
  MAX_BIOLOGICAL_AGE,
  resolvePetBiologicalAge,
  sanitizePetCareFields,
} from './petState.js';

/** Registro permanente de um companheiro falecido — Livro de Memórias. */
export type MemorialEntry = {
  readonly memorialId: string;
  readonly instanceId: string;
  readonly petName: string;
  readonly kindId: PetKindId;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
  /** Idade biológica atingida (0–25 anos). */
  readonly ageYearsAtDeath: number;
  readonly lifePhaseAtDeath: PetLifePhase;
  /** Afinidade máxima alcançada (0–100%). */
  readonly maxAffinityPercent: number;
  readonly bondTierLabel: string;
  readonly birthDateMs: number;
  readonly deathDateMs: number;
  readonly farewellQuote: string;
  readonly inheritanceTokenId: PetInheritanceTokenId | null;
  /** Skill preservada quando Token de Reencarnação (25 anos). */
  readonly preservedSkillId: string | null;
};

export type PetMemorialBookSnapshot = {
  readonly entries: readonly MemorialEntry[];
};

export const PET_FAREWELL_QUOTES: readonly string[] = [
  'Partiu deixando rastros de luz nas ruas de Altercadia.',
  'Seu eco dimensional ainda guia nossos passos.',
  'Viveu cada batalha como se fosse a última — e venceu a maioria.',
  'O vínculo tático nunca se apaga; apenas muda de forma.',
  'Nas sombras da cidade, ainda ouvimos seu ronronar distante.',
  'Guardou memórias mais valiosas que qualquer loot.',
  'Envelheceu com honra. Descanse entre as dimensões.',
];

let memorialSeq = 0;

export function nextMemorialId(deathDateMs: number): string {
  memorialSeq += 1;
  return `memorial:${deathDateMs}:${memorialSeq}`;
}

export function resolveFarewellQuote(instanceId: string): string {
  let hash = 0;
  for (let i = 0; i < instanceId.length; i += 1) {
    hash = (hash * 31 + instanceId.charCodeAt(i)) >>> 0;
  }
  return PET_FAREWELL_QUOTES[hash % PET_FAREWELL_QUOTES.length] ?? PET_FAREWELL_QUOTES[0]!;
}

export function createMemorialEntryFromPet(
  pet: PetSnapshot,
  deathDateMs = Date.now(),
): MemorialEntry {
  const care = sanitizePetCareFields(pet, deathDateMs);
  const ageYearsAtDeath = resolvePetBiologicalAge(care.birthDateMs, care.agingPauseMs, deathDateMs);
  const maxAffinityPercent = resolvePetAffinityPercentFromXp(pet.affinityXp);
  const bond = resolvePetBond(pet);
  const inheritanceTokenId = resolveInheritanceTokenId(ageYearsAtDeath);
  const preservedSkillId = resolvePreservedSkillId(inheritanceTokenId, maxAffinityPercent);

  return {
    memorialId: nextMemorialId(deathDateMs),
    instanceId: care.instanceId,
    petName: pet.name,
    kindId: pet.kindId,
    colorId: pet.colorId,
    gender: pet.gender,
    ageYearsAtDeath: Math.min(MAX_BIOLOGICAL_AGE, ageYearsAtDeath),
    lifePhaseAtDeath: resolvePetLifePhase(ageYearsAtDeath),
    maxAffinityPercent,
    bondTierLabel: bond.tierLabel,
    birthDateMs: care.birthDateMs,
    deathDateMs,
    farewellQuote: resolveFarewellQuote(care.instanceId),
    inheritanceTokenId,
    preservedSkillId,
  };
}

export function sortMemorialEntries(entries: readonly MemorialEntry[]): MemorialEntry[] {
  return [...entries].sort((a, b) => b.deathDateMs - a.deathDateMs);
}

export function formatMemorialDate(timestampMs: number): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestampMs));
  } catch {
    return new Date(timestampMs).toISOString().slice(0, 10);
  }
}
