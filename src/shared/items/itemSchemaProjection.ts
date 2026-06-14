import {
  ItemCategory,
  ItemEffectValueType,
  type ItemEffectDefinition,
  type ItemSlotCode,
  type NormalizedItemDefinition,
} from './itemSchema.js';
import type {
  BookDefinition,
  ConsumableDefinition,
  EquipableItemDefinition,
  GenericItemDefinition,
  ItemBuffModifier,
  ItemBuffTypeId,
  ItemDefinition,
  RuneDefinition,
} from './itemTypes.js';
import {
  BookActiveEffectType,
  ConsumableEffectType,
  EquipmentSlot,
  ItemKind,
  RuneCombatEffectType,
} from './itemTypes.js';

const BUFF_STAT_MAP: Record<ItemBuffTypeId, string> = {
  defense: 'DEF',
  dodge: 'DODGE',
  hp: 'HP',
  agility: 'AGI',
  critical: 'CRIT',
  strength: 'STR',
};

function buffsToEffects(buffs: readonly ItemBuffModifier[]): ItemEffectDefinition[] {
  return buffs.map((buff) => ({
    stat: BUFF_STAT_MAP[buff.type] ?? buff.type.toUpperCase(),
    value: buff.percent,
    type: ItemEffectValueType.Percent,
  }));
}

function resolveBottomSlotCode(itemId: string, name: string): ItemSlotCode {
  const key = `${itemId} ${name}`.toLowerCase();
  if (key.includes('boot') || key.includes('feet') || key.includes('bota')) {
    return 'B';
  }
  return 'P';
}

function slotToCode(
  slot: EquipableItemDefinition['slot'],
  itemId: string,
  name: string,
): ItemSlotCode {
  switch (slot) {
    case EquipmentSlot.Head:
      return 'H';
    case EquipmentSlot.Top:
      return 'A';
    case EquipmentSlot.Bottom:
      return resolveBottomSlotCode(itemId, name);
    case EquipmentSlot.Ring:
      return 'R2';
    case EquipmentSlot.Amulet:
      return 'M';
    case EquipmentSlot.Book:
      return 'S';
    case EquipmentSlot.Rune:
      return 'U2';
    default:
      return 'P';
  }
}

function consumableEffectsToNormalized(
  item: ConsumableDefinition,
): ItemEffectDefinition[] {
  const effects: ItemEffectDefinition[] = [];

  for (const effect of item.effects) {
    if (effect.type === ConsumableEffectType.HealHp) {
      effects.push({
        stat: 'HP',
        value: Math.round(effect.value <= 1 ? effect.value * 100 : effect.value),
        type: ItemEffectValueType.Percent,
      });
      continue;
    }
    if (effect.type === ConsumableEffectType.RestorePp) {
      effects.push({
        stat: 'PP',
        value: effect.value,
        type: ItemEffectValueType.Flat,
      });
      continue;
    }
    if (effect.type === ConsumableEffectType.BuffStat && effect.buffType) {
      effects.push({
        stat: BUFF_STAT_MAP[effect.buffType] ?? effect.buffType.toUpperCase(),
        value: effect.value,
        type: ItemEffectValueType.Flat,
      });
    }
  }

  return effects;
}

function runeEffectsToNormalized(item: RuneDefinition): ItemEffectDefinition[] {
  const effects: ItemEffectDefinition[] = [];

  if (item.passiveBuffs?.length) {
    effects.push(...buffsToEffects(item.passiveBuffs));
  }

  const { combatEffect } = item;
  if (combatEffect.type === RuneCombatEffectType.CritBonus) {
    effects.push({
      stat: 'CRIT',
      value: combatEffect.value <= 1 ? combatEffect.value * 100 : combatEffect.value,
      type: ItemEffectValueType.Percent,
    });
  } else if (combatEffect.type === RuneCombatEffectType.ReflectDmg) {
    effects.push({
      stat: 'REFLECT',
      value: combatEffect.value <= 1 ? combatEffect.value * 100 : combatEffect.value,
      type: ItemEffectValueType.Percent,
    });
  } else if (combatEffect.type === RuneCombatEffectType.SpeedNextTurn) {
    effects.push({
      stat: 'AGI',
      value: combatEffect.value,
      type: ItemEffectValueType.Flat,
    });
  }

  return effects;
}

function bookEffectsToNormalized(item: BookDefinition): ItemEffectDefinition[] {
  const effects: ItemEffectDefinition[] = [];

  if (item.passiveBuffs?.length) {
    effects.push(...buffsToEffects(item.passiveBuffs));
  }

  if (item.activeEffect.type === BookActiveEffectType.LootBonus) {
    effects.push({
      stat: 'LOOT',
      value: item.activeEffect.value <= 1
        ? item.activeEffect.value * 100
        : item.activeEffect.value,
      type: ItemEffectValueType.Percent,
    });
  }

  return effects;
}

function projectGeneric(item: GenericItemDefinition): NormalizedItemDefinition {
  return {
    id: item.id,
    name: item.name,
    category: item.kind === ItemKind.Currency ? ItemCategory.Currency : ItemCategory.Generic,
    weight: item.weight,
    effects: [],
  };
}

function projectEquipable(item: EquipableItemDefinition): NormalizedItemDefinition {
  return {
    id: item.id,
    name: item.name,
    category: ItemCategory.Equipable,
    weight: item.weight,
    slot: slotToCode(item.slot, item.id, item.name),
    effects: buffsToEffects(item.buffs),
  };
}

function projectConsumable(item: ConsumableDefinition): NormalizedItemDefinition {
  return {
    id: item.id,
    name: item.name,
    category: ItemCategory.Potion,
    weight: item.weight,
    effects: consumableEffectsToNormalized(item),
    ...(item.usage === 'in_combat' ? { cooldown: 1 } : {}),
    ...(item.minLevel !== undefined ? { requiresLevel: item.minLevel } : {}),
  };
}

function projectRune(item: RuneDefinition): NormalizedItemDefinition {
  return {
    id: item.id,
    name: item.name,
    category: ItemCategory.Rune,
    weight: item.weight,
    slot: 'U2',
    effects: runeEffectsToNormalized(item),
  };
}

function projectBook(item: BookDefinition): NormalizedItemDefinition {
  return {
    id: item.id,
    name: item.name,
    category: ItemCategory.Book,
    weight: item.weight,
    slot: 'S',
    effects: bookEffectsToNormalized(item),
  };
}

/** Projeta entrada legada do catálogo para o schema unificado. */
export function projectToNormalizedItem(item: ItemDefinition): NormalizedItemDefinition {
  switch (item.kind) {
    case ItemKind.Equipable:
      return projectEquipable(item);
    case ItemKind.Consumable:
      return projectConsumable(item);
    case ItemKind.Rune:
      return projectRune(item);
    case ItemKind.Book:
      return projectBook(item);
    case ItemKind.Generic:
    case ItemKind.Currency:
    default:
      return projectGeneric(item);
  }
}
