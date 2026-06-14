import { ZoneId, type ZoneId as ZoneIdType } from '../items/itemTypes.js';

/** Arquétipos de criatura — agrupam tabelas de loot por bioma/comportamento. */
export const CreatureArchetypeId = {
  UrbanScavenger: 'URBAN_SCAVENGER',
  MetroAnomaly: 'METRO_ANOMALY',
  ParkingPredator: 'PARKING_PREDATOR',
  RooftopHunter: 'ROOFTOP_HUNTER',
  DimensionalElite: 'DIMENSIONAL_ELITE',
} as const;

export type CreatureArchetypeId =
  (typeof CreatureArchetypeId)[keyof typeof CreatureArchetypeId];

export type ArchetypeLootTable = {
  readonly archetypeId: CreatureArchetypeId;
  readonly label: string;
  readonly zoneId: ZoneIdType;
  /** Pool compartilhado de drops genéricos do arquétipo. */
  readonly sharedGenericDropIds: readonly string[];
  readonly genericDropChance: number;
  readonly equipDropChance: number;
};

export const ARCHETYPE_LOOT_TABLES: readonly ArchetypeLootTable[] = [
  {
    archetypeId: CreatureArchetypeId.UrbanScavenger,
    label: 'Catador Urbano',
    zoneId: ZoneId.Zone1,
    sharedGenericDropIds: ['bones', 'soul_fragment'],
    genericDropChance: 0.35,
    equipDropChance: 0.03,
  },
  {
    archetypeId: CreatureArchetypeId.MetroAnomaly,
    label: 'Anomalia do Metrô',
    zoneId: ZoneId.Zone2,
    sharedGenericDropIds: ['soul_fragment', 'translucent_essence'],
    genericDropChance: 0.35,
    equipDropChance: 0.03,
  },
  {
    archetypeId: CreatureArchetypeId.ParkingPredator,
    label: 'Predador do Estacionamento',
    zoneId: ZoneId.Zone3,
    sharedGenericDropIds: ['soul_fragment', 'common_scale'],
    genericDropChance: 0.38,
    equipDropChance: 0.035,
  },
  {
    archetypeId: CreatureArchetypeId.RooftopHunter,
    label: 'Caçador de Telhados',
    zoneId: ZoneId.Zone4,
    sharedGenericDropIds: ['soul_fragment', 'common_scale', 'sharp_claw'],
    genericDropChance: 0.4,
    equipDropChance: 0.04,
  },
  {
    archetypeId: CreatureArchetypeId.DimensionalElite,
    label: 'Elite Dimensional',
    zoneId: ZoneId.Zone5,
    sharedGenericDropIds: ['soul_fragment', 'dimensional_rock', 'wraith_echo'],
    genericDropChance: 0.42,
    equipDropChance: 0.045,
  },
];

const archetypeById = new Map(ARCHETYPE_LOOT_TABLES.map((table) => [table.archetypeId, table]));

/** Vínculo criatura → arquétipo (25 criaturas oficiais). */
export const CREATURE_ARCHETYPE_MAP: Record<string, CreatureArchetypeId> = {
  rat: CreatureArchetypeId.UrbanScavenger,
  crow: CreatureArchetypeId.UrbanScavenger,
  wild_dog: CreatureArchetypeId.UrbanScavenger,
  bat: CreatureArchetypeId.UrbanScavenger,
  spider: CreatureArchetypeId.UrbanScavenger,
  centipede: CreatureArchetypeId.MetroAnomaly,
  slime: CreatureArchetypeId.MetroAnomaly,
  humanoid: CreatureArchetypeId.MetroAnomaly,
  golem: CreatureArchetypeId.MetroAnomaly,
  specter: CreatureArchetypeId.MetroAnomaly,
  minotaur: CreatureArchetypeId.ParkingPredator,
  metal_spider: CreatureArchetypeId.ParkingPredator,
  gargoyle: CreatureArchetypeId.ParkingPredator,
  scorpion: CreatureArchetypeId.ParkingPredator,
  lizard: CreatureArchetypeId.ParkingPredator,
  falcon: CreatureArchetypeId.RooftopHunter,
  serpent: CreatureArchetypeId.RooftopHunter,
  chimera: CreatureArchetypeId.RooftopHunter,
  wasp: CreatureArchetypeId.RooftopHunter,
  werewolf: CreatureArchetypeId.RooftopHunter,
  crocodile: CreatureArchetypeId.DimensionalElite,
  sewer_golem: CreatureArchetypeId.DimensionalElite,
  hydra: CreatureArchetypeId.DimensionalElite,
  cyclops: CreatureArchetypeId.DimensionalElite,
  wraith: CreatureArchetypeId.DimensionalElite,
};

export function getArchetypeLootTable(archetypeId: CreatureArchetypeId): ArchetypeLootTable | undefined {
  return archetypeById.get(archetypeId);
}

export function resolveCreatureArchetype(creatureId: string): ArchetypeLootTable | null {
  const archetypeId = CREATURE_ARCHETYPE_MAP[creatureId];
  if (!archetypeId) return null;
  return getArchetypeLootTable(archetypeId) ?? null;
}
