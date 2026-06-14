/** Progressão de Pet Love — meta ~150 dias com 1 ração/dia (rendimento decrescente). */
export const PET_AFFINITY_CONFIG = {
  maxPercent: 100,
  /** Ganho base por alimentação (~1,2% no início) — reduzido por rendimento decrescente. */
  baseGainPerFeed: 0.012,
  /** +ATK plano por degrau de 10% (10% = +2, 100% = +20). */
  atkBuffPerTenPercent: 2,
  /** Intervalo de bônus passivo com pet convocado no mundo aberto. */
  explorationIntervalMs: 5 * 60 * 1000,
  /** Bônus planos de afinidade (fração 0–1) — bem menores que a ração. */
  rewards: {
    battleVictoryPetAlive: 0.001,
    battleVictoryPetFainted: 0.0004,
    explorationSummonedTick: 0.00025,
    revivalAtCaelBonus: 0.002,
  },
} as const;



/** Escala interna: affinityXp = ratio × AFFINITY_STORAGE_SCALE (100% = 10_000). */

export const AFFINITY_STORAGE_SCALE = 10_000;



/** @deprecated Use PET_AFFINITY_CONFIG.baseGainPerFeed */

export const BASE_GAIN_PER_FEED = PET_AFFINITY_CONFIG.baseGainPerFeed;


