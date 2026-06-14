/**
 * Ordem de turno — decisão oficial:
 * 1) Prioridade do move no moveset (1/2/3) — camada dominante
 * 2) Contribuição percentual dos atributos de velocidade (effectiveSpeedRaw)
 * 3) Seed determinística
 */
export type InitiativeFormulaConfig = {
  readonly movesetPriorityScoreBySkillPriority: Readonly<Record<'1' | '2' | '3', number>>;
  readonly speedAttributePercent: number;
  readonly movesetTierScale?: number;
};

export type InitiativeBreakdown = {
  readonly skillPriority: 1 | 2 | 3;
  readonly movesetPriorityScore: number;
  readonly effectiveSpeedRaw: number;
  readonly speedAttributeContribution: number;
  readonly initiativeScore: number;
};

export function computeSpeedAttributeContribution(
  effectiveSpeedRaw: number,
  speedAttributePercent: number,
): number {
  const pct = Math.max(0, speedAttributePercent) / 100;
  return effectiveSpeedRaw * pct;
}

export function computeInitiativeBreakdown(
  skillPriority: 1 | 2 | 3,
  effectiveSpeedRaw: number,
  config: InitiativeFormulaConfig,
): InitiativeBreakdown {
  const key = String(skillPriority) as '1' | '2' | '3';
  const movesetPriorityScore = config.movesetPriorityScoreBySkillPriority[key] ?? skillPriority;
  const speedAttributeContribution = computeSpeedAttributeContribution(
    effectiveSpeedRaw,
    config.speedAttributePercent,
  );
  const tierScale = config.movesetTierScale ?? 100;
  const initiativeScore = movesetPriorityScore * tierScale + speedAttributeContribution;

  return {
    skillPriority,
    movesetPriorityScore,
    effectiveSpeedRaw,
    speedAttributeContribution,
    initiativeScore,
  };
}

export type RankedInitiativeEntry = InitiativeBreakdown & {
  readonly tieBreakerSeed: number;
};

/** Comparador autoritativo — moveset primeiro, depois % velocidade, depois seed. */
export function compareInitiativeEntries(a: RankedInitiativeEntry, b: RankedInitiativeEntry): number {
  if (a.skillPriority !== b.skillPriority) return b.skillPriority - a.skillPriority;
  if (a.speedAttributeContribution !== b.speedAttributeContribution) {
    return b.speedAttributeContribution - a.speedAttributeContribution;
  }
  return a.tieBreakerSeed - b.tieBreakerSeed;
}

export type TurnOrderReason = 'PRIORITY' | 'SPEED_ATTRIBUTE' | 'SEED';

export function resolveTurnOrderReason(ranked: readonly RankedInitiativeEntry[]): TurnOrderReason {
  if (ranked.length <= 1) return 'SEED';
  const first = ranked[0];
  const second = ranked[1];
  if (!first || !second) return 'SEED';
  if (first.skillPriority !== second.skillPriority) return 'PRIORITY';
  if (first.speedAttributeContribution !== second.speedAttributeContribution) return 'SPEED_ATTRIBUTE';
  return 'SEED';
}
