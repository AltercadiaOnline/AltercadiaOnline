import { ZoneId, type CreatureDropEntry } from './itemTypes.js';
import {
  CREATURE_ARCHETYPE_MAP,
  CreatureArchetypeId,
  type CreatureArchetypeId as CreatureArchetypeIdType,
} from '../loot/archetypeLootTables.js';

/** 25 criaturas — drops oficiais v1.0. Loot de batalha via `LootGenerator.generateBattleLoot`. */
export const CREATURE_DROP_TABLE: readonly CreatureDropEntry[] = [
  { creatureId: 'rat', creatureName: 'Rato', zoneId: ZoneId.Zone1, archetypeId: CreatureArchetypeId.UrbanScavenger, genericDropIds: ['bones', 'soul_fragment'], equipableItemId: null },
  { creatureId: 'crow', creatureName: 'Corvo', zoneId: ZoneId.Zone1, archetypeId: CreatureArchetypeId.UrbanScavenger, genericDropIds: ['black_feather', 'crow_eye'], equipableItemId: 'black_feather_pants' },
  { creatureId: 'wild_dog', creatureName: 'Cão Selvagem', zoneId: ZoneId.Zone1, archetypeId: CreatureArchetypeId.UrbanScavenger, genericDropIds: ['dog_fur', 'wild_claw'], equipableItemId: 'rawhide_boots' },
  { creatureId: 'bat', creatureName: 'Morcego', zoneId: ZoneId.Zone1, archetypeId: CreatureArchetypeId.UrbanScavenger, genericDropIds: ['bat_wing', 'bat_tooth'], equipableItemId: 'shadow_wing_cape' },
  { creatureId: 'spider', creatureName: 'Aranha', zoneId: ZoneId.Zone1, archetypeId: CreatureArchetypeId.UrbanScavenger, genericDropIds: ['spider_web', 'spider_venom'], equipableItemId: 'black_chitin_ring' },
  { creatureId: 'centipede', creatureName: 'Centopeia', zoneId: ZoneId.Zone2, archetypeId: CreatureArchetypeId.MetroAnomaly, genericDropIds: ['centipede_segment', 'articulated_jaw'], equipableItemId: 'hundred_feet_boots' },
  { creatureId: 'slime', creatureName: 'Slime', zoneId: ZoneId.Zone2, archetypeId: CreatureArchetypeId.MetroAnomaly, genericDropIds: ['conductive_slime', 'slime_core'], equipableItemId: 'electric_slime_ring' },
  { creatureId: 'humanoid', creatureName: 'Humanoide', zoneId: ZoneId.Zone2, archetypeId: CreatureArchetypeId.MetroAnomaly, genericDropIds: ['bones', 'soul_fragment'], equipableItemId: 'pulsing_rift_amulet' },
  { creatureId: 'golem', creatureName: 'Gólem', zoneId: ZoneId.Zone2, archetypeId: CreatureArchetypeId.MetroAnomaly, genericDropIds: ['soul_fragment', 'molten_beam'], equipableItemId: 'rail_armor' },
  { creatureId: 'specter', creatureName: 'Espectro', zoneId: ZoneId.Zone2, archetypeId: CreatureArchetypeId.MetroAnomaly, genericDropIds: ['soul_fragment', 'translucent_essence'], equipableItemId: 'spectral_mantle' },
  { creatureId: 'minotaur', creatureName: 'Minotauro', zoneId: ZoneId.Zone3, archetypeId: CreatureArchetypeId.ParkingPredator, genericDropIds: ['minotaur_horn', 'soul_fragment'], equipableItemId: 'steel_horn_helm' },
  { creatureId: 'metal_spider', creatureName: 'Aranha Metálica', zoneId: ZoneId.Zone3, archetypeId: CreatureArchetypeId.ParkingPredator, genericDropIds: ['steel_spider_leg', 'flash_eye'], equipableItemId: 'arachnid_steel_boots' },
  { creatureId: 'gargoyle', creatureName: 'Gargoyle', zoneId: ZoneId.Zone3, archetypeId: CreatureArchetypeId.ParkingPredator, genericDropIds: ['gargoyle_wing', 'soul_fragment'], equipableItemId: 'gargoyle_chest' },
  { creatureId: 'scorpion', creatureName: 'Escorpião', zoneId: ZoneId.Zone3, archetypeId: CreatureArchetypeId.ParkingPredator, genericDropIds: ['scorpion_stinger', 'scorpion_scale'], equipableItemId: 'carapace_pants' },
  { creatureId: 'lizard', creatureName: 'Lagarto', zoneId: ZoneId.Zone3, archetypeId: CreatureArchetypeId.ParkingPredator, genericDropIds: ['lizard_scale', 'paralyzing_tongue'], equipableItemId: 'spiked_crest_ring' },
  { creatureId: 'falcon', creatureName: 'Falcão', zoneId: ZoneId.Zone4, archetypeId: CreatureArchetypeId.RooftopHunter, genericDropIds: ['falcon_feather', 'sharp_claw', 'falcon_eye'], equipableItemId: 'falcon_helmet' },
  { creatureId: 'serpent', creatureName: 'Serpente', zoneId: ZoneId.Zone4, archetypeId: CreatureArchetypeId.RooftopHunter, genericDropIds: ['common_scale', 'serpent_tooth', 'soul_fragment'], equipableItemId: 'scale_pants' },
  { creatureId: 'chimera', creatureName: 'Quimera', zoneId: ZoneId.Zone4, archetypeId: CreatureArchetypeId.RooftopHunter, genericDropIds: ['chimera_scale', 'triple_claw', 'chimera_tooth'], equipableItemId: 'chimera_fragment_amulet' },
  { creatureId: 'wasp', creatureName: 'Vespa', zoneId: ZoneId.Zone4, archetypeId: CreatureArchetypeId.RooftopHunter, genericDropIds: ['cutting_wing', 'energy_stinger', 'soul_fragment'], equipableItemId: 'wasp_boots' },
  { creatureId: 'werewolf', creatureName: 'Lobisomem', zoneId: ZoneId.Zone4, archetypeId: CreatureArchetypeId.RooftopHunter, genericDropIds: ['werewolf_fur', 'torn_claw', 'soul_fragment'], equipableItemId: 'wolf_helmet' },
  { creatureId: 'crocodile', creatureName: 'Crocodilo', zoneId: ZoneId.Zone5, archetypeId: CreatureArchetypeId.DimensionalElite, genericDropIds: ['crocodile_scale', 'colossal_tooth', 'soul_fragment'], equipableItemId: 'croco_pants' },
  { creatureId: 'sewer_golem', creatureName: 'Gólem de Esgoto', zoneId: ZoneId.Zone5, archetypeId: CreatureArchetypeId.DimensionalElite, genericDropIds: ['solidified_mud', 'soul_fragment', 'fused_debris'], equipableItemId: 'debris_ring' },
  { creatureId: 'hydra', creatureName: 'Hidra', zoneId: ZoneId.Zone5, archetypeId: CreatureArchetypeId.DimensionalElite, genericDropIds: ['common_scale', 'hydra_tooth', 'soul_fragment'], equipableItemId: 'three_heads_necklace' },
  { creatureId: 'cyclops', creatureName: 'Ciclope', zoneId: ZoneId.Zone5, archetypeId: CreatureArchetypeId.DimensionalElite, genericDropIds: ['fist_chunk', 'dimensional_rock', 'soul_fragment'], equipableItemId: 'cyclops_eye' },
  { creatureId: 'wraith', creatureName: 'Wraith', zoneId: ZoneId.Zone5, archetypeId: CreatureArchetypeId.DimensionalElite, genericDropIds: ['black_mist', 'wraith_echo', 'soul_fragment'], equipableItemId: 'wraith_mantle' },
];

const creatureById = new Map(CREATURE_DROP_TABLE.map((entry) => [entry.creatureId, entry]));

export function getCreatureDropEntry(creatureId: string): CreatureDropEntry | undefined {
  return creatureById.get(creatureId);
}

export function getCreatureArchetypeId(creatureId: string): CreatureArchetypeIdType | undefined {
  return CREATURE_ARCHETYPE_MAP[creatureId];
}
