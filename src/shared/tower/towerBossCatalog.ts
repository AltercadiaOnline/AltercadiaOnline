/**
 * Catálogo de mecânicas por andar (entrada + estilo).
 * Runtime de combate aplica no servidor — não no cliente.
 */

import type { TowerFloorIndex } from './towerTypes.js';

export type TowerBossEntryKind =
  | 'pull_nearest_solo_turns'
  | 'marked_and_locked_out'
  | 'enter_with_random_status'
  | 'none'
  | 'pull_nearest_short_plus_status';

export type TowerBossCombatKind =
  | 'tank_double_hit'
  | 'control_bias_buffed'
  | 'status_dot'
  | 'enrage_hp_steps'
  | 'checkpoint_mix';

export type TowerBossDefinition = {
  readonly floorIndex: TowerFloorIndex;
  readonly bossId: string;
  readonly assetDir: string;
  readonly entry: {
    readonly kind: TowerBossEntryKind;
    readonly soloTurns?: number;
    readonly markedFocusTurns?: number;
    readonly lockedOutTurns?: number;
  };
  readonly combat: {
    readonly kind: TowerBossCombatKind;
    /** Andar 1 / 5: a cada N ataques do boss, chance de hit duplo. */
    readonly doubleHitEveryAttacks?: number;
    readonly doubleHitChance?: number;
    /** Andar 4 / 5: degraus de HP (0–1). */
    readonly enrageHpSteps?: readonly number[];
  };
};

export const TOWER_BOSS_CATALOG: Readonly<Record<TowerFloorIndex, TowerBossDefinition>> = {
  1: {
    floorIndex: 1,
    bossId: 'tower_boss_floor_01',
    assetDir: 'boss_tower_power/floor_01',
    entry: { kind: 'pull_nearest_solo_turns', soloTurns: 2 },
    combat: {
      kind: 'tank_double_hit',
      doubleHitEveryAttacks: 3,
      doubleHitChance: 0.4,
    },
  },
  2: {
    floorIndex: 2,
    bossId: 'tower_boss_floor_02',
    assetDir: 'boss_tower_power/floor_02',
    entry: {
      kind: 'marked_and_locked_out',
      markedFocusTurns: 2,
      lockedOutTurns: 4,
    },
    combat: { kind: 'control_bias_buffed' },
  },
  3: {
    floorIndex: 3,
    bossId: 'tower_boss_floor_03',
    assetDir: 'boss_tower_power/floor_03',
    entry: { kind: 'enter_with_random_status' },
    combat: { kind: 'status_dot' },
  },
  4: {
    floorIndex: 4,
    bossId: 'tower_boss_floor_04',
    assetDir: 'boss_tower_power/floor_04',
    entry: { kind: 'none' },
    combat: {
      kind: 'enrage_hp_steps',
      enrageHpSteps: [0.75, 0.5, 0.25],
    },
  },
  5: {
    floorIndex: 5,
    bossId: 'tower_boss_floor_05',
    assetDir: 'boss_tower_power/floor_05',
    entry: { kind: 'pull_nearest_short_plus_status', soloTurns: 1 },
    combat: {
      kind: 'checkpoint_mix',
      doubleHitEveryAttacks: 3,
      doubleHitChance: 0.4,
      enrageHpSteps: [0.75, 0.5, 0.25],
    },
  },
};

export function getTowerBossDefinition(floorIndex: number): TowerBossDefinition | null {
  if (floorIndex < 1 || floorIndex > 5) return null;
  return TOWER_BOSS_CATALOG[floorIndex as TowerFloorIndex] ?? null;
}
