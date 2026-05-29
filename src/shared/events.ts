import type { Combatant, Skill } from './types.js';

export enum CombatEventType {
  BATTLE_START = 'BATTLE_START',
  /** Compat legado: espelho opcional de TURN_START para HUD antiga. */
  BATTLE_STATE_UPDATE = 'BATTLE_STATE_UPDATE',
  TURN_START = 'TURN_START',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  ACTION_ACCEPTED = 'ACTION_ACCEPTED',
  ACTION_REJECTED = 'ACTION_REJECTED',
  SKILL_CATALOG = 'SKILL_CATALOG',
  COMBAT_LOG = 'COMBAT_LOG',
  TURN_ORDER_RESOLVED = 'TURN_ORDER_RESOLVED',
  CONSUMABLE_USED = 'CONSUMABLE_USED',
  EXHAUSTION_APPLIED = 'EXHAUSTION_APPLIED',
  ELASTICITY_APPLIED = 'ELASTICITY_APPLIED',
  HEALING_DECAY_APPLIED = 'HEALING_DECAY_APPLIED',
  SUDDEN_DEATH_SCALING_APPLIED = 'SUDDEN_DEATH_SCALING_APPLIED',
}

export interface ActionRequest {
  readonly battleId: string;
  readonly actorId: string;
  readonly turn: number;
  readonly skillId: string | null;
  readonly requestId: string;
  readonly priorityHint?: 1 | 2 | 3;
  readonly consumableId?: string | null;
  readonly consumableHeal?: number;
}

export interface BattleStartEvent {
  readonly type: CombatEventType.BATTLE_START;
  readonly payload: {
    readonly battleId: string;
    readonly combatants: Readonly<Record<string, Combatant>>;
  };
}

export interface TurnUpdate {
  readonly battleId: string;
  readonly turn: number;
  readonly phase: 'CHOOSING' | 'RESOLVING' | 'ENDED';
  readonly activeActorId: string | null;
  readonly combatants: Readonly<Record<string, Combatant>>;
}

export interface TurnStartEvent {
  readonly type: CombatEventType.TURN_START;
  readonly payload: TurnUpdate;
}

export interface BattleStateUpdateEvent {
  readonly type: CombatEventType.BATTLE_STATE_UPDATE;
  readonly payload: TurnUpdate;
}

export interface DamageDealtEvent {
  readonly type: CombatEventType.DAMAGE_DEALT;
  readonly payload: {
    readonly battleId: string;
    readonly sourceId: string;
    readonly targetId: string;
    readonly amount: number;
    readonly hpAfter: number;
  };
}

export interface CombatLogEvent {
  readonly type: CombatEventType.COMBAT_LOG;
  readonly battleId: string;
  readonly line: string;
  readonly ts: number;
}

export interface ActionAcceptedEvent {
  readonly type: CombatEventType.ACTION_ACCEPTED;
  readonly payload: ActionRequest;
}

export interface ActionRejectedEvent {
  readonly type: CombatEventType.ACTION_REJECTED;
  readonly payload: ActionRequest & { readonly reason: string };
}

export interface SkillCatalogEvent {
  readonly type: CombatEventType.SKILL_CATALOG;
  readonly payload: {
    readonly actorId: string;
    readonly skills: readonly Skill[];
  };
}

export interface TurnOrderResolvedEvent {
  readonly type: CombatEventType.TURN_ORDER_RESOLVED;
  readonly payload: {
    readonly battleId: string;
    readonly turn: number;
    readonly order: readonly string[];
    readonly reason: 'INITIATIVE_SCORE' | 'PRIORITY' | 'EFFECTIVE_SPEED' | 'SEED';
    readonly debug: readonly {
      readonly actorId: string;
      readonly priority: number;
      readonly movesetPriorityScore: number;
      readonly speedBonusTotal: number;
      readonly initiativeScore: number;
      readonly effectiveSpeed: number;
      readonly tieBreakerSeed: number;
    }[];
  };
}

export interface ConsumableUsedEvent {
  readonly type: CombatEventType.CONSUMABLE_USED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly consumableId: string;
  };
}

export interface ExhaustionAppliedEvent {
  readonly type: CombatEventType.EXHAUSTION_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly speedPenalty: number;
    readonly healReceivedMultiplier: number;
    readonly expiresAtTurn: number;
  };
}

export interface ElasticityAppliedEvent {
  readonly type: CombatEventType.ELASTICITY_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly targetId: string;
    readonly hpRatioBefore: number;
    readonly damageMultiplier: number;
  };
}

export interface HealingDecayAppliedEvent {
  readonly type: CombatEventType.HEALING_DECAY_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly turn: number;
    readonly decayMultiplier: number;
  };
}

export interface SuddenDeathScalingAppliedEvent {
  readonly type: CombatEventType.SUDDEN_DEATH_SCALING_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly turn: number;
    readonly damageMultiplier: number;
  };
}

export type CombatEvent =
  | BattleStartEvent
  | BattleStateUpdateEvent
  | TurnStartEvent
  | DamageDealtEvent
  | ActionAcceptedEvent
  | ActionRejectedEvent
  | CombatLogEvent
  | SkillCatalogEvent
  | TurnOrderResolvedEvent
  | ConsumableUsedEvent
  | ExhaustionAppliedEvent
  | ElasticityAppliedEvent
  | HealingDecayAppliedEvent
  | SuddenDeathScalingAppliedEvent;
