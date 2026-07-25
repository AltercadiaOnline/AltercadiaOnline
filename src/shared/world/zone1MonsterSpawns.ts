// @ts-nocheck
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import type { MapId } from './mapRegistry.js';
import type { MonsterRegistryEntry } from './monsterRegistry.js';
import { getCreatureDropEntry } from '../items/creatureDrops.js';
import {
  CONSTRUCT_ZONE1_CREATURE_SPAWNS,
  resolveConstructSpawnLogical,
} from './constructCreatureSpawnPlacements.js';
import { resolveCreatureHitboxPx } from './creatureWanderConfig.js';

/** Catálogo de criaturas da Zona 1 (Beco). */
export const ZONE1_ALLEY_CREATURES = ['rat', 'crow', 'wild_dog', 'bat', 'spider'] as const;

export type Zone1CreatureId = (typeof ZONE1_ALLEY_CREATURES)[number];

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

/**
 * Instâncias do beco a partir dos markers Construct (`spawn_rato`, …).
 * Posição = hotspot do marker; combate/overlay usam estes IDs.
 */
export function buildZone1ConstructMonsterInstances(): MonsterRegistryEntry[] {
  return CONSTRUCT_ZONE1_CREATURE_SPAWNS.map((spawn) => {
    const logical = resolveConstructSpawnLogical(spawn);
    return {
      id: `beco_${spawn.creatureId}_${String(spawn.index + 1).padStart(2, '0')}`,
      name: getZone1CreatureDisplayName(spawn.creatureId),
      mapId: spawn.mapId,
      tileX: logical.tileX,
      tileY: logical.tileY,
      worldX: logical.worldX,
      worldY: logical.worldY,
      homeTileX: logical.tileX,
      homeTileY: logical.tileY,
      facing: 'south' as const,
      hitboxPx: resolveCreatureHitboxPx(spawn.creatureId),
      creatureId: spawn.creatureId,
    };
  });
}

/** @deprecated Alias — use buildZone1ConstructMonsterInstances. */
export function buildZone1TestMonsterInstances(): MonsterRegistryEntry[] {
  return buildZone1ConstructMonsterInstances();
}

export const ZONE1_SPAWN_TILES: readonly { readonly tileX: number; readonly tileY: number }[] =
  CONSTRUCT_ZONE1_CREATURE_SPAWNS.map((spawn) => {
    const logical = resolveConstructSpawnLogical(spawn);
    return { tileX: logical.tileX, tileY: logical.tileY };
  });

export const ZONE1_TEST_MONSTER_COUNT = CONSTRUCT_ZONE1_CREATURE_SPAWNS.length;

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
  if (count <= 0) return [];
  const base: Zone1CreatureId[] = [];
  for (let i = 0; i < count; i += 1) {
    base.push(ZONE1_ALLEY_CREATURES[i % ZONE1_ALLEY_CREATURES.length]!);
  }
  return seededShuffle(base, 0xbec0_2026);
}

export function zone1FarmMapId(): MapId {
  return FARM_ZONE_01_ID;
}
