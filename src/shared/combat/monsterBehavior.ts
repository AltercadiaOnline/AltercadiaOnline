import type { MonsterCatalogEntry } from './MonsterCatalog.js';
import { MonsterBehaviorType } from './monsterBehaviorTypes.js';

export { MonsterBehaviorType } from './monsterBehaviorTypes.js';

export type BehaviorHookResult = {
  readonly cancelAction?: boolean;
  readonly damageMultiplier?: number;
  readonly logLines?: readonly string[];
  readonly preferredSkillId?: string;
  readonly applyStatusToTarget?: string;
};

export type MonsterBehaviorContext = {
  readonly turn: number;
  readonly monster: MonsterCatalogEntry;
  readonly playerActorId: string;
  readonly behaviorState: MonsterBehaviorState;
};

export type MonsterAttackContext = MonsterBehaviorContext & {
  readonly skillId: string;
  readonly isPhysical: boolean;
};

export type MonsterDefendContext = MonsterBehaviorContext & {
  readonly incomingDamage: number;
  readonly isPhysical: boolean;
};

/** Estado mutável por monstro (carga do Minotauro, etc.). */
export type MonsterBehaviorState = {
  chargeTurns: number;
  trapArmed: boolean;
};

export function createBehaviorState(): MonsterBehaviorState {
  return { chargeTurns: 0, trapArmed: false };
}

export interface MonsterBehavior {
  readonly behaviorType: MonsterBehaviorType;
  onTurnStart(ctx: MonsterBehaviorContext): BehaviorHookResult;
  onAttack(ctx: MonsterAttackContext): BehaviorHookResult;
  onDefend(ctx: MonsterDefendContext): BehaviorHookResult;
}

const defaultBehavior: MonsterBehavior = {
  behaviorType: MonsterBehaviorType.Aggressive,
  onTurnStart: () => ({}),
  onAttack: () => ({}),
  onDefend: () => ({}),
};

/** Espectro: imunidade física em turnos ímpares durante onAttack. */
export const specterBehavior: MonsterBehavior = {
  behaviorType: MonsterBehaviorType.Trap,
  onTurnStart: () => ({
    logLines: ['O Espectro pulsa em um plano adjacente.'],
  }),
  onAttack: (ctx) => {
    if (!ctx.isPhysical) return {};
    if (ctx.turn % 2 === 1) {
      return {
        cancelAction: true,
        damageMultiplier: 0,
        logLines: ['Espectro: imunidade física (turno ímpar).'],
      };
    }
    return {};
  },
  onDefend: () => ({}),
};

/** Minotauro: acumula carga em onTurnStart; desferre golpe ao atingir 3 turnos. */
export const minotaurBehavior: MonsterBehavior = {
  behaviorType: MonsterBehaviorType.Aggressive,
  onTurnStart: (ctx) => {
    ctx.behaviorState.chargeTurns += 1;
    const lines = [`Minotauro acumula carga (${ctx.behaviorState.chargeTurns}/3).`];
    if (ctx.behaviorState.chargeTurns >= 3) {
      return {
        preferredSkillId: 'minotaur_gore',
        logLines: [...lines, 'Minotauro desferre a investida!'],
      };
    }
    return { logLines: lines };
  },
  onAttack: (ctx) => {
    if (ctx.skillId === 'minotaur_gore' && ctx.behaviorState.chargeTurns >= 3) {
      ctx.behaviorState.chargeTurns = 0;
      return { damageMultiplier: 1.75, logLines: ['Investida do Minotauro!'] };
    }
    return {};
  },
  onDefend: () => ({}),
};

const patrolBehavior: MonsterBehavior = {
  behaviorType: MonsterBehaviorType.Patrol,
  onTurnStart: () => ({
    logLines: ['A criatura patrulha cautelosamente.'],
  }),
  onAttack: () => ({}),
  onDefend: () => ({}),
};

const CREATURE_BEHAVIORS: Record<string, MonsterBehavior> = {
  specter: specterBehavior,
  minotaur: minotaurBehavior,
  wild_dog: patrolBehavior,
};

export function resolveMonsterBehavior(monster: MonsterCatalogEntry): MonsterBehavior {
  return CREATURE_BEHAVIORS[monster.creatureId] ?? defaultBehavior;
}

export function runBehaviorSwitch(
  monster: MonsterCatalogEntry,
  phase: 'onTurnStart' | 'onAttack' | 'onDefend',
  ctx: MonsterBehaviorContext | MonsterAttackContext | MonsterDefendContext,
): BehaviorHookResult {
  const behavior = resolveMonsterBehavior(monster);
  switch (phase) {
    case 'onTurnStart':
      return behavior.onTurnStart(ctx as MonsterBehaviorContext);
    case 'onAttack':
      return behavior.onAttack(ctx as MonsterAttackContext);
    case 'onDefend':
      return behavior.onDefend(ctx as MonsterDefendContext);
    default:
      return {};
  }
}
