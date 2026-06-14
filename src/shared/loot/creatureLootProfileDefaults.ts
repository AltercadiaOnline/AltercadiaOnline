import { CREATURE_DROP_TABLE } from '../items/creatureDrops.js';
import type { ZoneId } from '../items/itemTypes.js';
import { ZoneId as ZoneIdConst } from '../items/itemTypes.js';
import type { DropChancesConfig } from './dropChances.js';
import type { CreatureLootProfilePatch } from './creatureLootProfiles.js';

/** Materiais compartilhados entre zonas — peso menor no pool da criatura. */
const SHARED_FILLER_ITEM_IDS = new Set([
  'soul_fragment',
  'common_scale',
]);

/** Progressão de raridade do cassino por zona (merge sobre DROP_CHANCES). Zonas omitidas usam DROP_CHANCES. */
export const ZONE_DROP_CHANCE_PROGRESSION: Readonly<
  Partial<Record<ZoneId, Partial<DropChancesConfig>>>
> = {
  [ZoneIdConst.Zone2]: {
    itemUncommonPercent: 11,
    itemRarePercent: 3.25,
    goldPercent: 63,
  },
  [ZoneIdConst.Zone3]: {
    itemUncommonPercent: 12,
    itemRarePercent: 3.5,
    itemEpicPercent: 0.55,
    goldPercent: 62,
  },
  [ZoneIdConst.Zone4]: {
    itemUncommonPercent: 13,
    itemRarePercent: 3.75,
    itemEpicPercent: 0.65,
    goldPercent: 61,
  },
};

/** Criaturas “assinatura” da zona — bump leve de equip e épico. */
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

/**
 * Pesos default: item signature da criatura pesa mais; fillers compartilhados pesam menos.
 */
export function buildDefaultItemWeights(
  genericDropIds: readonly string[],
): Readonly<Partial<Record<string, number>>> {
  const weights: Record<string, number> = {};
  let signatureId: string | null = null;

  for (const itemId of genericDropIds) {
    if (!SHARED_FILLER_ITEM_IDS.has(itemId) && signatureId === null) {
      signatureId = itemId;
    }
    weights[itemId] = SHARED_FILLER_ITEM_IDS.has(itemId) ? 1 : 2;
  }

  if (signatureId) {
    weights[signatureId] = 3;
  }

  return weights;
}

function buildDefaultProfileForCreature(
  creatureId: string,
  zoneId: ZoneId,
  genericDropIds: readonly string[],
): CreatureLootProfilePatch {
  const profile: {
    itemWeights: Readonly<Partial<Record<string, number>>>;
    equipDropChance?: number;
    dropChances?: Partial<DropChancesConfig>;
  } = {
    itemWeights: buildDefaultItemWeights(genericDropIds),
  };

  if (ELITE_CREATURE_IDS.has(creatureId)) {
    profile.equipDropChance = zoneId === ZoneIdConst.Zone5 ? 0.045 : 0.04;
    if (zoneId === ZoneIdConst.Zone5) {
      profile.dropChances = {
        itemEpicPercent: 0.85,
        itemRarePercent: 4.25,
      };
    } else if (zoneId === ZoneIdConst.Zone4) {
      profile.dropChances = {
        itemEpicPercent: 0.7,
        itemRarePercent: 4,
      };
    }
  }

  return profile;
}

/** Perfis base gerados a partir de CREATURE_DROP_TABLE (25 criaturas). */
export function buildDefaultCreatureLootProfiles(): Readonly<
  Record<string, CreatureLootProfilePatch>
> {
  const profiles: Record<string, CreatureLootProfilePatch> = {};

  for (const entry of CREATURE_DROP_TABLE) {
    profiles[entry.creatureId] = buildDefaultProfileForCreature(
      entry.creatureId,
      entry.zoneId,
      entry.genericDropIds,
    );
  }

  return profiles;
}

export function mergeCreatureLootProfilePatch(
  base: CreatureLootProfilePatch | undefined,
  override: CreatureLootProfilePatch | undefined,
): CreatureLootProfilePatch {
  if (!base) return override ?? {};
  if (!override) return base;

  let merged: CreatureLootProfilePatch = {
    itemWeights: {
      ...base.itemWeights,
      ...override.itemWeights,
    },
  };

  const equipDropChance = override.equipDropChance ?? base.equipDropChance;
  if (equipDropChance !== undefined) {
    merged = { ...merged, equipDropChance };
  }

  if (base.dropChances || override.dropChances) {
    merged = {
      ...merged,
      dropChances: { ...base.dropChances, ...override.dropChances },
    };
  }

  return merged;
}
