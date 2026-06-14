/** Configuração central do ciclo de vida — 450 dias reais = 25 anos biológicos. */

export const PET_LIFESPAN_DAYS = 450;

export const MAX_BIOLOGICAL_AGE = 25;

export const PET_SENIOR_BIOLOGICAL_AGE = 20;



export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PET_LIFESPAN_MS = PET_LIFESPAN_DAYS * MS_PER_DAY;



/** Preço da pilha de ração no Ancião Cael (débito em VOLTS). */
export const CAEL_PET_RATION_PRICE_VOLTS = 380;

/** Cargas creditadas na HUD Pet Love por compra (não vai ao inventário). */
export const PET_SPECIAL_RATION_CHARGES_PER_PURCHASE = 30;

/** @deprecated Use PET_SPECIAL_RATION_CHARGES_PER_PURCHASE */
export const PET_SPECIAL_RATION_MAX_CHARGES = PET_SPECIAL_RATION_CHARGES_PER_PURCHASE;

/** Id virtual — catálogo/quote; item não existe no inventário. */
export const PET_SPECIAL_RATION_ITEM_ID = 'racao_especial_cael' as const;

/** Alimentação congela o envelhecimento biológico por 24 h (acumulável offline). */
export const PET_FEED_AGING_PAUSE_MS = MS_PER_DAY;



/** @deprecated Use PET_FEED_AGING_PAUSE_MS */

export const PET_SPECIAL_RATION_AGING_PAUSE_MS = PET_FEED_AGING_PAUSE_MS;



export const PET_CARE_CONFIG = {

  sadAfterMs: 3 * 60 * 60 * 1000,

  hungerAfterMs: 6 * 60 * 60 * 1000,

} as const;



/** Limites biológicos (anos) por fase de vida. */

export const PET_LIFE_PHASE = {

  youngMaxAgeYears: 5,

  maturityMaxAgeYears: PET_SENIOR_BIOLOGICAL_AGE,

  seniorMaxAgeYears: MAX_BIOLOGICAL_AGE,

} as const;



export type PetLifePhase = 'young' | 'maturity' | 'senior';



export const PET_LIFE_PHASE_LABELS: Readonly<Record<PetLifePhase, string>> = {

  young: 'Jovem',

  maturity: 'Maturidade',

  senior: 'Sênior',

};



export const PET_LIFE_PHASE_STAT_MULTIPLIER: Readonly<Record<PetLifePhase, number>> = {

  young: 0.85,

  maturity: 1,

  senior: 0.92,

};



export function resolvePetLifePhase(ageYears: number): PetLifePhase {

  const age = Math.min(MAX_BIOLOGICAL_AGE, Math.max(0, ageYears));

  if (age >= PET_LIFE_PHASE.maturityMaxAgeYears) return 'senior';

  if (age >= PET_LIFE_PHASE.youngMaxAgeYears) return 'maturity';

  return 'young';

}



export function getPetLifePhaseLabel(phase: PetLifePhase): string {

  return PET_LIFE_PHASE_LABELS[phase];

}



export function resolvePetLifePhaseStatMultiplier(phase: PetLifePhase): number {

  return PET_LIFE_PHASE_STAT_MULTIPLIER[phase];

}



export function resolveRealMonthsElapsed(ageYears: number): number {

  const fraction = ageYears / MAX_BIOLOGICAL_AGE;

  return Math.min(15, Math.max(0, fraction * (PET_LIFESPAN_MS / (30 * MS_PER_DAY))));

}



export function isPetInSeniorPhase(

  birthDateMs: number,

  agingPauseMs: number,

  now: number,

  resolveAge: (birth: number, pause: number, at: number) => number,

): boolean {

  return resolvePetLifePhase(resolveAge(birthDateMs, agingPauseMs, now)) === 'senior';

}


