import {
  ItemCategory,
  ItemEffectValueType,
  type ItemDefinition as CatalogItemDefinition,
} from './itemSchema.js';
import { CHARGED_EQUIPMENT_MAX_CHARGES } from './chargedEquipmentConstants.js';
import {
  BookActiveEffectType,
  ConsumableEffectType,
  ConsumableUsage,
  EquipmentSlot,
  ItemBuffType,
  ItemKind,
  RuneCombatEffectType,
  RuneTrigger,
  type BookDefinition,
  type ConsumableDefinition,
  type ConsumableEffect,
  type EquipableItemDefinition,
  type GenericItemDefinition,
  type ItemBuffModifier,
  type ItemDefinition as LegacyItemDefinition,
  type RuneDefinition,
  type RuneTriggerId,
  ZoneId,
} from './itemTypes.js';

const CURRENCY_IDS = new Set(['dollar_volt', 'alter_coin']);

const STAT_TO_BUFF: Record<string, ItemBuffModifier['type']> = {
  DEF: ItemBuffType.Defense,
  DODGE: ItemBuffType.Dodge,
  HP: ItemBuffType.Hp,
  AGI: ItemBuffType.Agility,
  CRIT: ItemBuffType.Critical,
  STR: ItemBuffType.Strength,
};

const SLOT_CODE_TO_EQUIPMENT: Record<string, EquipableItemDefinition['slot']> = {
  H: EquipmentSlot.Head,
  A: EquipmentSlot.Top,
  P: EquipmentSlot.Bottom,
  B: EquipmentSlot.Bottom,
  R2: EquipmentSlot.Ring,
  M: EquipmentSlot.Amulet,
};

const CREATURE_BY_EQUIP_ID: Record<string, { creatureId: string; zoneId: ZoneId }> = {
  black_feather_pants: { creatureId: 'crow', zoneId: ZoneId.Zone1 },
  rawhide_boots: { creatureId: 'wild_dog', zoneId: ZoneId.Zone1 },
  shadow_wing_cape: { creatureId: 'bat', zoneId: ZoneId.Zone1 },
  black_chitin_ring: { creatureId: 'spider', zoneId: ZoneId.Zone1 },
  hundred_feet_boots: { creatureId: 'centipede', zoneId: ZoneId.Zone2 },
  electric_slime_ring: { creatureId: 'slime', zoneId: ZoneId.Zone2 },
  pulsing_rift_amulet: { creatureId: 'humanoid', zoneId: ZoneId.Zone2 },
  rail_armor: { creatureId: 'golem', zoneId: ZoneId.Zone2 },
  spectral_mantle: { creatureId: 'specter', zoneId: ZoneId.Zone2 },
  steel_horn_helm: { creatureId: 'minotaur', zoneId: ZoneId.Zone3 },
  arachnid_steel_boots: { creatureId: 'metal_spider', zoneId: ZoneId.Zone3 },
  gargoyle_chest: { creatureId: 'gargoyle', zoneId: ZoneId.Zone3 },
  carapace_pants: { creatureId: 'scorpion', zoneId: ZoneId.Zone3 },
  spiked_crest_ring: { creatureId: 'lizard', zoneId: ZoneId.Zone3 },
  falcon_helmet: { creatureId: 'falcon', zoneId: ZoneId.Zone4 },
  scale_pants: { creatureId: 'serpent', zoneId: ZoneId.Zone4 },
  chimera_fragment_amulet: { creatureId: 'chimera', zoneId: ZoneId.Zone4 },
  wasp_boots: { creatureId: 'wasp', zoneId: ZoneId.Zone4 },
  wolf_helmet: { creatureId: 'werewolf', zoneId: ZoneId.Zone4 },
  croco_pants: { creatureId: 'crocodile', zoneId: ZoneId.Zone5 },
  debris_ring: { creatureId: 'sewer_golem', zoneId: ZoneId.Zone5 },
  three_heads_necklace: { creatureId: 'hydra', zoneId: ZoneId.Zone5 },
  cyclops_eye: { creatureId: 'cyclops', zoneId: ZoneId.Zone5 },
  wraith_mantle: { creatureId: 'wraith', zoneId: ZoneId.Zone5 },
};

function passiveEffects(item: CatalogItemDefinition): CatalogItemDefinition['effects'] {
  if (item.category !== ItemCategory.Rune) return item.effects;
  return item.effects.filter((effect) => !effect.combatOnly);
}

function combatEffects(item: CatalogItemDefinition): CatalogItemDefinition['effects'] {
  if (item.category !== ItemCategory.Rune) return [];
  const flagged = item.effects.filter((effect) => effect.combatOnly);
  if (flagged.length > 0) return flagged;
  return item.effects.filter((effect) => {
    if (effect.stat === 'REFLECT') return true;
    if (effect.stat === 'CRIT' && item.combatTrigger === 'IMPACT') return true;
    if (effect.stat === 'AGI' && item.combatTrigger === 'BLOCK' && effect.type === ItemEffectValueType.Flat) {
      return true;
    }
    return false;
  });
}

function toBuffModifiers(effects: CatalogItemDefinition['effects']): ItemBuffModifier[] {
  return effects
    .filter((effect) => effect.type === ItemEffectValueType.Percent && STAT_TO_BUFF[effect.stat])
    .map((effect) => ({
      type: STAT_TO_BUFF[effect.stat]!,
      percent: effect.value,
    }));
}

function toLegacyGeneric(item: CatalogItemDefinition): GenericItemDefinition {
  const isCurrency = CURRENCY_IDS.has(item.id) || item.category === ItemCategory.Currency;
  return {
    id: item.id,
    name: item.name,
    kind: isCurrency ? ItemKind.Currency : ItemKind.Generic,
    sellable: true,
    description: item.description ?? item.name,
    weight: item.weight,
  };
}

function toLegacyEquipable(item: CatalogItemDefinition): EquipableItemDefinition {
  const slot = SLOT_CODE_TO_EQUIPMENT[item.slot ?? 'P'] ?? EquipmentSlot.Bottom;
  const meta = CREATURE_BY_EQUIP_ID[item.id] ?? { creatureId: 'unknown', zoneId: ZoneId.Zone1 };
  return {
    id: item.id,
    name: item.name,
    kind: ItemKind.Equipable,
    slot,
    buffs: toBuffModifiers(item.effects),
    sourceCreatureId: meta.creatureId,
    zoneId: meta.zoneId,
    description: item.description ?? `Drop exclusivo de ${meta.creatureId}.`,
    weight: item.weight,
  };
}

function toLegacyConsumable(item: CatalogItemDefinition): ConsumableDefinition {
  const effects: ConsumableEffect[] = [];

  for (const effect of item.effects) {
    if (effect.stat === 'HP' && effect.type === ItemEffectValueType.Percent) {
      effects.push({
        type: ConsumableEffectType.HealHp,
        value: effect.value / 100,
        target: 'self',
      });
      continue;
    }
    if (effect.stat === 'PP' && effect.type === ItemEffectValueType.Flat) {
      effects.push({
        type: ConsumableEffectType.RestorePp,
        value: effect.value,
        target: 'self',
        skillScope: 'all',
      });
      continue;
    }
    if (effect.stat === 'AGI' && effect.type === ItemEffectValueType.Flat) {
      effects.push({
        type: ConsumableEffectType.BuffStat,
        value: effect.value,
        target: 'self',
        buffType: ItemBuffType.Agility,
        durationTurns: 2,
      });
    }
  }

  return {
    id: item.id,
    name: item.name,
    kind: ItemKind.Consumable,
    stackable: true,
    maxStack: item.maxStack ?? 20,
    usage: ConsumableUsage.InCombat,
    ...(item.requiresLevel !== undefined ? { minLevel: item.requiresLevel } : {}),
    effects,
    description: item.description ?? item.name,
    weight: item.weight,
  };
}

const TRIGGER_TO_RUNE: Record<'IMPACT' | 'BLOCK' | 'DASH', RuneTriggerId> = {
  IMPACT: RuneTrigger.Impact,
  BLOCK: RuneTrigger.Block,
  DASH: RuneTrigger.Dash,
};

function resolveRuneCombatEffect(
  item: CatalogItemDefinition,
): RuneDefinition['combatEffect'] {
  const trigger = item.combatTrigger ?? 'IMPACT';
  const runeTrigger = TRIGGER_TO_RUNE[trigger];

  const combatEffect = combatEffects(item)[0];

  if (!combatEffect) {
    return { type: RuneCombatEffectType.CritBonus, value: 0, trigger: runeTrigger };
  }

  if (combatEffect.stat === 'REFLECT') {
    return {
      type: RuneCombatEffectType.ReflectDmg,
      value: combatEffect.value / 100,
      trigger: runeTrigger,
    };
  }
  if (combatEffect.stat === 'AGI') {
    return {
      type: RuneCombatEffectType.SpeedNextTurn,
      value: combatEffect.value,
      trigger: runeTrigger,
    };
  }
  return {
    type: RuneCombatEffectType.CritBonus,
    value: combatEffect.value / 100,
    trigger: runeTrigger,
  };
}

function toLegacyRune(item: CatalogItemDefinition): RuneDefinition {
  const passives = toBuffModifiers(passiveEffects(item));
  return {
    id: item.id,
    name: item.name,
    kind: ItemKind.Rune,
    slot: EquipmentSlot.Rune,
    maxDurabilityCharges: item.charges ?? CHARGED_EQUIPMENT_MAX_CHARGES,
    combatProcsPerBattle: item.combatProcsPerBattle ?? 5,
    combatEffect: resolveRuneCombatEffect(item),
    ...(passives.length > 0 ? { passiveBuffs: passives } : {}),
    description: item.description ?? item.name,
    weight: item.weight,
  };
}

function toLegacyBook(item: CatalogItemDefinition): BookDefinition {
  const passives = toBuffModifiers(item.effects.filter((e) => STAT_TO_BUFF[e.stat]));
  const lootEffect = item.effects.find((e) => e.stat === 'LOOT');
  return {
    id: item.id,
    name: item.name,
    kind: ItemKind.Book,
    slot: EquipmentSlot.Book,
    maxDurabilityCharges: item.charges ?? CHARGED_EQUIPMENT_MAX_CHARGES,
    ...(passives.length > 0 ? { passiveBuffs: passives } : {}),
    activeEffect: {
      type: BookActiveEffectType.LootBonus,
      value: lootEffect ? lootEffect.value / 100 : 0,
      durationMinutes: item.id === 'livro_estudo_tatico' ? 15 : 10,
    },
    description: item.description ?? item.name,
    weight: item.weight,
  };
}

export function catalogItemToLegacy(item: CatalogItemDefinition): LegacyItemDefinition {
  switch (item.category) {
    case ItemCategory.Equipable:
      return toLegacyEquipable(item);
    case ItemCategory.Potion:
      return toLegacyConsumable(item);
    case ItemCategory.Rune:
      return toLegacyRune(item);
    case ItemCategory.Book:
      return toLegacyBook(item);
    case ItemCategory.Currency:
    case ItemCategory.Generic:
    default:
      return toLegacyGeneric(item);
  }
}
