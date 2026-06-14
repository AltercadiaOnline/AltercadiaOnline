import type { CombatClassId } from '../types.js';
import { CREATURE_DROP_TABLE, getCreatureDropEntry } from '../items/creatureDrops.js';
import { MonsterBehaviorType } from './monsterBehaviorTypes.js';
import type { MonsterBehaviorType as MonsterBehaviorTypeId } from './monsterBehaviorTypes.js';
import { resolveMonsterZoneStats } from './monsterZoneStats.js';
import { CreatureArchetypeId, CREATURE_ARCHETYPE_MAP } from '../loot/archetypeLootTables.js';

export { MonsterBehaviorType };
export type { MonsterBehaviorTypeId };

export const MonsterSpecialAbilityId = {
  PhaseShift: 'PHASE_SHIFT',
  ChargeGore: 'CHARGE_GORE',
} as const;

export type MonsterSpecialAbilityId = (typeof MonsterSpecialAbilityId)[keyof typeof MonsterSpecialAbilityId];

export type MonsterSpecialAbility = {
  readonly id: MonsterSpecialAbilityId;
  readonly description?: string;
};

export type MonsterPatrolZone = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

/** Entrada do catálogo — criaturas combatíveis com behavior e skills. */
export type MonsterCatalogEntry = {
  readonly creatureId: string;
  readonly name: string;
  readonly behavior: MonsterBehaviorTypeId;
  readonly maxHp: number;
  readonly flowSpeedBase: number;
  readonly classId: CombatClassId;
  /** IDs de skills/moves usados pela IA. */
  readonly skillIds: readonly string[];
  readonly specialAbility?: MonsterSpecialAbility;
  /** Área de patrulha para behavior PATROL. */
  readonly patrolZone?: MonsterPatrolZone;
};

const ELITE_CREATURE_IDS = new Set([
  'minotaur',
  'gargoyle',
  'chimera',
  'werewolf',
  'hydra',
  'cyclops',
  'wraith',
  'crocodile',
]);

/** Criaturas elite tratadas como “boss” no diário do jogador. */
export function isBossCreatureId(creatureId: string): boolean {
  return ELITE_CREATURE_IDS.has(creatureId);
}

const HANDCRAFTED_ENTRIES: Record<string, MonsterCatalogEntry> = {
  rat: {
    creatureId: 'rat',
    name: 'Rato Dimensional',
    behavior: MonsterBehaviorType.Aggressive,
    maxHp: 70,
    flowSpeedBase: 28,
    classId: 'DISSOLUTUS',
    skillIds: ['rat_bite'],
  },
  specter: {
    creatureId: 'specter',
    name: 'Espectro',
    behavior: MonsterBehaviorType.Trap,
    maxHp: 120,
    flowSpeedBase: 32,
    classId: 'DISSOLUTUS',
    skillIds: ['specter_wail', 'specter_phase'],
    specialAbility: {
      id: MonsterSpecialAbilityId.PhaseShift,
      description: 'Turnos ímpares: imune a dano físico.',
    },
  },
  minotaur: {
    creatureId: 'minotaur',
    name: 'Minotauro',
    behavior: MonsterBehaviorType.Aggressive,
    maxHp: 220,
    flowSpeedBase: 24,
    classId: 'IMPETUS',
    skillIds: ['minotaur_charge', 'minotaur_gore'],
    specialAbility: {
      id: MonsterSpecialAbilityId.ChargeGore,
      description: 'Acumula carga por 3 turnos e desfere investida.',
    },
  },
  wild_dog: {
    creatureId: 'wild_dog',
    name: 'Cão Selvagem',
    behavior: MonsterBehaviorType.Patrol,
    maxHp: 90,
    flowSpeedBase: 30,
    classId: 'IMPETUS',
    skillIds: ['wild_dog_bite'],
    patrolZone: { minX: 3, maxX: 7, minY: 1, maxY: 4 },
  },
  crow: {
    creatureId: 'crow',
    name: 'Corvo',
    behavior: MonsterBehaviorType.Aggressive,
    maxHp: 65,
    flowSpeedBase: 34,
    classId: 'DISSOLUTUS',
    skillIds: ['crow_peck'],
  },
  bat: {
    creatureId: 'bat',
    name: 'Morcego',
    behavior: MonsterBehaviorType.Trap,
    maxHp: 55,
    flowSpeedBase: 36,
    classId: 'DISSOLUTUS',
    skillIds: ['bat_screech'],
  },
  spider: {
    creatureId: 'spider',
    name: 'Aranha',
    behavior: MonsterBehaviorType.Aggressive,
    maxHp: 75,
    flowSpeedBase: 26,
    classId: 'DISSOLUTUS',
    skillIds: ['spider_bite'],
  },
};

function resolveDefaultBehavior(creatureId: string): MonsterBehaviorTypeId {
  const archetype = CREATURE_ARCHETYPE_MAP[creatureId];
  if (archetype === CreatureArchetypeId.UrbanScavenger) return MonsterBehaviorType.Aggressive;
  if (archetype === CreatureArchetypeId.MetroAnomaly) return MonsterBehaviorType.Trap;
  if (archetype === CreatureArchetypeId.ParkingPredator) return MonsterBehaviorType.Aggressive;
  if (archetype === CreatureArchetypeId.RooftopHunter) return MonsterBehaviorType.Patrol;
  return MonsterBehaviorType.Aggressive;
}

function buildCatalogEntryFromDrop(creatureId: string): MonsterCatalogEntry | null {
  const drop = getCreatureDropEntry(creatureId);
  if (!drop) return null;

  const stats = resolveMonsterZoneStats(drop.zoneId, {
    elite: ELITE_CREATURE_IDS.has(creatureId),
  });

  return {
    creatureId,
    name: drop.creatureName,
    behavior: resolveDefaultBehavior(creatureId),
    maxHp: stats.maxHp,
    flowSpeedBase: stats.flowSpeedBase,
    classId: stats.classId,
    skillIds: ['rat_bite'],
  };
}

function hydrateMonsterCatalog(): Record<string, MonsterCatalogEntry> {
  const catalog: Record<string, MonsterCatalogEntry> = { ...HANDCRAFTED_ENTRIES };

  for (const entry of CREATURE_DROP_TABLE) {
    if (catalog[entry.creatureId]) continue;
    const generated = buildCatalogEntryFromDrop(entry.creatureId);
    if (generated) catalog[entry.creatureId] = generated;
  }

  return catalog;
}

const MONSTER_CATALOG = hydrateMonsterCatalog();

/**
 * Mapeia actorId de combate → creatureId.
 * Preferência: `enemy_{creatureId}` dinâmico (25 criaturas); entradas legadas abaixo.
 */
export const COMBAT_ACTOR_TO_CREATURE: Readonly<Record<string, string>> = Object.fromEntries(
  Object.keys(MONSTER_CATALOG).map((creatureId) => [`enemy_${creatureId}`, creatureId]),
);

export function getMonsterByCreatureId(creatureId: string): MonsterCatalogEntry | null {
  return MONSTER_CATALOG[creatureId] ?? null;
}

export function getMonsterByActorId(actorId: string): MonsterCatalogEntry | null {
  const creatureId = resolveCreatureIdFromActorId(actorId);
  if (!creatureId) return null;
  return getMonsterByCreatureId(creatureId);
}

/** Resolve creatureId a partir do actorId (`enemy_slime` → `slime`). */
export function resolveCreatureIdFromActorId(actorId: string): string | null {
  const mapped = COMBAT_ACTOR_TO_CREATURE[actorId];
  if (mapped) return mapped;

  const prefix = 'enemy_';
  if (!actorId.startsWith(prefix)) return null;

  const creatureId = actorId.slice(prefix.length);
  if (getCreatureDropEntry(creatureId) || MONSTER_CATALOG[creatureId]) {
    return creatureId;
  }
  return null;
}

export function listMonsterCatalog(): readonly MonsterCatalogEntry[] {
  return Object.values(MONSTER_CATALOG);
}

/** Alias exportado — catálogo central de criaturas de combate. */
export const MonsterCatalog = MONSTER_CATALOG;
