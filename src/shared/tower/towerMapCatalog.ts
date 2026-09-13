/**
 * Layouts Construct ↔ mapId da Torre de Poder.
 * Wire em mapRegistry / CONSTRUCT_LAYOUT_BY_MAP_ID na fatia "Wire mundo".
 */

import type { TowerFloorIndex, TowerMapId } from './towerTypes.js';

export type TowerLayoutBinding = {
  readonly mapId: TowerMapId;
  readonly constructLayout: string;
  readonly floorIndex: 0 | TowerFloorIndex;
};

/** floorIndex 0 = hall público (gate). */
export const TOWER_LAYOUT_BINDINGS: readonly TowerLayoutBinding[] = [
  { mapId: 'tower_gate', constructLayout: 'entradatorredopoder', floorIndex: 0 },
  { mapId: 'tower_floor_1', constructLayout: 'andar_1_torre_poder', floorIndex: 1 },
  { mapId: 'tower_floor_2', constructLayout: 'andar_2_torre_poder', floorIndex: 2 },
  { mapId: 'tower_floor_3', constructLayout: 'andar_3_torre_poder', floorIndex: 3 },
  { mapId: 'tower_floor_4', constructLayout: 'andar_4_torre_poder2', floorIndex: 4 },
  { mapId: 'tower_floor_5', constructLayout: 'andar_5_torre_poder3', floorIndex: 5 },
] as const;

export const TOWER_CONSTRUCT_LAYOUT_BY_MAP_ID: Readonly<Record<TowerMapId, string>> =
  Object.fromEntries(TOWER_LAYOUT_BINDINGS.map((b) => [b.mapId, b.constructLayout])) as Record<
    TowerMapId,
    string
  >;

/** Markers Construct (aliases inclusos). */
export const TOWER_MARKER_IDS = {
  cityPortal: 'city_portal_towerpower',
  computer: 'computador_towerpower',
  enterSpawn: 'enter_spaw_towerpower',
  enterSpawnAlias: 'spaw_enter_towerpower',
  towerProp: 'torre_do_poder',
  bossActivator: 'ativador_boss',
  bossSpawn: 'spawn_boss_tower_power',
  nextLevel: 'next_level_power_tower',
  leaveCheckpoint: 'leave_level_power_tower2',
} as const;

export function resolveTowerMapIdForFloor(floorIndex: number): TowerMapId | null {
  const hit = TOWER_LAYOUT_BINDINGS.find((b) => b.floorIndex === floorIndex);
  return hit?.mapId ?? null;
}

export function isTowerMapId(value: string): value is TowerMapId {
  return value in TOWER_CONSTRUCT_LAYOUT_BY_MAP_ID;
}
