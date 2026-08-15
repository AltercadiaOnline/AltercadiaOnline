/**
 * Rótulos exibidos ao jogador — fonte única para AGI / `agilidade` do SET.
 * Chaves internas (`agilidade`, `ItemBuffType.Agility`, `AGI`) permanecem no código.
 */

/** Nome único: mapa (deslocamento) + batalha (iniciativa de turno). */
export const AGILIDADE_STAT_LABEL = 'Agilidade';

/** @deprecated Use AGILIDADE_STAT_LABEL — alias de migração. */
export const VELOCIDADE_STAT_LABEL = AGILIDADE_STAT_LABEL;

/** Texto de ajuda (ficha, aria, docs curtos). */
export const AGILIDADE_STAT_DESCRIPTION =
  'Soma da classe, equipamento e buffs: acelera no mapa e define quem age primeiro no combate.';

/** @deprecated Use AGILIDADE_STAT_DESCRIPTION. */
export const VELOCIDADE_STAT_DESCRIPTION = AGILIDADE_STAT_DESCRIPTION;

/** Alias na UI de combate (breakdown, ordem de turno). */
export const COMBAT_INITIATIVE_STAT_LABEL = AGILIDADE_STAT_LABEL;

/** Rótulos de efeitos de item (`ItemEffectDefinition.stat`). */
export const ITEM_EFFECT_STAT_LABELS: Record<string, string> = {
  DEF: 'Defesa',
  HP: 'Vida',
  AGI: AGILIDADE_STAT_LABEL,
  CRIT: 'Crítico',
  STR: 'Força',
  DODGE: 'Esquiva',
  PP: 'PP',
  REFLECT: 'Reflexo',
};
