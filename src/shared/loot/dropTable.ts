import { getCreatureDropEntry } from '../items/creatureDrops.js';
import type { ZoneId } from '../items/itemTypes.js';
import { ZoneId as ZoneIdConst } from '../items/itemTypes.js';
import { resolveCreatureArchetype } from './archetypeLootTables.js';

export type DropTableEntry = {
  readonly sourceId: string;
  readonly sourceKind: 'creature' | 'duel';
  readonly zoneId?: ZoneId;
  readonly archetypeId?: string;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly genericDropIds: readonly string[];
  readonly equipableItemId: string | null;
  readonly genericDropChance: number;
  readonly equipDropChance: number;
};

export const EQUIP_DROP_RATE_DEFAULT = 0.03;
export const GENERIC_DROP_CHANCE_DEFAULT = 0.35;

export const DOLLAR_VOLT_BY_ZONE: Record<ZoneId, { min: number; max: number }> = {
  [ZoneIdConst.Zone1]: { min: 5, max: 15 },
  [ZoneIdConst.Zone2]: { min: 12, max: 28 },
  [ZoneIdConst.Zone3]: { min: 22, max: 45 },
  [ZoneIdConst.Zone4]: { min: 40, max: 75 },
  [ZoneIdConst.Zone5]: { min: 65, max: 120 },
};

/** Volts em duelos PvP — faixa por nível do derrotado. */
export function resolveDuelVoltRange(defeatedLevel: number): { min: number; max: number } {
  const tier = Math.max(1, Math.floor(defeatedLevel));
  const min = 8 + tier * 2;
  const max = 18 + tier * 4;
  return { min, max };
}

function creatureDropTableEntry(creatureId: string): DropTableEntry | null {
  const entry = getCreatureDropEntry(creatureId);
  if (!entry) return null;

  const archetype = resolveCreatureArchetype(creatureId);

  return {
    sourceId: creatureId,
    sourceKind: 'creature',
    zoneId: entry.zoneId,
    archetypeId: entry.archetypeId,
    levelMin: 1,
    levelMax: 99,
    genericDropIds: entry.genericDropIds,
    equipableItemId: entry.equipableItemId,
    genericDropChance: archetype?.genericDropChance ?? GENERIC_DROP_CHANCE_DEFAULT,
    equipDropChance: archetype?.equipDropChance ?? EQUIP_DROP_RATE_DEFAULT,
  };
}

function duelDropTableEntry(defeatedLevel: number): DropTableEntry {
  const level = Math.max(1, Math.floor(defeatedLevel));
  return {
    sourceId: `duel_level_${level}`,
    sourceKind: 'duel',
    levelMin: level,
    levelMax: level,
    genericDropIds: ['soul_fragment'],
    equipableItemId: null,
    genericDropChance: 0.2,
    equipDropChance: 0,
  };
}

/** Resolve tabela de drop por sourceID (criatura ou duelo/nível). */
export function resolveDropTable(sourceId: string, defeatedLevel = 1): DropTableEntry | null {
  const creature = creatureDropTableEntry(sourceId);
  if (creature) return creature;

  if (sourceId.startsWith('duel_') || sourceId.startsWith('player_')) {
    return duelDropTableEntry(defeatedLevel);
  }

  return null;
}

export function resolveVoltRangeForDropTable(table: DropTableEntry, defeatedLevel: number): { min: number; max: number } {
  if (table.sourceKind === 'duel') {
    return resolveDuelVoltRange(defeatedLevel);
  }
  if (table.zoneId) {
    return DOLLAR_VOLT_BY_ZONE[table.zoneId];
  }
  return DOLLAR_VOLT_BY_ZONE[ZoneIdConst.Zone1];
}

const VOLT_LEVEL_SCALE_PER_TIER = 0.08;

/** Escala Volts pelo nível do derrotado (+8% por nível acima de 1). */
export function resolveScaledVoltRange(
  table: DropTableEntry,
  defeatedLevel: number,
): { min: number; max: number } {
  const base = resolveVoltRangeForDropTable(table, defeatedLevel);
  const level = Math.max(1, Math.floor(defeatedLevel));
  const scale = 1 + (level - 1) * VOLT_LEVEL_SCALE_PER_TIER;
  return {
    min: Math.max(0, Math.floor(base.min * scale)),
    max: Math.max(0, Math.floor(base.max * scale)),
  };
}
