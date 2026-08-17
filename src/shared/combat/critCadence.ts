import { MoveEffectKind } from './classMovesetCatalog.js';

/** Piso do pico sem SET — hit 30 vira 43. */
export const CRIT_BASE_BONUS = 0.45;

/**
 * Pity elástico: primeiro hit após o “respiro” tem ~18%, sobe a cada miss,
 * estoura no 5º. Média perto de 1 em 4, sem ser sempre o 4º.
 */
export const CRIT_PITY_BASE_CHANCE = 0.18;
export const CRIT_PITY_PER_MISS = 0.22;
/** `misses >= 4` → 5º golpe ofensivo (depois do lockout) é garantia. */
export const CRIT_PITY_GUARANTEE_MISSES = 4;

export type CritCadenceState = {
  readonly misses: number;
  readonly lockout: boolean;
};

export type CritCadenceAdvanceInput = {
  readonly guaranteed: boolean;
  /** 0..1 — o motor injeta `Math.random()`. */
  readonly roll: number;
};

export function isSignatureCriticalSkill(skill: { readonly effectKind?: string }): boolean {
  return (
    skill.effectKind === MoveEffectKind.HighRiskBurst
    || skill.effectKind === MoveEffectKind.DebuffScalingDamage
  );
}

export function resolveCritPityChance(misses: number): number {
  const safe = Math.max(0, Math.floor(misses));
  if (safe >= CRIT_PITY_GUARANTEE_MISSES) return 1;
  return Math.min(1, CRIT_PITY_BASE_CHANCE + CRIT_PITY_PER_MISS * safe);
}

export function advanceCritCadence(
  prev: CritCadenceState | null,
  input: CritCadenceAdvanceInput,
): { readonly state: CritCadenceState; readonly isCritical: boolean } {
  if (input.guaranteed) {
    return { state: { misses: 0, lockout: true }, isCritical: true };
  }

  const cur = prev ?? { misses: 0, lockout: false };
  if (cur.lockout) {
    return { state: { misses: 0, lockout: false }, isCritical: false };
  }

  const chance = resolveCritPityChance(cur.misses);
  const roll = Math.min(1, Math.max(0, input.roll));
  if (roll < chance) {
    return { state: { misses: 0, lockout: true }, isCritical: true };
  }

  return {
    state: { misses: cur.misses + 1, lockout: false },
    isCritical: false,
  };
}

export function resolveCritHitMultiplier(input: {
  readonly critChancePercent: number;
  readonly critDamageBonus?: number;
  readonly tempCritPercent?: number;
  readonly runeCritBonus?: number;
}): number {
  const setCrit = Math.max(0, input.critChancePercent) / 100;
  const tempCrit = Math.max(0, input.tempCritPercent ?? 0) / 100;
  const rune = Math.max(0, input.runeCritBonus ?? 0);
  const marco = Math.max(0, input.critDamageBonus ?? 0);
  return 1 + CRIT_BASE_BONUS + setCrit + tempCrit + rune + marco;
}
