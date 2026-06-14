import { ItemBuffType, type ItemBuffTypeId } from '../items/itemTypes.js';
import { VELOCIDADE_STAT_LABEL } from '../stats/statDisplayLabels.js';

/** % acumulado por tipo de buff (catálogo oficial). */
export type BuffPercentByType = Partial<Record<ItemBuffTypeId, number>>;

export const ITEM_BUFF_DISPLAY_ORDER: readonly ItemBuffTypeId[] = [
  ItemBuffType.Strength,
  ItemBuffType.Defense,
  ItemBuffType.Agility,
  ItemBuffType.Critical,
  ItemBuffType.Dodge,
  ItemBuffType.Hp,
];

/** Rótulos curtos alinhados ao painel de personagem / catálogo. */
export const ITEM_BUFF_COMBAT_LABELS: Record<ItemBuffTypeId, string> = {
  [ItemBuffType.Strength]: 'Força',
  [ItemBuffType.Defense]: 'Defesa',
  [ItemBuffType.Agility]: VELOCIDADE_STAT_LABEL,
  [ItemBuffType.Critical]: 'Crítico',
  [ItemBuffType.Dodge]: 'Esquiva',
  [ItemBuffType.Hp]: 'Vida',
};

export const COMBAT_BREAKDOWN_SOURCE_LABELS = {
  moveset: 'Moveset',
  classe: 'Defesa',
  equip: 'Equip',
  amuleto: 'Amuleto',
  anel: 'Anel',
  livro: 'Livro',
  runa: 'Runa',
  marcos: 'Marcos',
} as const;

export type CombatBreakdownSourceId = keyof typeof COMBAT_BREAKDOWN_SOURCE_LABELS;

export function mergeBuffPercentMaps(...maps: readonly (BuffPercentByType | undefined)[]): BuffPercentByType {
  const out: BuffPercentByType = {};
  for (const map of maps) {
    if (!map) continue;
    for (const buffType of ITEM_BUFF_DISPLAY_ORDER) {
      const add = map[buffType];
      if (typeof add !== 'number' || add <= 0) continue;
      out[buffType] = (out[buffType] ?? 0) + add;
    }
  }
  return out;
}

export function applyBuffsToPercentMap(
  target: BuffPercentByType,
  buffs: readonly { readonly type: ItemBuffTypeId; readonly percent: number }[],
): void {
  for (const buff of buffs) {
    if (buff.percent <= 0) continue;
    target[buff.type] = (target[buff.type] ?? 0) + buff.percent;
  }
}

export function sumBuffPercent(map: BuffPercentByType | undefined, type: ItemBuffTypeId): number {
  return map?.[type] ?? 0;
}
