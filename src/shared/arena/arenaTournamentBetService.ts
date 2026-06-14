import { BetDuelRules, WeeklyTournamentRules } from '../cityActivities/cityActivitiesConfig.js';
import { formatVoltsShort } from '../economy/premiumCurrency.js';

export const ARENA_TOURNAMENT_MIN_BET_VOLTS = 50;
export const ARENA_TOURNAMENT_MAX_BET_VOLTS = 10_000;
export const ARENA_TOURNAMENT_BET_PRESETS = [50, 100, 250, 500, 1000] as const;

export type ArenaTournamentBetValidation =
  | { readonly ok: true; readonly betVolts: number }
  | { readonly ok: false; readonly reason: string };

export function validateArenaTournamentBet(params: {
  readonly betVolts: number;
  readonly walletVolts: number;
}): ArenaTournamentBetValidation {
  const betVolts = Math.floor(params.betVolts);
  if (!Number.isFinite(betVolts) || betVolts < ARENA_TOURNAMENT_MIN_BET_VOLTS) {
    return {
      ok: false,
      reason: `Aposta mínima: ${ARENA_TOURNAMENT_MIN_BET_VOLTS} V.`,
    };
  }
  if (betVolts > ARENA_TOURNAMENT_MAX_BET_VOLTS) {
    return {
      ok: false,
      reason: `Aposta máxima: ${formatVoltsShort(ARENA_TOURNAMENT_MAX_BET_VOLTS)}.`,
    };
  }
  if (betVolts > params.walletVolts) {
    return { ok: false, reason: 'VOLTS insuficientes para esta aposta.' };
  }
  return { ok: true, betVolts };
}

export function resolveArenaTournamentBetPresets(walletVolts: number): readonly number[] {
  const affordable = ARENA_TOURNAMENT_BET_PRESETS.filter(
    (value) => value <= walletVolts && value <= ARENA_TOURNAMENT_MAX_BET_VOLTS,
  );
  if (affordable.length === 0) return [ARENA_TOURNAMENT_MIN_BET_VOLTS];
  return affordable;
}

export function describeArenaTournamentRules(): readonly string[] {
  return [
    `Torneio semanal — até ${WeeklyTournamentRules.maxPlayers} jogadores.`,
    `Top ${WeeklyTournamentRules.prizeTopCount} dividem o pote acumulado.`,
    BetDuelRules.winnerTakesAll
      ? 'Duelos rápidos: vencedor leva 100% da aposta.'
      : 'Apostas registradas no púlpito.',
    'Configure sua aposta e aguarde o pareamento.',
  ];
}
