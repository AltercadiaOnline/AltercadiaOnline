/**
 * Rótulos exibidos ao jogador — fonte única para AGI / `agilidade` do SET.
 * Chaves internas (`agilidade`, `ItemBuffType.Agility`, `AGI`) permanecem no código.
 */

/** Nome único: mapa (deslocamento) + batalha (iniciativa de turno). */
export const VELOCIDADE_STAT_LABEL = 'Velocidade';

/** Texto de ajuda (ficha, aria, docs curtos). */
export const VELOCIDADE_STAT_DESCRIPTION =
  'Soma do equipamento e buffs: acelera no mapa e define quem age primeiro no combate.';

/** Alias na UI de combate (breakdown, ordem de turno). */
export const COMBAT_INITIATIVE_STAT_LABEL = VELOCIDADE_STAT_LABEL;

/** Rótulos de efeitos de item (`ItemEffectDefinition.stat`). */
export const ITEM_EFFECT_STAT_LABELS: Record<string, string> = {
  DEF: 'Defesa',
  HP: 'Vida',
  AGI: VELOCIDADE_STAT_LABEL,
  CRIT: 'Crítico',
  STR: 'Força',
  DODGE: 'Esquiva',
  PP: 'PP',
  REFLECT: 'Reflexo',
};
