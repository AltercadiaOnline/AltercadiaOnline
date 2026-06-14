import type { CombatActionBreakdown } from './combat/combatActionBreakdown.js';
import type { ActionRequest, Combatant, Skill } from './types.js';

export type { ActionRequest };

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
  RUNE_TRIGGERED = 'RUNE_TRIGGERED',
  PET_STATUS_CHANGED = 'PET_STATUS_CHANGED',
  PET_TURN_SKIPPED = 'PET_TURN_SKIPPED',
  SKILL_USED = 'SKILL_USED',
  HEAL_APPLIED = 'HEAL_APPLIED',
  STATUS_APPLIED = 'STATUS_APPLIED',
  /** Evento unificado para UI: aplicação, renovação, tick, skip ou expiração de status. */
  STATUS_EVENT = 'STATUS_EVENT',
  STATUS_EXPIRED = 'STATUS_EXPIRED',
  SHIELD_APPLIED = 'SHIELD_APPLIED',
  PP_CHANGED = 'PP_CHANGED',
  COOLDOWN_UPDATED = 'COOLDOWN_UPDATED',
  TURN_RESOLVED = 'TURN_RESOLVED',
  /** Fim de batalha com recompensas autoritativas (loot pendente + XP). */
  COMBAT_FINISHED = 'COMBAT_FINISHED',
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
    readonly isCritical?: boolean;
    readonly attackBreakdown?: CombatActionBreakdown;
    readonly defenseBreakdown?: CombatActionBreakdown;
    /** Move que originou o golpe — exibido no impacto visual da arena. */
    readonly skillId?: string;
    readonly skillName?: string;
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
    readonly reason: 'INITIATIVE_SCORE' | 'PRIORITY' | 'EFFECTIVE_SPEED' | 'SPEED_ATTRIBUTE' | 'SEED' | 'PET_QUEUE';
    readonly debug: readonly {
      readonly actorId: string;
      readonly priority: number;
      readonly movesetPriorityScore: number;
      readonly speedBonusTotal: number;
      readonly speedAttributeContribution: number;
      readonly initiativeScore: number;
      readonly effectiveSpeed: number;
      readonly tieBreakerSeed: number;
      /** Decomposição de velocidade de turno (agilidade = velocidade). */
      readonly speedSumEquation?: string;
      readonly speedBuildRoster?: string;
      readonly initiativeLine?: string;
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

export interface RuneTriggeredEvent {
  readonly type: CombatEventType.RUNE_TRIGGERED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly runeId: string;
    readonly trigger: 'IMPACT' | 'BLOCK' | 'DASH';
    readonly chargesLeft: number;
  };
}

export interface PetStatusChangedEvent {
  readonly type: CombatEventType.PET_STATUS_CHANGED;
  readonly payload: {
    readonly battleId: string;
    readonly petActorId: string;
    readonly ownerPlayerId: string;
    readonly status: 'ACTIVE' | 'INACTIVE';
    readonly hpCurrent: number;
    readonly hpMax: number;
  };
}

export interface PetTurnSkippedEvent {
  readonly type: CombatEventType.PET_TURN_SKIPPED;
  readonly payload: {
    readonly battleId: string;
    readonly petActorId: string;
    readonly turn: number;
    readonly reason: 'INACTIVE' | 'ZERO_HP';
  };
}

export interface SkillUsedEvent {
  readonly type: CombatEventType.SKILL_USED;
  readonly payload: {
    readonly battleId: string;
    readonly turn: number;
    readonly actorId: string;
    readonly skillId: string;
    readonly targetId?: string;
  };
}

export interface HealAppliedEvent {
  readonly type: CombatEventType.HEAL_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly targetId: string;
    readonly amount: number;
    readonly hpAfter: number;
    readonly sourceSkillId?: string;
  };
}

export interface StatusAppliedEvent {
  readonly type: CombatEventType.STATUS_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly targetId: string;
    readonly statusId: string;
    readonly statusName: string;
    readonly turnsRemaining: number;
    readonly stacks: number;
    readonly appliedAtTurn: number;
  };
}

export interface StatusExpiredEvent {
  readonly type: CombatEventType.STATUS_EXPIRED;
  readonly payload: {
    readonly battleId: string;
    readonly targetId: string;
    readonly statusId: string;
  };
}

export type StatusEventPhase = 'applied' | 'renewed' | 'tick' | 'skip' | 'expired';

export interface StatusEvent {
  readonly type: CombatEventType.STATUS_EVENT;
  readonly payload: {
    readonly battleId: string;
    readonly targetId: string;
    readonly statusId: string;
    readonly message: string;
    readonly phase: StatusEventPhase;
    readonly amount?: number;
  };
}

export interface ShieldAppliedEvent {
  readonly type: CombatEventType.SHIELD_APPLIED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly shieldId: string;
    readonly value: number;
    readonly turnsRemaining: number;
  };
}

export interface PpChangedEvent {
  readonly type: CombatEventType.PP_CHANGED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly skillId: string;
    readonly ppCurrent: number;
    readonly ppMax: number;
  };
}

export interface CooldownUpdatedEvent {
  readonly type: CombatEventType.COOLDOWN_UPDATED;
  readonly payload: {
    readonly battleId: string;
    readonly actorId: string;
    readonly skillId: string;
    readonly cooldownTurnsRemaining: number;
  };
}

export interface TurnResolvedEvent {
  readonly type: CombatEventType.TURN_RESOLVED;
  readonly payload: {
    readonly battleId: string;
    readonly turn: number;
    readonly phase: 'CHOOSING' | 'RESOLVING' | 'ENDED';
    readonly activeActorId: string | null;
  };
}

export interface CombatFinishedEvent {
  readonly type: CombatEventType.COMBAT_FINISHED;
  readonly payload: import('./combat/combatFinished.js').CombatFinishedPayload;
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
  | SuddenDeathScalingAppliedEvent
  | RuneTriggeredEvent
  | PetStatusChangedEvent
  | PetTurnSkippedEvent
  | SkillUsedEvent
  | HealAppliedEvent
  | StatusAppliedEvent
  | StatusEvent
  | StatusExpiredEvent
  | ShieldAppliedEvent
  | PpChangedEvent
  | CooldownUpdatedEvent
  | TurnResolvedEvent
  | CombatFinishedEvent;
