import type { PetKindId } from './petCatalog.js';
import type { PetColorId } from './petColorPalette.js';
import type { PetGenderId } from './petGender.js';

/** Status operacional do pet — inativo remove o pet da fila de turnos e do mapa. */
export type PetStatus = 'ACTIVE' | 'INACTIVE';

/**
 * Espelho autoritativo do pet fora e dentro do combate.
 * Cliente apenas exibe; mutações passam pelo gateway/serviço (ex.: Ancião Cael).
 */
export type PetSnapshot = {
  readonly instanceId: string;
  readonly kindId: PetKindId;
  readonly name: string;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
  readonly birthDateMs: number;
  readonly lastCareTimeMs: number;
  /** Ms acumulados em que o envelhecimento biológico ficou congelado (ração Cael). */
  readonly agingPauseMs: number;
  /** @deprecated Migrado para agingPauseMs — mantido para saves legados. */
  readonly longevityBonus: number;
  readonly hpMax: number;
  readonly hpCurrent: number;
  readonly status: PetStatus;
  readonly baseDamage: number;
  /** XP acumulado de Pet Love — 0 ao adotar; percentual derivado em petAffinity. */
  readonly affinityXp: number;
};

/** @deprecated Use createPetSnapshot(kindId) — mantido para testes legados. */
export function createDemoPet(name = 'Drone Tático'): PetSnapshot {
  const now = Date.now();
  return {
    instanceId: `pet:demo:${now}`,
    kindId: 'dimensional_cat',
    name,
    colorId: 'slate',
    gender: 'male',
    birthDateMs: now,
    lastCareTimeMs: now,
    agingPauseMs: 0,
    longevityBonus: 0,
    hpMax: 40,
    hpCurrent: 40,
    status: 'ACTIVE',
    baseDamage: 8,
    affinityXp: 0,
  };
}

export function isPetOperational(pet: PetSnapshot): boolean {
  return pet.status === 'ACTIVE' && pet.hpCurrent > 0;
}

export function canPetEnterBattle(pet: PetSnapshot): boolean {
  return isPetOperational(pet);
}

export function applyPetDamage(pet: PetSnapshot, amount: number): PetSnapshot {
  const hpCurrent = Math.max(0, pet.hpCurrent - Math.max(0, amount));
  if (hpCurrent <= 0) {
    return { ...pet, hpCurrent: 0, status: 'INACTIVE' };
  }
  return { ...pet, hpCurrent };
}

/** Derrota em combate — HP zero e inativo. */
export function deactivatePet(pet: PetSnapshot): PetSnapshot {
  return { ...pet, hpCurrent: 0, status: 'INACTIVE' };
}

/** Alterna convocação manual (guardar/recuperar) sem alterar HP. */
export function setPetSummoned(pet: PetSnapshot, summoned: boolean): PetSnapshot {
  if (pet.hpCurrent <= 0) return pet;
  return { ...pet, status: summoned ? 'ACTIVE' : 'INACTIVE' };
}

export function isPetDefeated(pet: PetSnapshot): boolean {
  return pet.hpCurrent <= 0;
}
