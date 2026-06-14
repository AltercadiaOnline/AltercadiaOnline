import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';
import type { CombatClassId } from '../types.js';

export type MonsterZoneStatTemplate = {
  readonly maxHp: number;
  readonly flowSpeedBase: number;
  readonly classId: CombatClassId;
};

/** Estatísticas base de combate por zona — escalonadas para PvE. */
export const MONSTER_ZONE_STAT_TEMPLATE: Record<ZoneIdType, MonsterZoneStatTemplate> = {
  [ZoneId.Zone1]: { maxHp: 70, flowSpeedBase: 30, classId: 'DISSOLUTUS' },
  [ZoneId.Zone2]: { maxHp: 120, flowSpeedBase: 28, classId: 'DISSOLUTUS' },
  [ZoneId.Zone3]: { maxHp: 200, flowSpeedBase: 26, classId: 'IMPETUS' },
  [ZoneId.Zone4]: { maxHp: 290, flowSpeedBase: 32, classId: 'IMPETUS' },
  [ZoneId.Zone5]: { maxHp: 380, flowSpeedBase: 24, classId: 'IMPETUS' },
};

const ELITE_HP_MULTIPLIER = 1.25;

export function resolveMonsterZoneStats(
  zoneId: ZoneIdType,
  opts: { readonly elite?: boolean } = {},
): MonsterZoneStatTemplate {
  const base = MONSTER_ZONE_STAT_TEMPLATE[zoneId];
  if (!opts.elite) return base;
  return {
    ...base,
    maxHp: Math.floor(base.maxHp * ELITE_HP_MULTIPLIER),
  };
}
