/** Alvo do card de interação — clique duplo no mundo top-down. */
export const InteractionTargetType = {
  PLAYER: 'PLAYER',
  NPC: 'NPC',
} as const;

export type InteractionTargetType =
  (typeof InteractionTargetType)[keyof typeof InteractionTargetType];

export type InteractionCardTarget = {
  readonly targetId: string;
  readonly targetType: InteractionTargetType;
  readonly displayName: string;
  readonly screenX: number;
  readonly screenY: number;
};

export type InteractionCardNpcAction = 'talk' | 'buy';

export type InteractionCardPlayerAction = 'duel' | 'trade' | 'follow';
