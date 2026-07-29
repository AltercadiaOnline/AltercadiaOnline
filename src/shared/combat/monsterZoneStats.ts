import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { CombatClassId } from '../types.js';
import {
  getMonsterZoneScalingConfig,
  resolveMonsterStats,
  resolveMonsterZoneDefaultLevel,
  MONSTER_ELITE_HP_MULTIPLIER,
} from './monsterZoneScaling.js';

export type MonsterZoneStatTemplate = {
  readonly maxHp: number;
  readonly flowSpeedBase: number;
  readonly classId: CombatClassId;
  readonly attack: number;
};

/**
 * Snapshot estático no meio da faixa (legado / catálogo).
 * Preferir `resolveMonsterStats(zoneId, level, elite)` em combate.
 */
export const MONSTER_ZONE_STAT_TEMPLATE: Record<ZoneIdType, MonsterZoneStatTemplate> = {
  [ZoneId.Zone1]: templateAtDefault(ZoneId.Zone1),
  [ZoneId.Zone2]: templateAtDefault(ZoneId.Zone2),
  [ZoneId.Zone3]: templateAtDefault(ZoneId.Zone3),
  [ZoneId.Zone4]: templateAtDefault(ZoneId.Zone4),
  [ZoneId.Zone5]: templateAtDefault(ZoneId.Zone5),
};

function templateAtDefault(zoneId: ZoneIdType): MonsterZoneStatTemplate {
  const stats = resolveMonsterStats(zoneId, resolveMonsterZoneDefaultLevel(zoneId), false);
  return {
    maxHp: stats.maxHp,
    flowSpeedBase: stats.flowSpeedBase,
    classId: stats.classId,
    attack: stats.attack,
  };
}

/** @deprecated Use MONSTER_ELITE_HP_MULTIPLIER em monsterZoneScaling. */
export const ELITE_HP_MULTIPLIER = MONSTER_ELITE_HP_MULTIPLIER;

/**
 * Stats de zona — elite aplica multiplicadores do motor de scaling.
 * Sem `targetLevel`: usa meio da faixa da zona.
 */
export function resolveMonsterZoneStats(
  zoneId: ZoneIdType,
  opts: { readonly elite?: boolean; readonly targetLevel?: number } = {},
): MonsterZoneStatTemplate {
  const level = opts.targetLevel ?? resolveMonsterZoneDefaultLevel(zoneId);
  const stats = resolveMonsterStats(zoneId, level, Boolean(opts.elite));
  return {
    maxHp: stats.maxHp,
    flowSpeedBase: stats.flowSpeedBase,
    classId: stats.classId,
    attack: stats.attack,
  };
}

export function resolveZoneLevelCap(zoneId: ZoneIdType): number {
  return getMonsterZoneScalingConfig(zoneId).levelMax;
}
