import { getCombatRole, resolveCombatantHp } from '../pet/petCombatRules.js';
import type { Combatant } from '../types.js';

/** Tamanho de bando PvE sorteado na entrada da batalha (autoridade = servidor). */
export type PveEncounterPackSize = 1 | 2 | 3;

export const PVE_PACK_SIZE_MIN = 1;
export const PVE_PACK_SIZE_MAX = 3;

/** 1 monstro 70% · 2 monstros 20% · 3 monstros 10%. */
export const PVE_PACK_SIZE_WEIGHTS = {
  1: 70,
  2: 20,
  3: 10,
} as const;

const PACK_SUFFIX = /__(\d+)$/;

/**
 * Sorteio ponderado O(1). `rng` ∈ [0, 1) — injetável em testes.
 * Faixas: [0, 70) → 1 · [70, 90) → 2 · [90, 100] → 3.
 */
export function rollPveEncounterPackSize(rng: () => number = Math.random): PveEncounterPackSize {
  const roll = rng() * 100;
  if (roll < PVE_PACK_SIZE_WEIGHTS[1]) return 1;
  if (roll < PVE_PACK_SIZE_WEIGHTS[1] + PVE_PACK_SIZE_WEIGHTS[2]) return 2;
  return 3;
}

export function clampPveEncounterPackSize(value: number): PveEncounterPackSize {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.floor(value);
  if (rounded <= 1) return 1;
  if (rounded >= 3) return 3;
  return 2;
}

/**
 * Índice 0 fica `enemy_{creatureId}` (legado). Demais: `enemy_{creatureId}__N`.
 */
export function buildPveEnemyActorId(creatureId: string, packIndex: number): string {
  if (packIndex <= 0) return `enemy_${creatureId}`;
  return `enemy_${creatureId}__${packIndex}`;
}

/** Remove sufixo de bando para mapear drop/XP (`enemy_rat__2` → `rat`). */
export function stripPveEnemyPackSuffix(actorTail: string): string {
  return actorTail.replace(PACK_SUFFIX, '');
}

export function listPveEnemyActorIds(
  combatants: Readonly<Record<string, Combatant>>,
): string[] {
  return Object.entries(combatants)
    .filter(([, entry]) => getCombatRole(entry) === 'ENEMY')
    .map(([id]) => id)
    .sort((a, b) => a.localeCompare(b));
}

export function listPveEnemyCombatants(
  combatants: Readonly<Record<string, Combatant>>,
): Combatant[] {
  return Object.values(combatants).filter((entry) => getCombatRole(entry) === 'ENEMY');
}

export function countPveEncounterPackSize(
  combatants: Readonly<Record<string, Combatant>>,
): PveEncounterPackSize {
  return clampPveEncounterPackSize(listPveEnemyCombatants(combatants).length);
}

export function countDefeatedPveEnemies(
  combatants: Readonly<Record<string, Combatant>>,
): number {
  return listPveEnemyCombatants(combatants).filter((entry) => resolveCombatantHp(entry) <= 0).length;
}

export function resolvePveLootSpinCount(
  combatants: Readonly<Record<string, Combatant>>,
  packSizeHint?: number,
): PveEncounterPackSize {
  if (typeof packSizeHint === 'number' && Number.isFinite(packSizeHint)) {
    return clampPveEncounterPackSize(packSizeHint);
  }
  return countPveEncounterPackSize(combatants);
}
