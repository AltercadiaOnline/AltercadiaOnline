import type { PetSnapshot } from './petModel.js';
import { getDefaultPetColorId, type PetColorId } from './petColorPalette.js';
import { getDefaultPetGenderId, sanitizePetGenderId, type PetGenderId } from './petGender.js';
import { createInitialPetCareFields } from './petState.js';

/** Espécies dimensionais vendidas pelo Treinador Zeno. */
export type PetKindId = 'dimensional_cat' | 'dimensional_dog';

export const TREINADOR_ZENO_NPC = 'treinador_zeno' as const;

export type PetCombatStats = {
  readonly dodgePercent?: number;
  readonly defensePercent?: number;
  readonly attackPercent?: number;
};

export type PetDefinition = {
  readonly kindId: PetKindId;
  readonly name: string;
  readonly shopTitle: string;
  readonly shopPitch: string;
  readonly hpMax: number;
  readonly baseDamage: number;
  readonly priceVolts: number;
  readonly followSpeedMult: number;
  readonly followOffsetMult: number;
  readonly flowSpeedBase: number;
  readonly attackSkillId: string;
  readonly attackSkillName: string;
  readonly attackPriority: 1 | 2 | 3;
  readonly combatStats: PetCombatStats;
};

export const PET_DEFINITIONS: Readonly<Record<PetKindId, PetDefinition>> = {
  dimensional_cat: {
    kindId: 'dimensional_cat',
    name: 'Gato Dimensional',
    shopTitle: 'Gato Dimensional',
    shopPitch: 'Ágil e letal. Ideal para quem busca finalizar oponentes rapidamente.',
    hpMax: 38,
    baseDamage: 14,
    priceVolts: 850,
    followSpeedMult: 1.14,
    followOffsetMult: 0.88,
    flowSpeedBase: 32,
    attackSkillId: 'pet_dim_cat_claws',
    attackSkillName: 'Garras Rápidas',
    attackPriority: 2,
    combatStats: { dodgePercent: 14, attackPercent: 8 },
  },
  dimensional_dog: {
    kindId: 'dimensional_dog',
    name: 'Cachorro Dimensional',
    shopTitle: 'Cachorro Dimensional',
    shopPitch: 'Leal e resistente. O protetor ideal para absorver dano nas batalhas.',
    hpMax: 72,
    baseDamage: 7,
    priceVolts: 850,
    followSpeedMult: 0.86,
    followOffsetMult: 1.08,
    flowSpeedBase: 18,
    attackSkillId: 'pet_dim_dog_bite',
    attackSkillName: 'Mordida Guardiã',
    attackPriority: 1,
    combatStats: { defensePercent: 18 },
  },
};

export const PET_KIND_ORDER: readonly PetKindId[] = [
  'dimensional_cat',
  'dimensional_dog',
];

export function getPetDefinition(kindId: PetKindId): PetDefinition {
  return PET_DEFINITIONS[kindId];
}

export function isPetKindId(value: string): value is PetKindId {
  return value === 'dimensional_cat' || value === 'dimensional_dog';
}

export function createPetSnapshot(
  kindId: PetKindId,
  options: {
    readonly name?: string;
    readonly colorId?: PetColorId;
    readonly gender?: PetGenderId;
  } = {},
): PetSnapshot {
  const def = getPetDefinition(kindId);
  const defaultColor = getDefaultPetColorId(kindId);
  const now = Date.now();
  const care = createInitialPetCareFields(kindId, now);
  return {
    ...care,
    kindId,
    name: options.name?.trim() || def.name,
    colorId: options.colorId ?? defaultColor,
    gender: options.gender ?? getDefaultPetGenderId(),
    hpMax: def.hpMax,
    hpCurrent: def.hpMax,
    status: 'ACTIVE',
    baseDamage: def.baseDamage,
    affinityXp: 0,
  };
}

export function resolvePetListingPrice(kindId: PetKindId): number {
  return getPetDefinition(kindId).priceVolts;
}
