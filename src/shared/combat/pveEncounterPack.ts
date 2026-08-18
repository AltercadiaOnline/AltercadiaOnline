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

/** Nv 1–3: só solo. O beco não abre em trio no primeiro contato. */
export const PVE_PACK_SOLO_MAX_PLAYER_LEVEL = 3;
/** Nv 4–6: no máximo dupla. */
export const PVE_PACK_DUO_MAX_PLAYER_LEVEL = 6;

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

export function capPveEncounterPackSizeForPlayerLevel(
  rolled: PveEncounterPackSize,
  playerLevel: number,
): PveEncounterPackSize {
  const level = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1;
  if (level <= PVE_PACK_SOLO_MAX_PLAYER_LEVEL) return 1;
  if (level <= PVE_PACK_DUO_MAX_PLAYER_LEVEL) {
    return rolled === 3 ? 2 : rolled;
  }
  return rolled;
}

export function rollPveEncounterPackSizeForPlayer(
  playerLevel: number,
  rng: () => number = Math.random,
): PveEncounterPackSize {
  return capPveEncounterPackSizeForPlayerLevel(rollPveEncounterPackSize(rng), playerLevel);
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

/** Índice no bando: `enemy_rat` → 0, `enemy_rat__2` → 2. */
export function resolvePveEnemyPackIndex(actorId: string): number {
  const match = PACK_SUFFIX.exec(actorId);
  if (!match) return 0;
  const index = Number(match[1]);
  return Number.isInteger(index) && index >= 0 ? index : 0;
}

/**
 * O 1º age já; o 2º entra no ciclo 1; o 3º no ciclo 2.
 * `reactionCycle` começa em 0 na primeira reação inimiga da batalha.
 */
export function pvePackMemberReadyOnCycle(packIndex: number, reactionCycle: number): boolean {
  const index = Math.max(0, Math.floor(packIndex));
  const cycle = Math.max(0, Math.floor(reactionCycle));
  return index <= cycle;
}

export function formatPvePackStaggerLog(creatureName: string): string {
  const name = creatureName.trim() || 'A criatura';
  return `${name} ainda se posiciona no bando.`;
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
