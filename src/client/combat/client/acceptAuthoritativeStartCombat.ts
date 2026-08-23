/**
 * Gate de START_COMBAT — PVE exige join pendente ou force-join autoritativo
 * (`monsterInstanceId`, ex.: Agente Vórtex). PVP rankeado chega da fila
 * (jogador ainda em exploração, sem pending PVE).
 */

export type StartCombatAcceptInput = {
  readonly pendingPveJoin: boolean;
  readonly inExploration: boolean;
  readonly transitioning: boolean;
  readonly inBattle: boolean;
  readonly battleType?: string;
  readonly matchId?: string;
  /** PVE forçado pelo servidor (caça do agente / próximo encontro obrigatório). */
  readonly monsterInstanceId?: string;
};

export function isRankedPvpStartCombat(input: {
  readonly battleType?: string;
  readonly matchId?: string;
}): boolean {
  if (input.battleType === 'PVP') return true;
  return typeof input.matchId === 'string' && input.matchId.length > 0;
}

function hasAuthoritativePveMonster(input: StartCombatAcceptInput): boolean {
  return typeof input.monsterInstanceId === 'string' && input.monsterInstanceId.length > 0;
}

/** false → tratar como START_COMBAT órfão (abort PVE, não montar batalha). */
export function shouldAcceptAuthoritativeStartCombat(input: StartCombatAcceptInput): boolean {
  if (isRankedPvpStartCombat(input)) return true;
  if (hasAuthoritativePveMonster(input)) return true;
  if (input.inBattle || input.transitioning || input.pendingPveJoin) return true;
  return !input.inExploration;
}
