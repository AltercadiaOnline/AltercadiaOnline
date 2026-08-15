import type { PlayerStatsBonus } from './playerStatsBonus.js';

/** Pilares da distribuição visual de build (sidebar). */
export const BUILD_DISTRIBUTION_PILLARS = ['ATK', 'DEF', 'CRIT', 'AGIL'] as const;

export type BuildDistributionPillar = (typeof BUILD_DISTRIBUTION_PILLARS)[number];

export type BuildDistributionWeights = Readonly<Record<BuildDistributionPillar, number>>;

export type BuildDistributionShare = {
  readonly id: BuildDistributionPillar;
  readonly label: string;
  /** Peso bruto (bônus % do SET / espelho autoritativo). */
  readonly weight: number;
  /** Parte de 100% — soma dos quatro = 100 (ou 0 se sem peso). */
  readonly percent: number;
};

export type BuildDistribution = {
  readonly shares: readonly BuildDistributionShare[];
  readonly totalWeight: number;
  /** True quando há pelo menos 1 ponto de bônus nos pilares. */
  readonly hasSignal: boolean;
};

export const BUILD_DISTRIBUTION_LABELS: Readonly<Record<BuildDistributionPillar, string>> = {
  ATK: 'ATK',
  DEF: 'DEF',
  CRIT: 'CRIT',
  AGIL: 'AGIL',
};

/** Extrai pesos dos 4 pilares a partir do bônus de SET (local = online espelhado). */
export function extractBuildDistributionWeights(
  statsBonus: Pick<PlayerStatsBonus, 'forca' | 'defesa' | 'critico' | 'agilidade'>,
): BuildDistributionWeights {
  return {
    ATK: Math.max(0, statsBonus.forca),
    DEF: Math.max(0, statsBonus.defesa),
    CRIT: Math.max(0, statsBonus.critico),
    AGIL: Math.max(0, statsBonus.agilidade),
  };
}

/**
 * Normaliza pesos para percentuais inteiros que somam 100 (largest remainder).
 * Sem sinal: todos 0% — UI mostra build vazia, sem inventar tendência.
 */
export function normalizeBuildDistributionPercents(
  weights: BuildDistributionWeights,
): Readonly<Record<BuildDistributionPillar, number>> {
  const total = BUILD_DISTRIBUTION_PILLARS.reduce((sum, id) => sum + weights[id], 0);
  if (total <= 0) {
    return { ATK: 0, DEF: 0, CRIT: 0, AGIL: 0 };
  }

  const raw = BUILD_DISTRIBUTION_PILLARS.map((id) => {
    const exact = (weights[id] / total) * 100;
    const floor = Math.floor(exact);
    return { id, floor, frac: exact - floor };
  });

  let remaining = 100 - raw.reduce((sum, row) => sum + row.floor, 0);
  const ranked = [...raw].sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id));
  const result: Record<BuildDistributionPillar, number> = {
    ATK: 0,
    DEF: 0,
    CRIT: 0,
    AGIL: 0,
  };
  for (const row of raw) {
    result[row.id] = row.floor;
  }
  for (const row of ranked) {
    if (remaining <= 0) break;
    result[row.id] += 1;
    remaining -= 1;
  }
  return result;
}

/** Display-only: deriva ATK/DEF/CRIT/AGIL % a partir do espelho de stats (não é autoridade de combate). */
export function computeBuildDistribution(
  statsBonus: Pick<PlayerStatsBonus, 'forca' | 'defesa' | 'critico' | 'agilidade'>,
): BuildDistribution {
  const weights = extractBuildDistributionWeights(statsBonus);
  const percents = normalizeBuildDistributionPercents(weights);
  const totalWeight = BUILD_DISTRIBUTION_PILLARS.reduce((sum, id) => sum + weights[id], 0);

  return {
    totalWeight,
    hasSignal: totalWeight > 0,
    shares: BUILD_DISTRIBUTION_PILLARS.map((id) => ({
      id,
      label: BUILD_DISTRIBUTION_LABELS[id],
      weight: weights[id],
      percent: percents[id],
    })),
  };
}
