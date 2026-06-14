import { getCombatRole, resolveCombatantHp } from '../pet/petCombatRules.js';
import { BattleType } from './battleType.js';
import { isMirrorBotActorId, isMirrorBotName } from './mirrorPlayerConfig.js';
import { resolvePvpOpponentActorId } from './resolvePvpOpponent.js';
import type { CombatState, Combatant } from '../types.js';

function listEnemyActorIds(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): string[] {
  return Object.entries(combatants)
    .filter(([id, combatant]) => id !== playerActorId && getCombatRole(combatant) === 'ENEMY')
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Oponente principal na HUD — criatura PVE ou jogador (espelho) em duelo PVP.
 */
export function resolveBattleOpponentActorId(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
  battleType?: CombatState['battleType'],
): string | null {
  const pvpOpponent = resolvePvpOpponentActorId(combatants, playerActorId);
  if (pvpOpponent) return pvpOpponent;

  if (battleType === BattleType.PVP) {
    return pvpOpponent;
  }

  const enemies = listEnemyActorIds(combatants, playerActorId);
  if (enemies.length === 0) return null;

  const alive = enemies.filter((id) => resolveCombatantHp(combatants[id]!) > 0);
  const pool = alive.length > 0 ? alive : enemies;
  return pool[0] ?? null;
}

export function isMirrorBotCombatant(combatant: Combatant): boolean {
  return isMirrorBotActorId(combatant.id) || isMirrorBotName(combatant.name);
}
