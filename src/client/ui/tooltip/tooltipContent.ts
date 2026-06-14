import {
  ItemCategory,
  ItemEffectValueType,
  type ItemDefinition,
} from '../../../shared/items/itemSchema.js';
import type { MoveDefinition } from '../../../shared/combat/moveTypes.js';
import { buildMoveTooltipLines } from '../../../shared/combat/moveTooltipContent.js';
import {
  buildStatusTooltipLines,
  resolveStatusTooltipTitle,
} from '../../../shared/combat/statusTooltipContent.js';
import {
  formatClassMoveNarrativeTitle,
  resolveClassMoveNarrativeTooltip,
} from '../../../shared/combat/classMoveNarrativeTooltips.js';
import { resolveStatusVisual } from '../../config/statusVisuals.js';
import {
  buildProgressionTooltipLines,
  type ProgressionTooltipKind,
} from '../../../shared/progression/progressionTooltipContent.js';
import type { TooltipData, TooltipRenderModel } from './tooltipTypes.js';
import { ITEM_EFFECT_STAT_LABELS } from '../../../shared/stats/statDisplayLabels.js';
import { buildItemTooltipCombatLines } from '../../../shared/items/itemTooltipCombatContext.js';

const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.Generic]: 'Genérico',
  [ItemCategory.Equipable]: 'Equipável',
  [ItemCategory.Potion]: 'Poção',
  [ItemCategory.Rune]: 'Runa',
  [ItemCategory.Book]: 'Livro',
  [ItemCategory.Currency]: 'Moeda',
};

export const ITEM_TOOLTIP_BORDER_COLORS: Record<ItemCategory, string> = {
  [ItemCategory.Generic]: '#a89b88',
  [ItemCategory.Equipable]: '#c5a059',
  [ItemCategory.Potion]: '#6dff9a',
  [ItemCategory.Rune]: '#b88cff',
  [ItemCategory.Book]: '#6eb5ff',
  [ItemCategory.Currency]: '#ffe066',
};

export const MOVE_TOOLTIP_BORDER_COLOR = '#5e4a30';
export const MARCO_TOOLTIP_BORDER_COLOR = '#00ffcc';

const PROGRESSION_TOOLTIP_BORDER: Record<ProgressionTooltipKind, string> = {
  'player-level': '#c5a059',
  'pet-affinity': '#ff9bca',
  'move-mastery': '#6eb5ff',
  'marco-node': '#00ffcc',
};

function formatItemEffect(stat: string, value: number, type: ItemEffectValueType): string {
  const label = ITEM_EFFECT_STAT_LABELS[stat] ?? stat;
  const suffix = type === ItemEffectValueType.Percent ? '%' : '';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value}${suffix} ${label}`;
}

function buildItemModel(
  item: ItemDefinition,
  heldAmountLabel?: string,
): TooltipRenderModel {
  const lines: string[] = [
    ITEM_CATEGORY_LABELS[item.category] ?? item.category,
  ];

  if (item.category === ItemCategory.Currency && heldAmountLabel) {
    lines.push(`Em posse: ${heldAmountLabel}`);
  }

  if (item.weight > 0) {
    lines.push(`Peso: ${item.weight.toFixed(1)}`);
  }

  for (const effect of item.effects) {
    if (effect.value === 0) continue;
    lines.push(formatItemEffect(effect.stat, effect.value, effect.type));
  }

  for (const contextLine of buildItemTooltipCombatLines(item)) {
    if (!lines.includes(contextLine)) {
      lines.push(contextLine);
    }
  }

  return {
    borderColor: ITEM_TOOLTIP_BORDER_COLORS[item.category] ?? MOVE_TOOLTIP_BORDER_COLOR,
    title: item.name,
    lines,
  };
}

function buildMoveModel(move: MoveDefinition): TooltipRenderModel {
  const narrative = resolveClassMoveNarrativeTooltip(move.id);
  return {
    borderColor: MOVE_TOOLTIP_BORDER_COLOR,
    title: narrative
      ? formatClassMoveNarrativeTitle(move.name, narrative)
      : move.name,
    lines: buildMoveTooltipLines(move),
  };
}

function buildMarcoModel(data: TooltipData & { kind: 'marco' }): TooltipRenderModel {
  const lines = [`Efeito: ${data.data.effect}`];
  if (data.data.requirement) {
    lines.push(`Requisito: ${data.data.requirement}`);
  }

  return {
    borderColor: MARCO_TOOLTIP_BORDER_COLOR,
    title: data.data.name,
    lines,
  };
}

function buildStatusModel(data: TooltipData & { kind: 'status' }): TooltipRenderModel {
  const visual = resolveStatusVisual(data.statusId);
  return {
    borderColor: visual.color,
    title: resolveStatusTooltipTitle(data.statusId),
    lines: buildStatusTooltipLines(data.statusId, data.chip),
  };
}

function buildProgressionModel(data: TooltipData & { kind: 'progression' }): TooltipRenderModel {
  return {
    borderColor: PROGRESSION_TOOLTIP_BORDER[data.data.kind] ?? MOVE_TOOLTIP_BORDER_COLOR,
    title: data.data.title,
    lines: buildProgressionTooltipLines(data.data),
  };
}

export function buildTooltipRenderModel(data: TooltipData): TooltipRenderModel | null {
  if (data.kind === 'item') {
    return buildItemModel(data.data, data.heldAmountLabel);
  }
  if (data.kind === 'marco') {
    return buildMarcoModel(data);
  }
  if (data.kind === 'status') {
    return buildStatusModel(data);
  }
  if (data.kind === 'progression') {
    return buildProgressionModel(data);
  }
  return buildMoveModel(data.data);
}
