import { MARCO_TREE_NODES } from './milestoneTreeCatalog.js';
import { MARCO_NODE_MAX_LEVEL } from './marcoProgression.js';

/** Gatilhos de uso — cliente reporta intenção; servidor valida e aplica XP. */
export const MarcoProgressTrigger = {
  CRIT_LANDED: 'crit_landed',
  DAMAGE_DEALT: 'damage_dealt',
  DAMAGE_TAKEN: 'damage_taken',
  BATTLE_WON: 'battle_won',
  FLUX_MOVE_USED: 'flux_move_used',
} as const;

export type MarcoProgressTriggerId = (typeof MarcoProgressTrigger)[keyof typeof MarcoProgressTrigger];

export type MarcoNodeProgressRule = {
  readonly nodeId: string;
  readonly trigger: MarcoProgressTriggerId;
  readonly xpPerEvent: number;
  readonly maxLevel: number;
};

/** Nível mínimo do nó pai para desbloquear o próximo nó da trilha. */
export const MARCO_UNLOCK_PARENT_LEVEL = 2;

/** Níveis 1–5 da habilidade Marco: ver `MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL` em marcoProgression.ts. */

const DEFAULT_RULES: Partial<Record<string, Omit<MarcoNodeProgressRule, 'nodeId'>>> = {
  quickStep: { trigger: MarcoProgressTrigger.FLUX_MOVE_USED, xpPerEvent: 12, maxLevel: MARCO_NODE_MAX_LEVEL },
  fluxRush: { trigger: MarcoProgressTrigger.FLUX_MOVE_USED, xpPerEvent: 14, maxLevel: MARCO_NODE_MAX_LEVEL },
  timelessStride: { trigger: MarcoProgressTrigger.FLUX_MOVE_USED, xpPerEvent: 16, maxLevel: MARCO_NODE_MAX_LEVEL },
  stableFlux: { trigger: MarcoProgressTrigger.BATTLE_WON, xpPerEvent: 20, maxLevel: MARCO_NODE_MAX_LEVEL },
  beyondTimeSteps: { trigger: MarcoProgressTrigger.BATTLE_WON, xpPerEvent: 25, maxLevel: MARCO_NODE_MAX_LEVEL },

  ironStance: { trigger: MarcoProgressTrigger.DAMAGE_TAKEN, xpPerEvent: 6, maxLevel: MARCO_NODE_MAX_LEVEL },
  bastionWill: { trigger: MarcoProgressTrigger.DAMAGE_TAKEN, xpPerEvent: 8, maxLevel: MARCO_NODE_MAX_LEVEL },
  enhancedBastion: { trigger: MarcoProgressTrigger.DAMAGE_TAKEN, xpPerEvent: 10, maxLevel: MARCO_NODE_MAX_LEVEL },
  totalResilience: { trigger: MarcoProgressTrigger.BATTLE_WON, xpPerEvent: 18, maxLevel: MARCO_NODE_MAX_LEVEL },
  invincibleBastion: { trigger: MarcoProgressTrigger.BATTLE_WON, xpPerEvent: 22, maxLevel: MARCO_NODE_MAX_LEVEL },

  keenEye: { trigger: MarcoProgressTrigger.CRIT_LANDED, xpPerEvent: 10, maxLevel: MARCO_NODE_MAX_LEVEL },
  lethalFocus: { trigger: MarcoProgressTrigger.CRIT_LANDED, xpPerEvent: 12, maxLevel: MARCO_NODE_MAX_LEVEL },
  lethalPrecision: { trigger: MarcoProgressTrigger.CRIT_LANDED, xpPerEvent: 14, maxLevel: MARCO_NODE_MAX_LEVEL },
  criticalFocus: { trigger: MarcoProgressTrigger.DAMAGE_DEALT, xpPerEvent: 8, maxLevel: MARCO_NODE_MAX_LEVEL },
  precisionMaster: { trigger: MarcoProgressTrigger.CRIT_LANDED, xpPerEvent: 18, maxLevel: MARCO_NODE_MAX_LEVEL },
};

export const MARCO_NODE_PROGRESS_RULES: readonly MarcoNodeProgressRule[] = MARCO_TREE_NODES.map((node) => {
  const rule = DEFAULT_RULES[node.id] ?? {
    trigger: MarcoProgressTrigger.BATTLE_WON,
    xpPerEvent: 10,
    maxLevel: MARCO_NODE_MAX_LEVEL,
  };
  return { nodeId: node.id, ...rule };
});

const RULE_BY_NODE = new Map(MARCO_NODE_PROGRESS_RULES.map((rule) => [rule.nodeId, rule]));

export function getMarcoNodeProgressRule(nodeId: string): MarcoNodeProgressRule | undefined {
  return RULE_BY_NODE.get(nodeId);
}

export function resolveMarcoNodesForTrigger(
  trigger: MarcoProgressTriggerId,
  activeMarcos: readonly string[],
): readonly MarcoNodeProgressRule[] {
  const active = new Set(activeMarcos);
  return MARCO_NODE_PROGRESS_RULES.filter(
    (rule) => rule.trigger === trigger && active.has(rule.nodeId),
  );
}

/** Limite anti-replay por intenção PROGRESS_MARCO (contagem agregada por batalha). */
export const MARCO_PROGRESS_MAX_EVENTS_PER_TRIGGER = 48;
