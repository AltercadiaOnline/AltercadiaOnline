import type { LootRarityId } from '../loot/lootTypes.js';

/** Classificação econômica de drops — crafting vs revenda direta ao NPC. */
export const ItemLootKind = {
  Crafting: 'CRAFTING',
  DirectValue: 'DIRECT_VALUE',
} as const;

export type ItemLootKind = (typeof ItemLootKind)[keyof typeof ItemLootKind];

/** Categorias canônicas do catálogo (schema unificado). */
export const ItemCategory = {
  Generic: 'GENERIC',
  Equipable: 'EQUIPABLE',
  Potion: 'POTION',
  Rune: 'RUNE',
  Book: 'BOOK',
  Currency: 'CURRENCY',
} as const;

export type ItemCategory = (typeof ItemCategory)[keyof typeof ItemCategory];

/** Slots de equipamento — letras legadas do combat/UI. */
export type ItemSlotCode = 'H' | 'A' | 'P' | 'B' | 'R2' | 'M' | 'S' | 'U2';

export const ItemEffectValueType = {
  Percent: 'PERCENT',
  Flat: 'FLAT',
} as const;

export type ItemEffectValueType =
  (typeof ItemEffectValueType)[keyof typeof ItemEffectValueType];

/** Efeito de item — ex.: { stat: 'DEF', value: 10, type: 'PERCENT' }. */
export type ItemEffectDefinition = {
  readonly stat: string;
  readonly value: number;
  readonly type: ItemEffectValueType;
  /** Runas — efeito só dispara no trigger de combate (não conta como passivo). */
  readonly combatOnly?: boolean;
};

/** Gatilho de combate para runas (slot U2). */
export type ItemCombatTrigger = 'IMPACT' | 'BLOCK' | 'DASH';

/** Metadados leves — carregados no bundle inicial (ícone, nome, id). */
export type ItemCoreDefinition = {
  readonly id: string;
  readonly name: string;
  readonly iconPath?: string;
};

/** Metadados pesados — descrição, efeitos e lore; lazy load na UI. */
export type ItemExtendedDetails = {
  readonly description?: string;
  readonly effects: readonly ItemEffectDefinition[];
  /** Histórico / lore do item — exibido sob demanda na UI. */
  readonly history?: string;
};

/** Regras mecânicas do item — sempre disponíveis para economia/combate/inventário. */
export type ItemMechanicalDefinition = {
  readonly category: ItemCategory;
  readonly weight: number;
  readonly slot?: ItemSlotCode;
  /** Poções reativas — turnos de cooldown (Combat V1.2: 2). */
  readonly cooldown?: number;
  /** Runas — cargas por batalha (procs in-combat). */
  readonly combatProcsPerBattle?: number;
  /** Runas/livros — durabilidade máxima (10); −1 por batalha participada. */
  readonly charges?: number;
  readonly requiresLevel?: number;
  readonly maxStack?: number;
  readonly combatTrigger?: ItemCombatTrigger;
  /** Preço piso de mercado (Volts) — NPC revende a valorBase × 0.8. */
  readonly valorBase?: number;
  /** Drop de loot — crafting (forja) ou valor direto (revenda NPC). */
  readonly lootKind?: ItemLootKind;
  /** Raridade exibida no saque e na UI de revenda. */
  readonly lootRarity?: LootRarityId;
  /** Apenas uma unidade por personagem — não empilha duplicata. */
  readonly isUnique?: boolean;
  /** Não pode ser descartado, dropado ou destruído. */
  readonly isIndestructible?: boolean;
  /** false bloqueia mercado P2P e revenda NPC. Padrão: true quando omitido. */
  readonly isTradable?: boolean;
};

/**
 * Definição canônica de item — fonte única do catálogo Altercadia.
 * Composição: Core + Mechanical + Extended.
 */
export type ItemDefinition = ItemCoreDefinition & ItemMechanicalDefinition & ItemExtendedDetails;

/** @deprecated Use `ItemDefinition` — alias histórico. */
export type NormalizedItemDefinition = ItemDefinition;

/** Alias de compatibilidade com o schema documentado. */
export type UnifiedItemDefinition = ItemDefinition;
