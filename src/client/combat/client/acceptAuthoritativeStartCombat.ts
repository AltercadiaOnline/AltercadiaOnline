/**
 * Gate de START_COMBAT — PVE exige join pendente; PVP rankeado chega da fila
 * (jogador ainda em exploração, sem pending PVE).
 */

export type StartCombatAcceptInput = {
  readonly pendingPveJoin: boolean;
  readonly inExploration: boolean;
  readonly transitioning: boolean;
  readonly inBattle: boolean;
  readonly battleType?: string;
  readonly matchId?: string;
};

export function isRankedPvpStartCombat(input: {
  readonly battleType?: string;
  readonly matchId?: string;
}): boolean {
  if (input.battleType === 'PVP') return true;
  return typeof input.matchId === 'string' && input.matchId.length > 0;
}

/** false → tratar como START_COMBAT órfão (abort PVE, não montar batalha). */
export function shouldAcceptAuthoritativeStartCombat(input: StartCombatAcceptInput): boolean {
  if (isRankedPvpStartCombat(input)) return true;
  if (input.inBattle || input.transitioning || input.pendingPveJoin) return true;
  return !input.inExploration;
}
