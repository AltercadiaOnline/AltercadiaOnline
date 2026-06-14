/** Tipos compartilhados de movimento (classes + monstros). */

import { VELOCIDADE_STAT_LABEL } from '../stats/statDisplayLabels.js';

export const MoveCategory = {
  Attack: 'ATTACK',
  Defense: 'DEFENSE',
  Support: 'SUPPORT',
  Utility: 'UTILITY',
} as const;

export type MoveCategory = (typeof MoveCategory)[keyof typeof MoveCategory];

export const MOVE_CATEGORY_LABELS: Record<MoveCategory, string> = {
  [MoveCategory.Attack]: 'Ataque',
  [MoveCategory.Defense]: 'Defesa',
  [MoveCategory.Support]: 'Suporte',
  [MoveCategory.Utility]: 'Utilitário',
};

export const MoveScalingStat = {
  STR: 'STR',
  AGI: 'AGI',
  DEF: 'DEF',
  CRIT: 'CRIT',
} as const;

export type MoveScalingStat = (typeof MoveScalingStat)[keyof typeof MoveScalingStat];

export const MOVE_SCALING_STAT_LABELS: Record<MoveScalingStat, string> = {
  [MoveScalingStat.STR]: 'Força',
  [MoveScalingStat.AGI]: VELOCIDADE_STAT_LABEL,
  [MoveScalingStat.DEF]: 'Defesa',
  [MoveScalingStat.CRIT]: 'Crítico',
};

export type MoveDefinition = {
  readonly id: string;
  readonly name: string;
  readonly category: MoveCategory;
  readonly scalingStat: MoveScalingStat;
  readonly damage: number;
  readonly cooldown: number;
  readonly priority?: 1 | 2 | 3;
  readonly ppMax?: number;
  readonly description?: string;
  /** Kind mecânico do catálogo de classe — usado no tooltip. */
  readonly effectKind?: string;
  readonly effectParams?: Readonly<Record<string, number>>;
  /** Alvo do move (tooltip / HUD). */
  readonly moveTarget?: string;
};

export const PLAYER_MOVE_POOL_SIZE = 6;
export const ACTIVE_MOVESET_SLOT_COUNT = 4;
