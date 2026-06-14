import type { ItemDefinition } from './itemSchema.js';
import { ItemEffectValueType } from './itemSchema.js';
import { getBookDefinition, getRuneDefinition } from './runesBooksCatalog.js';

const STAT_COMBAT_HINTS: Record<string, string> = {
  STR: 'Soma no termo de ataque (golpes com Força).',
  CRIT: 'Aumenta chance de crítico nos golpes (não soma no “Golpe” do log).',
  AGI: 'Velocidade: iniciativa no combate e deslocamento no mapa.',
  DEF: 'Reduz dano recebido (termo Defesa do log).',
  HP: 'Aumenta HP máximo fora do turno de golpe.',
  DODGE: 'Chance de esquivar o golpe inimigo.',
  REFLECT: 'Efeito de runa em combate (ver descrição).',
  PP: 'Restaura PP de skills (fora do efeito de saturação de poção em combate).',
  LOOT: 'Bônus de loot ao ativar o livro (fora do dano de batalha).',
};

const RUNE_TRIGGER_LABELS: Record<string, string> = {
  IMPACT: 'procs ao causar dano (IMPACT)',
  BLOCK: 'procs ao bloquear/reduzir dano (BLOCK)',
};

export function buildItemTooltipCombatLines(item: ItemDefinition): string[] {
  const lines: string[] = [];

  const rune = getRuneDefinition(item.id);
  if (rune?.description) {
    lines.push(rune.description);
  }
  const book = getBookDefinition(item.id);
  if (book?.description) {
    lines.push(book.description);
  }

  const runeTrigger = rune?.combatEffect.trigger;
  if (runeTrigger) {
    const label = RUNE_TRIGGER_LABELS[runeTrigger] ?? runeTrigger;
    lines.push(`Runa: ${label}.`);
  }

  const hintedStats = new Set<string>();
  for (const effect of item.effects) {
    if (effect.value === 0) continue;
    const hint = STAT_COMBAT_HINTS[effect.stat];
    if (hint && !hintedStats.has(effect.stat)) {
      hintedStats.add(effect.stat);
      const suffix = effect.type === ItemEffectValueType.Percent ? '%' : '';
      lines.push(`${effect.stat}${suffix}: ${hint}`);
    }
  }

  return lines;
}
