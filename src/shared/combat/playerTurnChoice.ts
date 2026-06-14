import type { CombatState } from '../types.js';
import { getAlliancePlayerTurnsSincePet } from './allianceTurnCycle.js';
import { battleUsesPetTurnQueue } from './petTurnOrder.js';

/** O jogador pode escolher movimento/poção neste snapshot? */
export function canPlayerIssueCombatChoice(
  state: CombatState,
  playerActorId: string,
): boolean {
  if (state.phase !== 'CHOOSING') return false;
  if (state.activeActorId !== playerActorId) return false;
  return true;
}

export type CombatChoiceWindowKey = {
  readonly turn: number;
  readonly allianceSlot: number;
};

export function resolveCombatChoiceWindowKey(
  state: CombatState,
  playerActorId: string,
): CombatChoiceWindowKey | null {
  if (!canPlayerIssueCombatChoice(state, playerActorId)) return null;
  const usesAlliance = battleUsesPetTurnQueue(state.combatants);
  return {
    turn: state.turn,
    allianceSlot: usesAlliance ? getAlliancePlayerTurnsSincePet(state) : 0,
  };
}

export function matchesCombatChoiceWindow(
  actionTurn: number,
  window: CombatChoiceWindowKey,
): boolean {
  return actionTurn === window.turn;
}
