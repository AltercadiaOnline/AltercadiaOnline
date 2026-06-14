import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { getCreatureDropEntry } from '../items/creatureDrops.js';

/** Criaturas de teste — Beco dos Fundos (Zona 1). */
export const ZONE1_ALLEY_CREATURES = ['rat', 'crow', 'wild_dog', 'bat', 'spider'] as const;

export type Zone1CreatureId = (typeof ZONE1_ALLEY_CREATURES)[number];

export const ZONE1_TEST_MONSTER_COUNT = 16;

/** Posições walkable no corredor central do beco (38×60 @ 40px). */
export const ZONE1_SPAWN_TILES: readonly { readonly tileX: number; readonly tileY: number }[] = [
  { tileX: 18, tileY: 8 },
  { tileX: 19, tileY: 11 },
  { tileX: 18, tileY: 14 },
  { tileX: 19, tileY: 17 },
  { tileX: 18, tileY: 20 },
  { tileX: 19, tileY: 23 },
  { tileX: 18, tileY: 26 },
  { tileX: 19, tileY: 29 },
  { tileX: 18, tileY: 32 },
  { tileX: 19, tileY: 35 },
  { tileX: 18, tileY: 38 },
  { tileX: 19, tileY: 41 },
  { tileX: 18, tileY: 44 },
  { tileX: 19, tileY: 47 },
  { tileX: 18, tileY: 50 },
  { tileX: 19, tileY: 53 },
] as const;

const CREATURE_DISPLAY_FALLBACK: Record<Zone1CreatureId, string> = {
  rat: 'Rato',
  crow: 'Corvo',
  wild_dog: 'Cão Selvagem',
  bat: 'Morcego',
  spider: 'Aranha',
};

export function getZone1CreatureDisplayName(creatureId: Zone1CreatureId): string {
  return getCreatureDropEntry(creatureId)?.creatureName ?? CREATURE_DISPLAY_FALLBACK[creatureId];
}

/** Fisher–Yates com seed fixa — distribuição pseudo-aleatória reprodutível. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;

  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    const j = state % (i + 1);
    const tmp = result[i]!;
    result[i] = result[j]!;
    result[j] = tmp;
  }

  return result;
}

export function buildZone1CreatureAssignment(count = ZONE1_TEST_MONSTER_COUNT): Zone1CreatureId[] {
  const base: Zone1CreatureId[] = [];
  for (let i = 0; i < count; i += 1) {
    base.push(ZONE1_ALLEY_CREATURES[i % ZONE1_ALLEY_CREATURES.length]!);
  }
  return seededShuffle(base, 0xbec0_2026);
}

export function buildZone1TestMonsterInstances(): MonsterRegistryEntry[] {
  const creatures = buildZone1CreatureAssignment();
  return ZONE1_SPAWN_TILES.map((tile, index) => {
    const creatureId = creatures[index]!;
    return {
      id: `beco_${creatureId}_${String(index + 1).padStart(2, '0')}`,
      name: getZone1CreatureDisplayName(creatureId),
      mapId: FARM_ZONE_01_ID as MapId,
      tileX: tile.tileX,
      tileY: tile.tileY,
      creatureId,
    };
  });
}
