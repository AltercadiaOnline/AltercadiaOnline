import type { BattleEncounterData } from '../game/gameState.js';
import { CITY_01_ID } from './maps/city01.js';
import type { MapId } from './mapRegistry.js';
import { isMonsterDefeated } from './defeatedMonsterState.js';
import { getWorldMonsterEntry } from './worldMonsterInstances.js';

export type MonsterRegistryEntry = {
  readonly id: string;
  readonly name: string;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  /** Criatura do catálogo de combate / drops. */
  readonly creatureId: string;
};

/** Monstros estáticos de exploração (fora do spawn dinâmico da Zona 1). */
export const MONSTER_REGISTRY: readonly MonsterRegistryEntry[] = [
  {
    id: 'arena_guardian',
    name: 'Guardião da Arena',
    mapId: CITY_01_ID,
    tileX: 19,
    tileY: 19,
    creatureId: 'rat',
  },
] as const;

export function getMonsterRegistryEntry(monsterId: string): MonsterRegistryEntry | undefined {
  if (isMonsterDefeated(monsterId)) return undefined;
  return getWorldMonsterEntry(monsterId) ?? MONSTER_REGISTRY.find((entry) => entry.id === monsterId);
}

export function buildBattleEncounter(monsterId: string): BattleEncounterData | null {
  const entry = getMonsterRegistryEntry(monsterId);
  if (!entry) return null;
  return {
    monsterId: entry.id,
    monsterName: entry.name,
    mapId: entry.mapId,
    tileX: entry.tileX,
    tileY: entry.tileY,
    creatureId: entry.creatureId,
  };
}
