/**
 * Aposta 1x1 no púlpito ranqueado — cada um escolhe o valor; vencedor leva o pote
 * menos 5% (casa). Cliente só escolhe; lock/payout são autoritativos no servidor.
 */

export const PVP_RANKED_PRACTICE_BOT_PLAYER_ID = 'pvp_practice_bot';

export const PVP_RANKED_STAKE_MIN_VOLTS = 50;
export const PVP_RANKED_STAKE_MAX_VOLTS = 10_000;
export const PVP_RANKED_HOUSE_RAKE_RATE = 0.05;

export function isPvpPracticeBotPlayer(playerId: string): boolean {
  return playerId === PVP_RANKED_PRACTICE_BOT_PLAYER_ID;
}

/** Rascunho no slot: 0 = ainda sem aposta. Lock exige mínimo 50. */
export function isDraftPvpRankedStakeVolts(volts: number): boolean {
  if (!Number.isInteger(volts) || volts < 0) return false;
  if (volts === 0) return true;
  return volts >= PVP_RANKED_STAKE_MIN_VOLTS && volts <= PVP_RANKED_STAKE_MAX_VOLTS;
}

export function isLockablePvpRankedStakeVolts(volts: number): boolean {
  return Number.isInteger(volts)
    && volts >= PVP_RANKED_STAKE_MIN_VOLTS
    && volts <= PVP_RANKED_STAKE_MAX_VOLTS;
}

/** Join sem campo = 0. Valor inválido = null. */
export function parsePvpRankedStakeVolts(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const volts = Math.floor(raw);
  if (!isDraftPvpRankedStakeVolts(volts)) return null;
  return volts;
}

/** set-stake / travar: 0 não vale. */
export function parsePvpRankedLockStakeVolts(raw: unknown): number | null {
  const parsed = parsePvpRankedStakeVolts(raw);
  if (parsed === null || parsed === 0) return null;
  if (!isLockablePvpRankedStakeVolts(parsed)) return null;
  return parsed;
}

export function computePvpRankedPotSettlement(
  winnerStakeVolts: number,
  loserStakeVolts: number,
): {
  readonly potVolts: number;
  readonly rakeVolts: number;
  readonly payoutVolts: number;
} {
  const potVolts = Math.max(0, Math.floor(winnerStakeVolts)) + Math.max(0, Math.floor(loserStakeVolts));
  const rakeVolts = Math.round(potVolts * PVP_RANKED_HOUSE_RAKE_RATE);
  const payoutVolts = Math.max(0, potVolts - rakeVolts);
  return { potVolts, rakeVolts, payoutVolts };
}
