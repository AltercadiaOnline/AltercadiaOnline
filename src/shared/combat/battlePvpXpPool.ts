/**
 * Pool de XP PvP — âncora = nível do oponente (mesma curva da zona PVE).
 * Nerf gradual quando o self é mais alto (Δ20 → ×0.5; Δ40 → ×0).
 */

/** Espelha `resolveZoneBattleXpPool`: 15 + nível × 10. */
export function resolvePvpOpponentXpPool(opponentLevel: number): number {
  const level = Math.max(1, Math.floor(opponentLevel));
  return 15 + level * 10;
}

/**
 * Δnível (self − oponente) para zerar o multiplicador.
 * Δ20 → 0.5 (nerf médio fechado em produto).
 */
export const PVP_LEVEL_GAP_NERF_FULL_AT_DELTA = 40;

/** Fração do pool (já nerfado) do vencedor para o perdedor (KO). */
export const PVP_CONSOLATION_RATIO = 0.4;

/**
 * Multiplicador 1 quando self ≤ oponente; cai linear até 0 em Δ = FULL_AT.
 */
export function resolvePvpLevelGapNerfMultiplier(
  selfLevel: number,
  opponentLevel: number,
): number {
  const delta = Math.floor(selfLevel) - Math.floor(opponentLevel);
  if (delta <= 0) return 1;
  return Math.max(0, 1 - delta / PVP_LEVEL_GAP_NERF_FULL_AT_DELTA);
}

/** Pool do vencedor após nerf de Δnível. */
export function resolvePvpWinnerXpPool(
  winnerLevel: number,
  loserLevel: number,
): number {
  const raw = resolvePvpOpponentXpPool(loserLevel);
  const mult = resolvePvpLevelGapNerfMultiplier(winnerLevel, loserLevel);
  return Math.max(0, Math.floor(raw * mult));
}

/** Consolação = 40% do pool já nerfado do vencedor. */
export function resolvePvpConsolationXpPool(winnerPoolAfterNerf: number): number {
  if (winnerPoolAfterNerf <= 0) return 0;
  return Math.max(0, Math.floor(winnerPoolAfterNerf * PVP_CONSOLATION_RATIO));
}
