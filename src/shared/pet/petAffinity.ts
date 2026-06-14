import type { PetSnapshot } from './petModel.js';

import {

  AFFINITY_STORAGE_SCALE,

  PET_AFFINITY_CONFIG,

} from './petAffinityConfig.js';



export type PetAffinityProgress = {

  /** Percentual inteiro (0–100) para tiers e rótulos. */

  readonly percent: number;

  /** Percentual com uma casa decimal para exibição. */

  readonly displayPercent: number;

  /** Ratio normalizado 0–1. */

  readonly ratio: number;

  /** Progresso fracionário dentro do percentual inteiro atual (0–1). */

  readonly fractionWithinPercent: number;

  /** Ganho estimado da próxima ração (rendimento decrescente). */

  readonly nextFeedGain: number;

  readonly atkBuff: number;

  readonly effectiveDamage: number;

  readonly atkBuffSteps: number;

};



function clampRatio(value: number): number {

  if (!Number.isFinite(value)) return 0;

  return Math.min(1, Math.max(0, value));

}



/** Converte saves legados (sistema XP) para escala ratio. */

function migrateLegacyAffinityStorage(raw: number): number {

  if (raw <= AFFINITY_STORAGE_SCALE) return raw;



  let remaining = Math.max(0, Math.floor(raw));

  let percent = 0;



  while (percent < PET_AFFINITY_CONFIG.maxPercent) {

    const cost = resolveLegacyXpForNextPercent(percent);

    if (remaining < cost) break;

    remaining -= cost;

    percent += 1;

  }



  const ratio = percent / PET_AFFINITY_CONFIG.maxPercent;

  return Math.round(clampRatio(ratio) * AFFINITY_STORAGE_SCALE);

}



/** Curva XP legada — só para migrar saves antigos. */

function resolveLegacyXpForNextPercent(currentPercent: number): number {

  if (currentPercent >= PET_AFFINITY_CONFIG.maxPercent) return 0;

  if (currentPercent < 40) return 90 + currentPercent * 5;

  if (currentPercent < 70) return 320 + (currentPercent - 40) * 14;

  return 740 + (currentPercent - 70) * 22;

}



export function clampPetAffinityXp(rawXp: number): number {

  if (!Number.isFinite(rawXp)) return 0;

  const migrated = migrateLegacyAffinityStorage(Math.floor(rawXp));

  return Math.max(0, Math.min(AFFINITY_STORAGE_SCALE, migrated));

}



export function resolvePetAffinityRatioFromStorage(affinityXp: number): number {

  return clampRatio(clampPetAffinityXp(affinityXp) / AFFINITY_STORAGE_SCALE);

}



export function resolvePetAffinityPercentFromXp(affinityXp: number): number {

  return Math.floor(resolvePetAffinityRatioFromStorage(affinityXp) * 100);

}



export function resolvePetFeedAffinityGain(currentRatio: number): number {

  const current = clampRatio(currentRatio);

  if (current >= 1) return 0;

  return PET_AFFINITY_CONFIG.baseGainPerFeed * (1 - current);

}



export function formatPetAffinityGainPercent(gainRatio: number): string {

  const pct = gainRatio * 100;

  if (pct >= 10) return pct.toFixed(1);

  if (pct >= 1) return pct.toFixed(2);

  return pct.toFixed(2);

}



export function resolvePetAffinityProgress(pet: PetSnapshot): PetAffinityProgress {

  const ratio = resolvePetAffinityRatioFromStorage(pet.affinityXp);

  const percent = Math.floor(ratio * 100);

  const displayPercent = Math.min(100, Math.floor(ratio * 1000) / 10);

  const fractionWithinPercent = ratio * 100 - percent;



  const atkBuffSteps = Math.floor(percent / 10);

  const atkBuff = atkBuffSteps * PET_AFFINITY_CONFIG.atkBuffPerTenPercent;

  const effectiveDamage = pet.baseDamage + atkBuff;



  return {

    percent,

    displayPercent,

    ratio,

    fractionWithinPercent,

    nextFeedGain: resolvePetFeedAffinityGain(ratio),

    atkBuff,

    effectiveDamage,

    atkBuffSteps,

  };

}



export function resolvePetAffinityAtkBuff(affinityPercent: number): number {

  const steps = Math.floor(

    Math.min(PET_AFFINITY_CONFIG.maxPercent, Math.max(0, affinityPercent)) / 10,

  );

  return steps * PET_AFFINITY_CONFIG.atkBuffPerTenPercent;

}



export function resolvePetEffectiveDamage(pet: PetSnapshot): number {

  return resolvePetAffinityProgress(pet).effectiveDamage;

}



export function applyPetAffinityBonus(pet: PetSnapshot, ratioBonus: number): PetSnapshot {

  const bonus = clampRatio(ratioBonus);

  if (bonus <= 0) return pet;



  const current = resolvePetAffinityRatioFromStorage(pet.affinityXp);

  if (current >= 1) return pet;



  const nextRatio = clampRatio(current + bonus);

  return {

    ...pet,

    affinityXp: Math.round(nextRatio * AFFINITY_STORAGE_SCALE),

  };

}



/** @deprecated Prefer applyPetAffinityBonus — amount is ratio (0–1), not XP. */

export function applyPetAffinityXp(pet: PetSnapshot, amount: number): PetSnapshot {

  return applyPetAffinityBonus(pet, amount);

}



export type PetFeedAffinityResult = {

  readonly pet: PetSnapshot;

  readonly gainRatio: number;

};



/** Alimentação — rendimento decrescente: BASE × (1 − afinidadeAtual). */

export function applyPetFeedAffinityGain(pet: PetSnapshot): PetFeedAffinityResult {

  const current = resolvePetAffinityRatioFromStorage(pet.affinityXp);

  const gainRatio = resolvePetFeedAffinityGain(current);

  if (gainRatio <= 0) {

    return { pet, gainRatio: 0 };

  }



  const nextRatio = clampRatio(current + gainRatio);

  let affinityXp = Math.round(nextRatio * AFFINITY_STORAGE_SCALE);

  if (gainRatio > 0 && affinityXp >= AFFINITY_STORAGE_SCALE - 1) {

    affinityXp = AFFINITY_STORAGE_SCALE;

  }



  return {

    pet: {

      ...pet,

      affinityXp,

    },

    gainRatio,

  };

}



/** @deprecated Sistema legado — retorna escala ratio equivalente a 100%. */

export function resolveTotalXpForMaxAffinity(): number {

  return AFFINITY_STORAGE_SCALE;

}


