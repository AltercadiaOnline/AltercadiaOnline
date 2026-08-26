/** Progressão de Pet Love — meta ~50 dias com 1 ração/dia (rendimento decrescente). */
export const PET_AFFINITY_CONFIG = {
  maxPercent: 100,
  /** Ganho base por alimentação (~3,5% no início) — reduzido por rendimento decrescente. */
  baseGainPerFeed: 0.035,
  /** +ATK plano por degrau de 10% (10% = +2, 100% = +20). */
  atkBuffPerTenPercent: 2,
  /** Intervalo de bônus passivo com pet convocado no mundo aberto. */
  explorationIntervalMs: 5 * 60 * 1000,
  /** Bônus planos de afinidade (fração 0–1). */
  rewards: {
    battleVictoryPetAlive: 0.006,
    battleVictoryPetFainted: 0.0024,
    explorationSummonedTick: 0.0015,
    revivalAtCaelBonus: 0.012,
  },
} as const;



/** Escala interna: affinityXp = ratio × AFFINITY_STORAGE_SCALE (100% = 10_000). */

export const AFFINITY_STORAGE_SCALE = 10_000;



/** @deprecated Use PET_AFFINITY_CONFIG.baseGainPerFeed */

export const BASE_GAIN_PER_FEED = PET_AFFINITY_CONFIG.baseGainPerFeed;


