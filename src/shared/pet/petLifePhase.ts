export {
  getPetLifePhaseLabel,
  MAX_BIOLOGICAL_AGE,
  MS_PER_DAY,
  PET_CARE_CONFIG,
  PET_LIFE_PHASE,
  PET_LIFE_PHASE_LABELS,
  PET_LIFE_PHASE_STAT_MULTIPLIER,
  PET_LIFESPAN_DAYS,
  PET_LIFESPAN_MS,
  PET_SENIOR_BIOLOGICAL_AGE,
  PET_SPECIAL_RATION_AGING_PAUSE_MS,
  resolvePetLifePhase,
  resolvePetLifePhaseStatMultiplier,
  resolveRealMonthsElapsed,
  type PetLifePhase,
} from './petLifecycleConfig.js';

import { resolvePetBiologicalAge } from './petState.js';
import { resolvePetLifePhase } from './petLifecycleConfig.js';

export function resolvePetLifePhaseFromPet(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): import('./petLifecycleConfig.js').PetLifePhase {
  const ageYears = resolvePetBiologicalAge(birthDateMs, agingPauseMs, now);
  return resolvePetLifePhase(ageYears);
}

export function isPetInSeniorPhase(
  birthDateMs: number,
  agingPauseMs: number,
  now = Date.now(),
): boolean {
  return resolvePetLifePhaseFromPet(birthDateMs, agingPauseMs, now) === 'senior';
}
