export const BattleType = {
  PVE: 'PVE',
  PVP: 'PVP',
} as const;

export type BattleType = (typeof BattleType)[keyof typeof BattleType];

/** Resumo autoritativo de ranking — enviado pelo servidor em duelos PVP. */
export type BattleRankingResult = {
  readonly pointsDelta?: number;
  readonly rankBefore?: number;
  readonly rankAfter?: number;
  /** Rótulo pronto para HUD (ex.: "Ranking Diário +15 pts"). */
  readonly summaryLabel?: string;
};

export function isBattleType(value: unknown): value is BattleType {
  return value === BattleType.PVE || value === BattleType.PVP;
}

export function isBattleRankingResult(value: unknown): value is BattleRankingResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const validNumber = (v: unknown) =>
    v === undefined || (typeof v === 'number' && Number.isFinite(v));
  return (
    validNumber(record.pointsDelta)
    && validNumber(record.rankBefore)
    && validNumber(record.rankAfter)
    && (record.summaryLabel === undefined || typeof record.summaryLabel === 'string')
  );
}

export function formatBattleRankingSummary(result?: BattleRankingResult | null): string {
  if (result?.summaryLabel) return result.summaryLabel;

  const parts: string[] = [];
  if (result?.pointsDelta !== undefined) {
    const sign = result.pointsDelta >= 0 ? '+' : '';
    parts.push(`${sign}${result.pointsDelta} pts`);
  }
  if (result?.rankBefore !== undefined && result.rankAfter !== undefined) {
    parts.push(`Posição #${result.rankBefore} → #${result.rankAfter}`);
  } else if (result?.rankAfter !== undefined) {
    parts.push(`Posição atual: #${result.rankAfter}`);
  }

  if (parts.length > 0) return parts.join(' · ');
  return 'Resultado do ranking — aguardando confirmação do servidor.';
}
