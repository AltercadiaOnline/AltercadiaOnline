/**
 * Aposta 1x1 no púlpito ranqueado — vencedor leva o pote (winner-takes-all).
 * Cliente só escolhe o valor; lock/payout são autoritativos no servidor.
 */

export const PVP_RANKED_PRACTICE_BOT_PLAYER_ID = 'pvp_practice_bot';

export const PVP_RANKED_STAKE_MIN_NONZERO_VOLTS = 50;
export const PVP_RANKED_STAKE_MAX_VOLTS = 10_000;
export const PVP_RANKED_STAKE_PRESETS = [0, 50, 100, 250, 500, 1000] as const;

export function isPvpPracticeBotPlayer(playerId: string): boolean {
  return playerId === PVP_RANKED_PRACTICE_BOT_PLAYER_ID;
}

export function isAllowedPvpRankedStakeVolts(volts: number): boolean {
  if (!Number.isInteger(volts) || volts < 0) return false;
  if (volts === 0) return true;
  return volts >= PVP_RANKED_STAKE_MIN_NONZERO_VOLTS && volts <= PVP_RANKED_STAKE_MAX_VOLTS;
}

/** Join sem campo = 0. Valor inválido = null (recusar set-stake / ignorar no join). */
export function parsePvpRankedStakeVolts(raw: unknown): number | null {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const volts = Math.floor(raw);
  if (!isAllowedPvpRankedStakeVolts(volts)) return null;
  return volts;
}
