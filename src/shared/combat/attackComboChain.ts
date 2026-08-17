import { MoveEffectKind } from './classMovesetCatalog.js';
import { MoveCategory } from './moveTypes.js';

/** 2º golpe distinto no mesmo alvo — troca de move na cadeia. */
export const ATTACK_COMBO_SECOND_MULTIPLIER = 1.18;
/** 3º+ golpe distinto consecutivo no mesmo alvo. */
export const ATTACK_COMBO_THIRD_MULTIPLIER = 1.32;

/** 2ª vez o mesmo golpe ofensivo no mesmo alvo. */
export const ATTACK_MASH_SECOND_MULTIPLIER = 0.85;
/** 3ª+ vez o mesmo golpe ofensivo no mesmo alvo. */
export const ATTACK_MASH_THIRD_MULTIPLIER = 0.72;

export type AttackComboState = {
  readonly lastMoveId: string;
  readonly lastTargetId: string;
  readonly distinctStreak: number;
  readonly sameMoveStreak: number;
};

export type ComboSkillInput = {
  readonly id: string;
  readonly category?: string;
  readonly effectKind?: string;
  readonly damage?: number;
  readonly basePower?: number;
};

export function isComboAttackSkill(skill: ComboSkillInput): boolean {
  const kind = skill.effectKind;
  if (
    kind === MoveEffectKind.Heal
    || kind === MoveEffectKind.SelfShield
    || kind === MoveEffectKind.GroupShield
    || kind === MoveEffectKind.StatusImmunity
  ) {
    return false;
  }
  if (skill.category === MoveCategory.Defense) return false;
  if (skill.category === MoveCategory.Attack) return true;
  const power = skill.basePower ?? skill.damage ?? 0;
  return power > 0;
}

export function resolveAttackComboMultiplier(distinctStreak: number): number {
  if (distinctStreak >= 3) return ATTACK_COMBO_THIRD_MULTIPLIER;
  if (distinctStreak === 2) return ATTACK_COMBO_SECOND_MULTIPLIER;
  return 1;
}

export function resolveAttackMashMultiplier(sameMoveStreak: number): number {
  if (sameMoveStreak >= 3) return ATTACK_MASH_THIRD_MULTIPLIER;
  if (sameMoveStreak === 2) return ATTACK_MASH_SECOND_MULTIPLIER;
  return 1;
}

export function advanceAttackComboChain(
  prev: AttackComboState | null,
  input: {
    readonly moveId: string;
    readonly targetId: string;
    readonly countsAsComboAttack: boolean;
  },
): { readonly state: AttackComboState | null; readonly multiplier: number } {
  if (!input.countsAsComboAttack) {
    return { state: null, multiplier: 1 };
  }

  const sameTarget = Boolean(prev && prev.lastTargetId === input.targetId);
  const sameMove = Boolean(prev && prev.lastMoveId === input.moveId);

  if (sameTarget && sameMove && prev) {
    const sameMoveStreak = Math.min(3, prev.sameMoveStreak + 1);
    return {
      state: {
        lastMoveId: input.moveId,
        lastTargetId: input.targetId,
        distinctStreak: 1,
        sameMoveStreak,
      },
      multiplier: resolveAttackMashMultiplier(sameMoveStreak),
    };
  }

  const distinctStreak = sameTarget && prev
    ? Math.min(3, prev.distinctStreak + 1)
    : 1;
  return {
    state: {
      lastMoveId: input.moveId,
      lastTargetId: input.targetId,
      distinctStreak,
      sameMoveStreak: 1,
    },
    multiplier: resolveAttackComboMultiplier(distinctStreak),
  };
}
