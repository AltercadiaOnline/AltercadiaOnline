export interface SkillData {
  readonly id: string;
  readonly name: string;
  readonly damage: number;
  readonly cooldown: number;
  readonly priority?: 1 | 2 | 3;
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

export type CombatClassId = 'IMPETUS' | 'COGITOR' | 'TUTATOR' | 'DISSOLUTUS';

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
}

export interface CombatState {
  readonly battleId: string;
  readonly turn: number;
  readonly phase: 'IDLE' | 'CHOOSING' | 'RESOLVING' | 'ENDED';
  readonly combatants: Readonly<Record<string, Combatant>>;
  readonly activeActorId: string | null;
}
