import { getAuthoritativeItemById } from '../../../shared/items/itemCatalogAuthoritative.js';
import { CHARGED_EQUIPMENT_MAX_CHARGES } from '../../../shared/items/chargedEquipment.js';
import {
  ItemCategory,
  ItemEffectValueType,
  type ItemDefinition,
  type ItemEffectDefinition,
} from '../../../shared/items/itemSchema.js';
import {
  ITEM_EFFECT_STAT_LABELS,
  VELOCIDADE_STAT_LABEL,
} from '../../../shared/stats/statDisplayLabels.js';

const TRIGGER_LABELS: Record<string, string> = {
  IMPACT: 'Impacto',
  BLOCK: 'Bloqueio',
  DASH: 'Dash',
};

function formatEffect(effect: ItemEffectDefinition): string {
  const label = ITEM_EFFECT_STAT_LABELS[effect.stat] ?? effect.stat;
  const suffix = effect.type === ItemEffectValueType.Percent ? '%' : '';
  const prefix = effect.value >= 0 ? '+' : '';
  const combatTag = effect.combatOnly ? ' (combate)' : '';
  return `${prefix}${effect.value}${suffix} ${label}${combatTag}`;
}

function buildPotionEffectLines(item: ItemDefinition): readonly string[] {
  const lines: string[] = [];

  for (const effect of item.effects) {
    if (effect.stat === 'HP' && effect.type === ItemEffectValueType.Percent) {
      lines.push(`Restaura ${effect.value}% do HP máximo`);
    } else if (effect.stat === 'PP') {
      lines.push(`Restaura ${effect.value} PP`);
    } else if (effect.stat === 'AGI') {
      lines.push(`+${effect.value} ${VELOCIDADE_STAT_LABEL} por 2 turnos`);
    } else {
      lines.push(formatEffect(effect));
    }
  }

  if (item.cooldown) {
    lines.push(`Cooldown global: ${item.cooldown} turnos`);
  }

  if (item.maxStack) {
    lines.push(`Empilhável até ×${item.maxStack}`);
  }

  return lines;
}

function buildRuneEffectLines(item: ItemDefinition): readonly string[] {
  const lines: string[] = [];

  if (item.combatTrigger) {
    lines.push(`Gatilho: ${TRIGGER_LABELS[item.combatTrigger] ?? item.combatTrigger}`);
  }

  if (item.combatProcsPerBattle) {
    lines.push(`${item.combatProcsPerBattle} procs por combate`);
  }

  lines.push(`${CHARGED_EQUIPMENT_MAX_CHARGES} cargas — −1 por batalha participada`);

  for (const effect of item.effects) {
    lines.push(formatEffect(effect));
  }

  lines.push('Slot U2 — equipável antes do combate');
  return lines;
}

function buildBookEffectLines(item: ItemDefinition): readonly string[] {
  const lines: string[] = ['Slot S — passivo enquanto equipado'];

  for (const effect of item.effects) {
    lines.push(`Passivo: ${formatEffect(effect)}`);
  }

  lines.push(`${CHARGED_EQUIPMENT_MAX_CHARGES} cargas — −1 por batalha participada`);

  if (item.description) {
    const activeMatch = item.description.match(/Ativar:.+/);
    if (activeMatch) lines.push(activeMatch[0]!);
  }

  return lines;
}

/** Linhas de efeito detalhado para a HUD do Laboratório. */
export function buildConsumableShopEffectLines(itemId: string): readonly string[] {
  const item = getAuthoritativeItemById(itemId);
  if (!item) return ['Efeito indisponível.'];

  switch (item.category) {
    case ItemCategory.Potion:
      return buildPotionEffectLines(item);
    case ItemCategory.Rune:
      return buildRuneEffectLines(item);
    case ItemCategory.Book:
      return buildBookEffectLines(item);
    default:
      return item.description ? [item.description] : item.effects.map(formatEffect);
  }
}

export function resolveConsumableShopSubtitle(itemId: string): string | null {
  const item = getAuthoritativeItemById(itemId);
  if (!item) return null;
  if (item.requiresLevel) return `Requer nível ${item.requiresLevel}`;
  return null;
}
