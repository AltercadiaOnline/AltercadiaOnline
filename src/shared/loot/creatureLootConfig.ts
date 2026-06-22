import { getCreatureDropEntry } from '../items/creatureDrops.js';
import { getItemMechanicalById } from '../items/itemCatalog.js';
import type { ZoneId } from '../items/itemTypes.js';
import { resolveCreatureArchetype } from './archetypeLootTables.js';
import {
  applyLootBonusToDropChances,
  DROP_CHANCES,
  mergeDropChances,
  type DropChancesConfig,
} from './dropChances.js';
import {
  CREATURE_LOOT_PROFILES,
  ZONE_LOOT_PROFILES,
  type CreatureLootProfilePatch,
} from './creatureLootProfiles.js';
import {
  EQUIP_DROP_RATE_DEFAULT,
  resolveDropTable,
  resolveScaledVoltRange,
} from './dropTable.js';
import { resolveItemLootRarity } from './lootRarity.js';
import type { LootRarityId } from './lootTypes.js';

export type CreatureGenericDropCandidate = {
  readonly itemId: string;
  readonly weight: number;
  readonly rarity: LootRarityId;
};

/** Config autoritativa resolvida para uma criatura — entrada única do LootGenerator. */
export type ResolvedCreatureLootConfig = {
  readonly creatureId: string;
  readonly zoneId: ZoneId;
  readonly dropChances: DropChancesConfig;
  readonly equipDropChance: number;
  readonly genericItems: readonly CreatureGenericDropCandidate[];
  readonly equipableItemId: string | null;
  readonly voltRange: { readonly min: number; readonly max: number };
};

function mergeProfilePatches(
  ...patches: readonly (CreatureLootProfilePatch | undefined)[]
): CreatureLootProfilePatch {
  const merged: {
    dropChances?: Partial<DropChancesConfig>;
    equipDropChance?: number;
    itemWeights?: Partial<Record<string, number>>;
  } = {};

  for (const patch of patches) {
    if (!patch) continue;
    if (patch.dropChances) {
      merged.dropChances = mergeDropChances(
        { ...DROP_CHANCES, ...merged.dropChances },
        patch.dropChances,
      );
    }
    if (patch.equipDropChance !== undefined) {
      merged.equipDropChance = patch.equipDropChance;
    }
    if (patch.itemWeights) {
      merged.itemWeights = { ...merged.itemWeights, ...patch.itemWeights };
    }
  }

  return merged;
}

function resolveItemWeight(
  creatureId: string,
  itemId: string,
  profile: CreatureLootProfilePatch,
): number {
  const override = profile.itemWeights?.[itemId];
  if (override !== undefined && override > 0) return override;

  const catalogWeight = getItemMechanicalById(itemId)?.weight;
  if (typeof catalogWeight === 'number' && catalogWeight > 0) return catalogWeight;

  return 1;
}

function buildGenericCandidates(
  creatureId: string,
  genericDropIds: readonly string[],
  profile: CreatureLootProfilePatch,
): CreatureGenericDropCandidate[] {
  return genericDropIds.map((itemId) => ({
    itemId,
    weight: resolveItemWeight(creatureId, itemId, profile),
    rarity: resolveItemLootRarity(itemId),
  }));
}

/**
 * Resolve perfil completo: faixas do cassino, pesos de material, equipável e faixa de Volts.
 * @returns null se a criatura não existir no catálogo de drops.
 */
export function resolveCreatureLootConfig(
  creatureId: string,
  defeatedLevel = 1,
  lootBonusMultiplier = 1,
): ResolvedCreatureLootConfig | null {
  const entry = getCreatureDropEntry(creatureId);
  if (!entry) return null;

  const table = resolveDropTable(creatureId, defeatedLevel);
  if (!table) return null;

  const archetype = resolveCreatureArchetype(creatureId);
  const zoneProfile = ZONE_LOOT_PROFILES[entry.zoneId];
  const creatureProfile = CREATURE_LOOT_PROFILES[creatureId];
  const profile = mergeProfilePatches(zoneProfile, creatureProfile);

  const baseChances = mergeDropChances(DROP_CHANCES, profile.dropChances);
  const dropChances = applyLootBonusToDropChances(baseChances, lootBonusMultiplier);

  const baseEquipChance = profile.equipDropChance
    ?? archetype?.equipDropChance
    ?? table.equipDropChance
    ?? EQUIP_DROP_RATE_DEFAULT;

  const equipDropChance = Math.min(
    1,
    baseEquipChance * Math.max(1, lootBonusMultiplier),
  );

  return {
    creatureId,
    zoneId: entry.zoneId,
    dropChances,
    equipDropChance,
    genericItems: buildGenericCandidates(creatureId, entry.genericDropIds, profile),
    equipableItemId: entry.equipableItemId,
    voltRange: resolveScaledVoltRange(table, defeatedLevel),
  };
}

/** Chances do cassino para a criatura (zona + perfil). */
export function resolveDropChances(sourceId: string): DropChancesConfig {
  return resolveCreatureLootConfig(sourceId, 1, 1)?.dropChances ?? { ...DROP_CHANCES };
}
