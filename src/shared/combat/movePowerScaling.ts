import type { Combatant } from '../types/combat.js';
import { countRuntimeDebuffs } from './runtimeStatusCatalog.js';

export function resolveStackingDamageMultiplier(
  consecutiveUses: number,
  stackBonusPerUse: number,
  stackCap: number,
): number {
  const stacks = Math.min(Math.max(1, stackCap), Math.max(1, consecutiveUses));
  return 1 + stackBonusPerUse * (stacks - 1);
}

/** @deprecated Alias — use countRuntimeDebuffs. */
export function countTargetDebuffsForScaling(combatant: Combatant, currentTurn?: number): number {
  return countRuntimeDebuffs(combatant, currentTurn);
}

export function resolveDebuffScalingMultiplier(
  debuffCount: number,
  debuffBonusPercent: number,
  debuffBonusCap: number,
): number {
  const stacks = Math.min(Math.max(0, debuffBonusCap), debuffCount);
  return 1 + (debuffBonusPercent / 100) * stacks;
}

export function resolveRetaliationBonusPercent(
  damageAccumulated: number,
  retaliationDamageStep: number,
  retaliationBonusCapPercent: number,
): number {
  const step = Math.max(1, retaliationDamageStep);
  const cap = Math.max(0, retaliationBonusCapPercent);
  return Math.min(cap, Math.floor(Math.max(0, damageAccumulated) / step));
}

/** Multiplicador de dano da Retribuição — +1% ATK a cada `step` de dano recebido (teto em `capPercent`). */
export function resolveRetaliationMultiplier(
  damageAccumulated: number,
  retaliationDamageStep: number,
  retaliationBonusCapPercent: number,
): number {
  return 1 + resolveRetaliationBonusPercent(
    damageAccumulated,
    retaliationDamageStep,
    retaliationBonusCapPercent,
  ) / 100;
}

export function resolveRetaliationMaxTrackedDamage(
  retaliationDamageStep: number,
  retaliationBonusCapPercent: number,
): number {
  return Math.max(1, retaliationDamageStep) * Math.max(0, retaliationBonusCapPercent);
}
