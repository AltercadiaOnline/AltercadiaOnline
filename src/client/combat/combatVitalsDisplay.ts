import { getCombatRole, resolveCombatantHp } from '../../shared/pet/petCombatRules.js';
import type { CombatState, Combatant } from '../../shared/types.js';

export type CombatantVital = {
  readonly hp: number;
  readonly maxHp: number;
};

export function readCombatantVital(combatant: Combatant): CombatantVital {
  const hp = resolveCombatantHp(combatant);
  const maxHp = Math.max(1, combatant.hpMax ?? combatant.maxHp ?? hp);
  return { hp, maxHp };
}

/**
 * Inimigo exibido no painel direito — primeiro ENEMY vivo; se todos a 0, o primeiro ENEMY (ordem estável).
 */
export function resolvePrimaryEnemyActorId(
  combatants: Readonly<Record<string, Combatant>>,
  playerActorId: string,
): string | null {
  const enemies = Object.entries(combatants).filter(
    ([id, c]) => id !== playerActorId && getCombatRole(c) === 'ENEMY',
  );
  if (enemies.length === 0) return null;

  const alive = enemies.filter(([, c]) => resolveCombatantHp(c) > 0);
  const pool = alive.length > 0 ? alive : enemies;
  pool.sort(([a], [b]) => a.localeCompare(b));
  return pool[0]?.[0] ?? null;
}

export function buildCombatantVitalsMap(
  combatants: Readonly<Record<string, Combatant>>,
): Map<string, CombatantVital> {
  const map = new Map<string, CombatantVital>();
  for (const [id, combatant] of Object.entries(combatants)) {
    map.set(id, readCombatantVital(combatant));
  }
  return map;
}
