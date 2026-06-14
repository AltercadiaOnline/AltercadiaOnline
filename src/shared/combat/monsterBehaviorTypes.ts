export const MonsterBehaviorType = {
  Patrol: 'PATROL',
  Aggressive: 'AGGRESSIVE',
  Trap: 'TRAP',
} as const;

export type MonsterBehaviorType = (typeof MonsterBehaviorType)[keyof typeof MonsterBehaviorType];
