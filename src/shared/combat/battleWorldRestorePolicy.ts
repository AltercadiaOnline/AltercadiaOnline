/**
 * Política autoritativa de restauração no mapa após combate.
 * Cliente só espelha; servidor é a fonte da posição (perfil + WorldGameState).
 */

import type { BattleEndReason } from './battleEnded.js';
import { BattleType } from './battleType.js';

export type BattleWorldRestoreInput = {
  readonly battleType: BattleType;
  readonly victory: boolean;
  readonly endReason?: BattleEndReason;
  /** Duelo do card (sem rating) — derrota real espelha PVE (cidade + HP mínimo). */
  readonly casualPvp?: boolean;
};

/**
 * Derrota PVE (não fuga) → respawn cidade.
 * PVP ranqueado → mesma pose do duelo.
 * PVP casual derrota → mesma política do PVE (cidade + HP mínimo).
 * Vitória / fuga → mesma posição.
 */
export function shouldCityRespawnAfterBattle(input: BattleWorldRestoreInput): boolean {
  if (input.victory) return false;
  if (input.endReason === 'FORFEIT') return false;
  if (input.battleType === BattleType.PVP) {
    return input.casualPvp === true;
  }
  return true;
}

export type BattleArenaMode = 'pve' | 'pvp';

export function resolveBattleArenaMode(battleType: BattleType | string | null | undefined): BattleArenaMode {
  return battleType === BattleType.PVP || battleType === 'PVP' ? 'pvp' : 'pve';
}
