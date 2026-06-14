import type { PetKindId } from '../pet/petCatalog.js';
import type { PetColorId } from '../pet/petColorPalette.js';
import type { PetGenderId } from '../pet/petGender.js';
import type { BattleType } from '../combat/battleType.js';
import type {
  MoveEffectKind,
  MoveTarget,
} from '../combat/classMovesetCatalog.js';
import type { MoveCategory, MoveScalingStat } from '../combat/moveTypes.js';
import type { BuffPercentByType } from '../combat/combatBuffSnapshot.js';
import type { GridCell } from '../combat/battleGridConstants.js';

/** Modificadores temporários — única fonte de verdade para o runtime do CombatEngine. */
export const RuntimeModifierKind = {
  Attack: 'ATTACK',
  Defense: 'DEFENSE',
  Heal: 'HEAL',
  BuffWeaken: 'BUFF_WEAKEN',
  IncomingDamageReduction: 'INCOMING_DAMAGE_REDUCTION',
  CritChance: 'CRIT_CHANCE',
} as const;

export type RuntimeModifierKind =
  (typeof RuntimeModifierKind)[keyof typeof RuntimeModifierKind];

/** Status runtime aplicados via CombatEngine.activeStatuses. */
export const RuntimeStatusId = {
  Burn: 'BURN',
  Paralyze: 'PARALYZE',
  Confuse: 'CONFUSE',
  DelayedDetonation: 'DELAYED_DETONATION',
  MovesetWeaken: 'MOVESET_WEAKEN',
  LockEnemyMoves: 'LOCK_ENEMY_MOVES',
  RetaliationCharge: 'RETALIATION_CHARGE',
  HealEcho: 'HEAL_ECHO',
  AttackEcho: 'ATTACK_ECHO',
  StatusImmunity: 'STATUS_IMMUNITY',
  Thorns: 'THORNS',
  MarcoCcImmune: 'MARCO_CC_IMMUNE',
  Vulnerable: 'VULNERABLE',
} as const;

export type RuntimeStatusId = (typeof RuntimeStatusId)[keyof typeof RuntimeStatusId];

/** Escudos runtime — absorvem dano em applyDirectDamage. */
export const RuntimeShieldId = {
  SelfShield: 'SELF_SHIELD',
  GroupShield: 'GROUP_SHIELD',
} as const;

export type RuntimeShieldId = (typeof RuntimeShieldId)[keyof typeof RuntimeShieldId];

export interface SkillData {
  readonly id: string;
  readonly name: string;
  readonly damage: number;
  readonly cooldown: number;
  readonly basePower?: number;
  readonly target?: MoveTarget;
  readonly category?: MoveCategory;
  readonly scalingStat?: MoveScalingStat;
  readonly effectKind?: MoveEffectKind;
  readonly effectParams?: Readonly<Record<string, number>>;
  readonly priority?: 1 | 2 | 3;
  readonly ppCurrent?: number;
  readonly ppMax?: number;
  readonly cooldownTurnsRemaining?: number;
}

export type Skill = SkillData;

export interface CombatantSpeedProfile {
  readonly flowSpeedBase: number;
  readonly classSpeedBias?: number;
  readonly marcoSpeedFlat?: number;
  readonly activeMarcos?: readonly string[];
  readonly equipSpeedFlat?: number;
  readonly buffSpeedFlat?: number;
  readonly runeSpeedFlatConditional?: number;
  readonly potionExhaustionPenalty?: number;
}

export type RuneInstanceSnapshot = {
  readonly runeId: string;
  readonly chargesRemaining: number;
  readonly maxCharges: number;
  readonly combatEffect: {
    readonly type: 'CRIT_BONUS' | 'REFLECT_DMG' | 'SPEED_NEXT_TURN';
    readonly value: number;
    readonly trigger: 'IMPACT' | 'BLOCK' | 'DASH';
  };
};

export type ActiveConsumableStack = {
  readonly itemId: string;
  readonly quantity: number;
};

export type CombatantCombatStats = {
  readonly critChanceBonus?: number;
  readonly critDamageBonus?: number;
  readonly defensePercent?: number;
  readonly attackPercent?: number;
  readonly dodgePercent?: number;
  readonly damageReductionPercent?: number;
};

export type MarcoCombatFlags = {
  readonly beyondTimeStepsCharges?: number;
  readonly precisionMasterReady?: boolean;
  readonly invincibleBastionEnabled?: boolean;
  readonly stableFluxExhaustionReductionPercent?: number;
};

export type CombatStatSources = {
  readonly attackRunePercent: number;
  readonly attackBookPercent: number;
  readonly attackArmorPercent: number;
  readonly equipByBuff?: BuffPercentByType;
  readonly amuletByBuff?: BuffPercentByType;
  readonly ringByBuff?: BuffPercentByType;
  readonly bookByBuff?: BuffPercentByType;
  readonly runeByBuff?: BuffPercentByType;
  readonly attackMarcosFlat: number;
  readonly attackMarcosPercent: number;
  readonly defenseArmorPercent: number;
  readonly defenseRunePercent: number;
  readonly defenseBookPercent: number;
  readonly defenseMarcosFlat: number;
  readonly defenseMarcosPercent: number;
  readonly marcoCritPercent: number;
  readonly marcoDodgePercent: number;
  readonly marcoDamageReductionPercent: number;
};

export type CombatClassId = 'IMPETUS' | 'COGITOR' | 'TUTATOR' | 'DISSOLUTUS';

export type CombatRole = 'PLAYER' | 'PET' | 'ENEMY';

export type PetCombatStatus = 'ACTIVE' | 'INACTIVE';

export type RuntimeStatus = {
  readonly id: string;
  readonly name: string;
  /** Duração total em turnos do portador (não decrementa — ver `appliedAtTurn`). */
  readonly turnsRemaining: number;
  /** Turno global em que o efeito foi aplicado — default 0 em snapshots legados. */
  readonly appliedAtTurn?: number;
  readonly stacks: number;
  readonly sourceSkillId?: string;
  readonly sourceActorId?: string;
  readonly metadata?: Readonly<Record<string, number>>;
};

export type RuntimeShield = {
  readonly id: string;
  readonly name: string;
  readonly value: number;
  readonly turnsRemaining: number;
  readonly appliedAtTurn?: number;
};

export type RuntimeModifier = {
  readonly kind: RuntimeModifierKind;
  readonly percent: number;
  readonly turnsRemaining: number;
  readonly appliedAtTurn?: number;
};

export interface Combatant {
  readonly id: string;
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly skills: readonly SkillData[];
  readonly speedProfile?: CombatantSpeedProfile;
  readonly classId?: CombatClassId;
  readonly hpCurrent?: number;
  readonly hpMax?: number;
  readonly combatRole?: CombatRole;
  readonly ownerPlayerId?: string;
  readonly petStatus?: PetCombatStatus;
  readonly petKindId?: PetKindId;
  readonly petColorId?: PetColorId;
  readonly petGenderId?: PetGenderId;
  /** Resumo legível para HUD — derivado de activeStatuses. */
  readonly statusEffects?: readonly string[];
  readonly activeStatuses?: readonly RuntimeStatus[];
  readonly activeShields?: readonly RuntimeShield[];
  readonly temporaryModifiers?: readonly RuntimeModifier[];
  readonly lockedSkillIds?: readonly string[];
  readonly lastSkillUsedId?: string;
  readonly runeInstance?: RuneInstanceSnapshot;
  readonly activeConsumables?: readonly ActiveConsumableStack[];
  readonly potionSaturationPercent?: number;
  readonly potionUsesInBattle?: number;
  readonly combatStats?: CombatantCombatStats;
  readonly combatStatSources?: CombatStatSources;
  readonly marcoCombatFlags?: MarcoCombatFlags;
}

export interface CombatState {
  readonly battleId: string;
  readonly turn: number;
  readonly phase: 'IDLE' | 'CHOOSING' | 'RESOLVING' | 'ENDED';
  readonly combatants: Readonly<Record<string, Combatant>>;
  readonly activeActorId: string | null;
  readonly battleType?: BattleType;
  readonly alliancePlayerTurnsSincePet?: number;
  readonly petAssistCycleIndex?: number;
  readonly battleWinnerId?: string | null;
}

/** Intenção de ação validada pelo CombatEngine — única entrada de turno. */
export interface ActionRequest {
  readonly battleId: string;
  readonly actorId: string;
  readonly turn: number;
  readonly skillId: string | null;
  readonly requestId: string;
  readonly priorityHint?: 1 | 2 | 3;
  readonly consumableId?: string | null;
  readonly consumableHeal?: number;
  readonly runeCritBonus?: number;
  readonly runeReflectRatio?: number;
  readonly targetTile?: GridCell;
  /** Alvo de suporte (ex.: TUT_3 cura em aliado/pet). */
  readonly targetId?: string;
}
