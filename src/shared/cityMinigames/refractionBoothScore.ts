import { REFRACTION_BOOTH_CONFIG } from './refractionBoothConfig.js';

export function calculateRefractionBoothScore(hits: number, misses: number): number {
  const cappedHits = Math.min(Math.max(0, Math.floor(hits)), REFRACTION_BOOTH_CONFIG.maxHits);
  const safeMisses = Math.max(0, Math.floor(misses));
  return cappedHits * REFRACTION_BOOTH_CONFIG.scorePerHit - safeMisses * REFRACTION_BOOTH_CONFIG.scorePerMiss;
}

export function resolveRefractionBoothPrize(score: number): number {
  for (const tier of REFRACTION_BOOTH_CONFIG.prizeTiers) {
    if (score >= tier.minScore) return tier.prizeVolts;
  }
  return 0;
}

export function clampRefractionBoothPrizeToDailyCap(
  prizeVolts: number,
  earnedTodayVolts: number,
): number {
  if (prizeVolts <= 0) return 0;
  const remaining = REFRACTION_BOOTH_CONFIG.maxDailyPrizeVolts - earnedTodayVolts;
  return Math.max(0, Math.min(prizeVolts, remaining));
}
