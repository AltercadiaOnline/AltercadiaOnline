import type { ZoneId } from '../items/itemTypes.js';
import { ZoneId as ZoneIdConst } from '../items/itemTypes.js';
import type { DropChancesConfig } from './dropChances.js';
import {
  buildDefaultCreatureLootProfiles,
  mergeCreatureLootProfilePatch,
} from './creatureLootProfileDefaults.js';

/** Patch opcional por zona ou criatura — merge sobre DROP_CHANCES + arquétipo. */
export type CreatureLootProfilePatch = {
  readonly dropChances?: Partial<DropChancesConfig>;
  /** Chance 0–1 de substituir um slot pelo equipável exclusivo (1 roll por batalha). */
  readonly equipDropChance?: number;
  /** Pesos relativos por item genérico da criatura (default: peso do catálogo ou 1). */
  readonly itemWeights?: Readonly<Partial<Record<string, number>>>;
};

export const ZONE_LOOT_PROFILES: Partial<Record<ZoneId, CreatureLootProfilePatch>> = {
  [ZoneIdConst.Zone2]: {
    dropChances: {
      itemUncommonPercent: 11,
      itemRarePercent: 3.25,
      goldPercent: 63,
    },
  },
  [ZoneIdConst.Zone3]: {
    dropChances: {
      itemUncommonPercent: 12,
      itemRarePercent: 3.5,
      itemEpicPercent: 0.55,
      goldPercent: 62,
    },
  },
  [ZoneIdConst.Zone4]: {
    dropChances: {
      itemUncommonPercent: 13,
      itemRarePercent: 3.75,
      itemEpicPercent: 0.65,
      goldPercent: 61,
    },
  },
  [ZoneIdConst.Zone5]: {
    dropChances: {
      itemEpicPercent: 0.75,
      itemRarePercent: 4,
      goldPercent: 60,
    },
  },
};

/** Ajustes manuais finos — merge sobre perfis default gerados. */
const CREATURE_LOOT_MANUAL_OVERRIDES: Readonly<
  Partial<Record<string, CreatureLootProfilePatch>>
> = {
  crow: {
    itemWeights: {
      black_feather: 3,
      crow_eye: 1,
    },
  },
  cyclops: {
    dropChances: {
      itemEpicPercent: 1,
      itemRarePercent: 4,
    },
    equipDropChance: 0.045,
    itemWeights: {
      dimensional_rock: 2,
      fist_chunk: 3,
      soul_fragment: 1,
    },
  },
  hydra: {
    equipDropChance: 0.045,
    itemWeights: {
      hydra_tooth: 3,
      common_scale: 2,
      soul_fragment: 1,
    },
  },
  wraith: {
    itemWeights: {
      wraith_echo: 3,
      black_mist: 2,
      soul_fragment: 1,
    },
  },
  crocodile: {
    equipDropChance: 0.045,
    itemWeights: {
      colossal_tooth: 3,
      crocodile_scale: 2,
      soul_fragment: 1,
    },
  },
  chimera: {
    itemWeights: {
      chimera_tooth: 3,
      chimera_scale: 2,
      triple_claw: 2,
    },
  },
  minotaur: {
    itemWeights: {
      minotaur_horn: 3,
      soul_fragment: 1,
    },
  },
};

function buildMergedCreatureLootProfiles(): Readonly<
  Record<string, CreatureLootProfilePatch>
> {
  const defaults = buildDefaultCreatureLootProfiles();
  const merged: Record<string, CreatureLootProfilePatch> = { ...defaults };

  for (const [creatureId, override] of Object.entries(CREATURE_LOOT_MANUAL_OVERRIDES)) {
    merged[creatureId] = mergeCreatureLootProfilePatch(defaults[creatureId], override);
  }

  return merged;
}

/** Overrides por criatura — default automático + ajustes manuais. */
export const CREATURE_LOOT_PROFILES: Readonly<
  Partial<Record<string, CreatureLootProfilePatch>>
> = buildMergedCreatureLootProfiles();
