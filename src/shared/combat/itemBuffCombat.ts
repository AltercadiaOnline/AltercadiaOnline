import { ItemBuffType, type ItemBuffTypeId } from '../items/itemTypes.js';
import {
  ItemCategory,
  ItemEffectValueType,
  type ItemDefinition,
} from '../items/itemSchema.js';
import { getAuthoritativeItemById } from '../items/itemCatalogAuthoritative.js';
import type { Combatant } from '../types/combat.js';
import {
  sumBuffPercent,
  type BuffPercentByType,
} from './combatBuffSnapshot.js';

/**
 * Contrato único — cada buff de item (% passivo do catálogo) vira efeito real na luta.
 *
 * | Buff HUD | O que acontece no combate |
 * | STR      | +STR% do (ATK classe + poder do move) no golpe |
 * | DEF      | +DEF% do golpe recebido na defesa |
 * | CRIT     | +CRIT% no pico do crítico (não é chance no dado) |
 * | DODGE    | +DODGE% de chance de anular o hit |
 * | HP       | +HP% no HP máximo da batalha (base de nível) |
 * | AGI      | Tempo: viés na ordem + chance de golpe extra. Não acelera animação. |
 */
export type GearCombatBuffs = {
  readonly strengthPercent: number;
  readonly defensePercent: number;
  readonly critChancePercent: number;
  readonly dodgePercent: number;
  readonly hpPercent: number;
  readonly agilityPercent: number;
};

export const EMPTY_GEAR_COMBAT_BUFFS: GearCombatBuffs = {
  strengthPercent: 0,
  defensePercent: 0,
  critChancePercent: 0,
  dodgePercent: 0,
  hpPercent: 0,
  agilityPercent: 0,
};

const CATALOG_STAT_TO_FIELD: Readonly<Record<string, keyof GearCombatBuffs>> = {
  STR: 'strengthPercent',
  DEF: 'defensePercent',
  CRIT: 'critChancePercent',
  DODGE: 'dodgePercent',
  HP: 'hpPercent',
  AGI: 'agilityPercent',
};

function add(base: GearCombatBuffs, field: keyof GearCombatBuffs, value: number): GearCombatBuffs {
  if (value <= 0) return base;
  return { ...base, [field]: base[field] + value };
}

export function extractPassivePercentBuffsFromItem(
  item: ItemDefinition | null | undefined,
): GearCombatBuffs {
  if (!item) return EMPTY_GEAR_COMBAT_BUFFS;
  let out = EMPTY_GEAR_COMBAT_BUFFS;
  for (const effect of item.effects) {
    if (effect.combatOnly) continue;
    if (effect.type !== ItemEffectValueType.Percent) continue;
    const field = CATALOG_STAT_TO_FIELD[effect.stat];
    if (!field || effect.value <= 0) continue;
    out = add(out, field, effect.value);
  }
  return out;
}

export function sumGearCombatBuffsFromItemIds(
  itemIds: readonly (string | null | undefined)[],
): GearCombatBuffs {
  let out = EMPTY_GEAR_COMBAT_BUFFS;
  const seen = new Set<string>();
  for (const itemId of itemIds) {
    if (!itemId || seen.has(itemId)) continue;
    seen.add(itemId);
    const piece = extractPassivePercentBuffsFromItem(getAuthoritativeItemById(itemId));
    out = {
      strengthPercent: out.strengthPercent + piece.strengthPercent,
      defensePercent: out.defensePercent + piece.defensePercent,
      critChancePercent: out.critChancePercent + piece.critChancePercent,
      dodgePercent: out.dodgePercent + piece.dodgePercent,
      hpPercent: out.hpPercent + piece.hpPercent,
      agilityPercent: out.agilityPercent + piece.agilityPercent,
    };
  }
  return out;
}

function mappedBuffPercent(
  maps: readonly (BuffPercentByType | undefined)[],
  type: ItemBuffTypeId,
): number {
  let total = 0;
  for (const map of maps) {
    total += sumBuffPercent(map, type);
  }
  return total;
}

/** Lê o SET já resolvido no combatente — stats primeiro, maps como reforço. */
export function resolveCombatantGearBuffs(combatant: Combatant): GearCombatBuffs {
  const stats = combatant.combatStats;
  const sources = combatant.combatStatSources;
  const maps = [
    sources?.equipByBuff,
    sources?.amuletByBuff,
    sources?.ringByBuff,
    sources?.bookByBuff,
    sources?.runeByBuff,
  ] as const;

  const mappedStr = mappedBuffPercent(maps, ItemBuffType.Strength);
  const mappedDef = mappedBuffPercent(maps, ItemBuffType.Defense);
  const mappedCrit = mappedBuffPercent(maps, ItemBuffType.Critical);
  const mappedDodge = mappedBuffPercent(maps, ItemBuffType.Dodge);
  const mappedAgi = mappedBuffPercent(maps, ItemBuffType.Agility);
  const mappedHp = mappedBuffPercent(maps, ItemBuffType.Hp);

  return {
    strengthPercent: Math.max(stats?.attackPercent ?? 0, mappedStr),
    defensePercent: Math.max(stats?.defensePercent ?? 0, mappedDef),
    critChancePercent: Math.max((stats?.critChanceBonus ?? 0) * 100, mappedCrit),
    dodgePercent: Math.max(stats?.dodgePercent ?? 0, mappedDodge),
    hpPercent: Math.max(stats?.maxHpBonusPercent ?? 0, mappedHp),
    agilityPercent: Math.max(stats?.agilityPercent ?? 0, mappedAgi),
  };
}

export function applyPercentToBase(base: number, percent: number): number {
  if (percent <= 0 || base <= 0) return 0;
  return Math.floor(base * percent / 100);
}

/**
 * Soma de fluxo/classe/bônus planos para HUD.
 * AGI% do SET **não** entra aqui — ver `agilityTempo.ts`.
 */
export function resolveEffectiveSpeedWithGear(input: {
  readonly flowSpeedBase: number;
  readonly classAgility: number;
  readonly speedBonusTotal: number;
}): number {
  return input.flowSpeedBase + input.classAgility + input.speedBonusTotal;
}

export function isPassiveCombatCatalogItem(item: ItemDefinition): boolean {
  return item.category === ItemCategory.Equipable
    || item.category === ItemCategory.Book
    || item.category === ItemCategory.Rune;
}
