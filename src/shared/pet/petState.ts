import type { PetSnapshot } from './petModel.js';
import {
  MAX_BIOLOGICAL_AGE,
  MS_PER_DAY,
  PET_CARE_CONFIG,
  PET_LIFESPAN_MS,
  PET_SENIOR_BIOLOGICAL_AGE,
  PET_FEED_AGING_PAUSE_MS,
  resolvePetLifePhase,
} from './petLifecycleConfig.js';
import { applyPetFeedAffinityGain } from './petAffinity.js';

/** Bem-estar imediato (fome/tristeza) — distinto de fase de vida. */
export type PetCareWellness = 'healthy' | 'sad' | 'hungry';

/** Status exibido na HUD — fase sênior sobrescreve wellness. */
export type PetCareStatus = 'healthy' | 'sad' | 'hungry' | 'senior';

export type PetState = {
  readonly id: string;
  readonly name: string;
  readonly birthDateMs: number;
  readonly lastCareTimeMs: number;
  readonly agingPauseMs: number;
  /** Idade biológica em anos (0–25) — 450 dias reais = 25 anos. */
  readonly ageYears: number;
  readonly lifePhase: import('./petLifecycleConfig.js').PetLifePhase;
  readonly wellness: PetCareWellness;
  readonly status: PetCareStatus;
  readonly requiresSpecialRation: boolean;
};

export {
  MAX_BIOLOGICAL_AGE,
  MS_PER_DAY,
  PET_CARE_CONFIG,
  PET_LIFESPAN_DAYS,
  PET_LIFESPAN_MS,
  PET_SENIOR_BIOLOGICAL_AGE,
  PET_FEED_AGING_PAUSE_MS,
} from './petLifecycleConfig.js';

export const PET_CARE_STATUS_LABELS: Readonly<Record<PetCareStatus, string>> = {
  healthy: 'Saudável',
  sad: 'Triste',
  hungry: 'Faminto',
  senior: 'Idoso',
};

let petInstanceSeq = 0;

export function resetPetInstanceSeqForTests(): void {
  petInstanceSeq = 0;
}

export function nextPetInstanceId(kindId: string, now = Date.now()): string {
  petInstanceSeq += 1;
  return `pet:${kindId}:${now}:${petInstanceSeq}`;
}

export function createInitialPetCareFields(
  kindId: string,
  now = Date.now(),
): Pick<PetSnapshot, 'instanceId' | 'birthDateMs' | 'lastCareTimeMs' | 'agingPauseMs' | 'longevityBonus'> {
  return {
    instanceId: nextPetInstanceId(kindId, now),
    birthDateMs: now,
    lastCareTimeMs: now,
    agingPauseMs: 0,
    longevityBonus: 0,
  };
}

export function sanitizePetCareFields(
  pet: PetSnapshot,
  now = Date.now(),
): Pick<PetSnapshot, 'instanceId' | 'birthDateMs' | 'lastCareTimeMs' | 'agingPauseMs' | 'longevityBonus'> {
  const birthDateMs = typeof pet.birthDateMs === 'number' && pet.birthDateMs > 0
    ? Math.floor(pet.birthDateMs)
    : now;
  const lastCareTimeMs = typeof pet.lastCareTimeMs === 'number' && pet.lastCareTimeMs > 0
    ? Math.floor(pet.lastCareTimeMs)
    : birthDateMs;
  const agingPauseMs = typeof pet.agingPauseMs === 'number' && pet.agingPauseMs >= 0
    ? Math.floor(pet.agingPauseMs)
    : (typeof pet.longevityBonus === 'number' && pet.longevityBonus >= 0
      ? Math.floor(pet.longevityBonus) * MS_PER_DAY
      : 0);
  const instanceId = typeof pet.instanceId === 'string' && pet.instanceId.length > 0
    ? pet.instanceId
    : nextPetInstanceId(pet.kindId, birthDateMs);

  return {
    instanceId,
    birthDateMs,
    lastCareTimeMs,
    agingPauseMs,
    longevityBonus: typeof pet.longevityBonus === 'number' ? Math.max(0, Math.floor(pet.longevityBonus)) : 0,
  };
}

export function resolveEffectiveAgeMs(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): number {
  return Math.max(0, now - birthDateMs - agingPauseMs);
}

export function resolvePetBiologicalAge(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): number {
  const effectiveMs = resolveEffectiveAgeMs(birthDateMs, agingPauseMs, now);
  const raw = (effectiveMs / PET_LIFESPAN_MS) * MAX_BIOLOGICAL_AGE;
  return Math.min(MAX_BIOLOGICAL_AGE, Math.max(0, raw));
}

export function resolvePetAgeYears(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): number {
  return resolvePetBiologicalAge(birthDateMs, agingPauseMs, now);
}

export function resolveBirthDateForBiologicalAge(
  targetAge: number,
  agingPauseMs = 0,
  now = Date.now(),
): number {
  const clamped = Math.min(MAX_BIOLOGICAL_AGE, Math.max(0, targetAge));
  const effectiveMs = (clamped / MAX_BIOLOGICAL_AGE) * PET_LIFESPAN_MS;
  return Math.floor(now - effectiveMs - agingPauseMs);
}

export function resolvePetWellness(
  lastCareTimeMs: number,
  now = Date.now(),
): PetCareWellness {
  const sinceCareMs = Math.max(0, now - lastCareTimeMs);
  if (sinceCareMs >= PET_CARE_CONFIG.hungerAfterMs) return 'hungry';
  if (sinceCareMs >= PET_CARE_CONFIG.sadAfterMs) return 'sad';
  return 'healthy';
}

export function resolvePetDisplayStatus(
  birthDateMs: number,
  lastCareTimeMs: number,
  agingPauseMs: number,
  now = Date.now(),
): PetCareStatus {
  const ageYears = resolvePetBiologicalAge(birthDateMs, agingPauseMs, now);
  if (resolvePetLifePhase(ageYears) === 'senior') return 'senior';
  return resolvePetWellness(lastCareTimeMs, now);
}

export function resolvePetCareStatus(
  birthDateMs: number,
  lastCareTimeMs: number,
  agingPauseMs: number,
  now = Date.now(),
): PetCareStatus {
  return resolvePetDisplayStatus(birthDateMs, lastCareTimeMs, agingPauseMs, now);
}

export function resolvePetState(pet: PetSnapshot, now = Date.now()): PetState {
  const care = sanitizePetCareFields(pet, now);
  const ageYears = resolvePetAgeYears(care.birthDateMs, care.agingPauseMs, now);
  const lifePhase = resolvePetLifePhase(ageYears);
  const wellness = resolvePetWellness(care.lastCareTimeMs, now);
  const status = resolvePetDisplayStatus(
    care.birthDateMs,
    care.lastCareTimeMs,
    care.agingPauseMs,
    now,
  );

  return {
    id: care.instanceId,
    name: pet.name,
    birthDateMs: care.birthDateMs,
    lastCareTimeMs: care.lastCareTimeMs,
    agingPauseMs: care.agingPauseMs,
    ageYears,
    lifePhase,
    wellness,
    status,
    requiresSpecialRation: lifePhase === 'senior' && wellness !== 'healthy',
  };
}

export function getPetCareStatusLabel(status: PetCareStatus): string {
  return PET_CARE_STATUS_LABELS[status];
}

export function isPetBiologicallySenior(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): boolean {
  return resolvePetBiologicalAge(birthDateMs, agingPauseMs, now) >= PET_SENIOR_BIOLOGICAL_AGE;
}

export function applyPetCare(pet: PetSnapshot, now = Date.now()): PetSnapshot {
  const care = sanitizePetCareFields(pet, now);
  return { ...pet, ...care, lastCareTimeMs: now };
}

export function applyPetAgingPause(
  pet: PetSnapshot,
  pauseMs: number,
  now = Date.now(),
): PetSnapshot {
  const care = sanitizePetCareFields(pet, now);
  return {
    ...pet,
    ...care,
    agingPauseMs: care.agingPauseMs + Math.max(0, Math.floor(pauseMs)),
    lastCareTimeMs: now,
  };
}

export function isPetLifeExpired(pet: PetSnapshot, now = Date.now()): boolean {
  const care = sanitizePetCareFields(pet, now);
  return resolvePetBiologicalAge(care.birthDateMs, care.agingPauseMs, now) >= MAX_BIOLOGICAL_AGE;
}

export type ApplyPetCareItemResult =
  | {
    readonly ok: true;
    readonly pet: PetSnapshot;
    readonly status: PetCareStatus;
    readonly affinityGainRatio: number;
  }
  | { readonly ok: false; readonly reason: string };

export function applyPetDirectFeed(
  pet: PetSnapshot,
  now = Date.now(),
): ApplyPetCareItemResult {
  const paused = applyPetAgingPause(pet, PET_FEED_AGING_PAUSE_MS, now);
  const { pet: fed, gainRatio } = applyPetFeedAffinityGain(paused);
  return { ok: true, pet: fed, status: 'healthy', affinityGainRatio: gainRatio };
}

/** @deprecated Use applyPetDirectFeed */
export function applyPetCareItem(
  pet: PetSnapshot,
  _itemId: string,
  now = Date.now(),
): ApplyPetCareItemResult {
  return applyPetDirectFeed(pet, now);
}
