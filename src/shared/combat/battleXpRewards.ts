import { getMonsterByCreatureId } from './MonsterCatalog.js';

/** Nível de drop/XP derivado do catálogo da criatura (autoritativo no servidor). */
export function resolveDefeatedCreatureLevel(creatureId: string): number {
  const entry = getMonsterByCreatureId(creatureId);
  if (!entry) return 1;
  return Math.max(1, Math.floor(entry.maxHp / 35));
}

/** XP de vitória PvE — única fonte para o payload COMBAT_FINISHED. */
export function resolveBattleXpGain(creatureId: string, defeatedLevel?: number): number {
  const level = defeatedLevel ?? resolveDefeatedCreatureLevel(creatureId);
  return 15 + level * 10;
}
