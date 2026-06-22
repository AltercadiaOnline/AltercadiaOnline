import { ItemCategory } from './itemSchema.js';
import type {
  ItemCoreDefinition,
  ItemDefinition,
  ItemExtendedDetails,
  ItemMechanicalDefinition,
} from './itemSchema.js';

const EMPTY_EXTENDED: ItemExtendedDetails = { effects: [] };

const DEFAULT_MECHANICAL: ItemMechanicalDefinition = {
  category: ItemCategory.Generic,
  weight: 0,
};

export function mergeItemDefinitionParts(
  core: ItemCoreDefinition,
  mechanical?: ItemMechanicalDefinition,
  extended?: ItemExtendedDetails,
): ItemDefinition {
  const extra = extended ?? EMPTY_EXTENDED;
  const mech = mechanical ?? DEFAULT_MECHANICAL;

  return {
    ...core,
    ...mech,
    ...extra,
    effects: extra.effects ?? EMPTY_EXTENDED.effects,
  };
}

export function mergeItemDefinitionById(
  itemId: string,
  lookup: {
    readonly core: ItemCoreDefinition | undefined;
    readonly mechanical: ItemMechanicalDefinition | undefined;
    readonly extended: ItemExtendedDetails | undefined;
  },
): ItemDefinition | undefined {
  if (!lookup.core) return undefined;
  return mergeItemDefinitionParts(lookup.core, lookup.mechanical, lookup.extended);
}
