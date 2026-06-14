/** Seis buffs oficiais do MVP — sem sobreposição semântica. */
export const ItemBuffType = {
  Defense: 'defense',
  Dodge: 'dodge',
  Hp: 'hp',
  Agility: 'agility',
  Critical: 'critical',
  Strength: 'strength',
} as const;

export type ItemBuffTypeId = (typeof ItemBuffType)[keyof typeof ItemBuffType];

export const ItemKind = {
  Currency: 'currency',
  Generic: 'generic',
  Equipable: 'equipable',
  Consumable: 'consumable',
  Rune: 'rune',
  Book: 'book',
} as const;

export type ItemKindId = (typeof ItemKind)[keyof typeof ItemKind];

export const EquipmentSlot = {
  Head: 'head',
  Top: 'top',
  Bottom: 'bottom',
  Ring: 'ring',
  Amulet: 'amulet',
  /** Slot S — livro equipado + ativação temporal */
  Book: 'book',
  /** Slot U2 — runa com cargas e trigger de combate */
  Rune: 'rune',
} as const;

export type EquipmentSlotId = (typeof EquipmentSlot)[keyof typeof EquipmentSlot];

/** Letras legadas usadas no combat balance / UI */
export const EquipmentSlotLetter: Record<EquipmentSlotId, string> = {
  head: 'H',
  top: 'A',
  bottom: 'P',
  ring: 'R2',
  amulet: 'M',
  book: 'S',
  rune: 'U2',
};

export type ItemBuffModifier = {
  readonly type: ItemBuffTypeId;
  /** Percentual inteiro ex.: 5 = +5% */
  readonly percent: number;
};

export type GenericItemDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: typeof ItemKind.Generic | typeof ItemKind.Currency;
  readonly sellable: true;
  readonly description: string;
  readonly weight: number;
};

export type EquipableItemDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: typeof ItemKind.Equipable;
  readonly slot: EquipmentSlotId;
  readonly buffs: readonly ItemBuffModifier[];
  readonly sourceCreatureId: string;
  readonly zoneId: ZoneId;
  readonly description: string;
  readonly weight: number;
};

export const ConsumableUsage = {
  InCombat: 'in_combat',
  PreBattle: 'pre_battle',
  OutOfCombat: 'out_of_combat',
} as const;

export type ConsumableUsageId = (typeof ConsumableUsage)[keyof typeof ConsumableUsage];

export const ConsumableEffectType = {
  HealHp: 'heal_hp',
  RestorePp: 'restore_pp',
  BuffStat: 'buff_stat',
  DamageAoe: 'damage_aoe',
} as const;

export type ConsumableEffectTypeId = (typeof ConsumableEffectType)[keyof typeof ConsumableEffectType];

export type ConsumableEffect = {
  readonly type: ConsumableEffectTypeId;
  /** Percentual (0.08) ou flat conforme o tipo */
  readonly value: number;
  readonly target?: 'self';
  readonly skillScope?: 'all';
  readonly buffType?: ItemBuffTypeId;
  readonly durationTurns?: number;
};

export type ConsumableDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: typeof ItemKind.Consumable;
  readonly stackable: true;
  readonly maxStack: number;
  readonly usage: ConsumableUsageId;
  readonly minLevel?: number;
  readonly effects: readonly ConsumableEffect[];
  readonly description: string;
  readonly weight: number;
};

export const RuneTrigger = {
  Impact: 'IMPACT',
  Block: 'BLOCK',
  Dash: 'DASH',
} as const;

export type RuneTriggerId = (typeof RuneTrigger)[keyof typeof RuneTrigger];

export const RuneCombatEffectType = {
  CritBonus: 'CRIT_BONUS',
  ReflectDmg: 'REFLECT_DMG',
  SpeedNextTurn: 'SPEED_NEXT_TURN',
} as const;

export type RuneCombatEffectTypeId = (typeof RuneCombatEffectType)[keyof typeof RuneCombatEffectType];

export type RuneCombatEffect = {
  readonly type: RuneCombatEffectTypeId;
  readonly value: number;
  readonly trigger: RuneTriggerId;
};

export type RuneDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: typeof ItemKind.Rune;
  readonly slot: typeof EquipmentSlot.Rune;
  /** Durabilidade (10) — −1 por batalha participada. */
  readonly maxDurabilityCharges: number;
  /** Procs de combate disponíveis dentro de uma batalha. */
  readonly combatProcsPerBattle: number;
  readonly combatEffect: RuneCombatEffect;
  /** Stats passivos enquanto equipada (AGI → Velocidade / speedBonusTotal) */
  readonly passiveBuffs?: readonly ItemBuffModifier[];
  readonly description: string;
  readonly weight: number;
};

export const BookActiveEffectType = {
  LootBonus: 'LOOT_BONUS',
} as const;

export type BookActiveEffectTypeId = (typeof BookActiveEffectType)[keyof typeof BookActiveEffectType];

export type BookActiveEffect = {
  readonly type: BookActiveEffectTypeId;
  readonly value: number;
  readonly durationMinutes: number;
};

export type BookDefinition = {
  readonly id: string;
  readonly name: string;
  readonly kind: typeof ItemKind.Book;
  readonly slot: typeof EquipmentSlot.Book;
  /** Durabilidade (10) — −1 por batalha participada. */
  readonly maxDurabilityCharges: number;
  readonly passiveBuffs?: readonly ItemBuffModifier[];
  readonly activeEffect: BookActiveEffect;
  readonly description: string;
  readonly weight: number;
};

export type ItemDefinition =
  | GenericItemDefinition
  | EquipableItemDefinition
  | ConsumableDefinition
  | RuneDefinition
  | BookDefinition;

export const ZoneId = {
  Zone1: 'zone_1_beco',
  Zone2: 'zone_2_metro',
  Zone3: 'zone_3_estacionamento',
  Zone4: 'zone_4_telhados',
  Zone5: 'zone_5_esgoto',
} as const;

export type ZoneId = (typeof ZoneId)[keyof typeof ZoneId];

export type ZoneDefinition = {
  readonly id: ZoneId;
  readonly name: string;
  readonly levelMin: number;
  readonly levelMax: number;
};

export type CreatureDropEntry = {
  readonly creatureId: string;
  readonly creatureName: string;
  readonly zoneId: ZoneId;
  readonly archetypeId: string;
  readonly genericDropIds: readonly string[];
  readonly equipableItemId: string | null;
};
