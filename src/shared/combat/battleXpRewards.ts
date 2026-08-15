import { getCreatureDropEntry } from '../items/creatureDrops.js';
import { ZoneId } from '../items/itemTypes.js';
import type { CombatState } from '../types.js';
import { resolveMonsterZoneDefaultLevel } from './monsterZoneScaling.js';

/**
 * Fallback quando a sessão não gravou `pveEnemyCombatLevel`.
 * Segue o SSOT de zona (nível típico / meio da faixa) — não usa maxHp do catálogo.
 */
export function resolveDefeatedCreatureLevel(creatureId: string): number {
  const drop = getCreatureDropEntry(creatureId);
  const zoneId = drop?.zoneId ?? ZoneId.Zone1;
  return resolveMonsterZoneDefaultLevel(zoneId);
}

/**
 * Nível autoritativo da criatura derrotada nesta luta PvE.
 * Preferência: `CombatState.pveEnemyCombatLevel` (gravado no bootstrap via resolveMonsterStats).
 */
export function resolveSessionPveDefeatedLevel(
  state: Pick<CombatState, 'pveEnemyCombatLevel'>,
  creatureId?: string | null,
): number {
  const fromSession = state.pveEnemyCombatLevel;
  if (typeof fromSession === 'number' && Number.isFinite(fromSession) && fromSession >= 1) {
    return Math.floor(fromSession);
  }
  return creatureId ? resolveDefeatedCreatureLevel(creatureId) : 1;
}

/** XP de vitória PvE — única fonte para o payload COMBAT_FINISHED. */
export function resolveBattleXpGain(creatureId: string, defeatedLevel?: number): number {
  const level = defeatedLevel ?? resolveDefeatedCreatureLevel(creatureId);
  return 15 + level * 10;
}
