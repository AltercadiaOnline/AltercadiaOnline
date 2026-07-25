import {
  resolveCombatLoadout,
  type CombatLoadoutResolveInput,
} from '../combat/combatLoadoutResolver.js';
import {
  resolvePlayerHpBonusBreakdownFromEquipped,
  type PlayerHpBonusBreakdown,
} from './playerHpBonusBreakdown.js';
import { computePlayerHpMax } from './playerVitals.js';

/** Máximo de HP do jogador — mesma fórmula que `buildCombatantFromLoadout`. */
export function resolvePlayerHpMaxFromLoadoutInput(input: CombatLoadoutResolveInput): number {
  const resolved = resolveCombatLoadout(input);
  return computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);
}

/** Breakdown % por peça — tooltip de vida (espelha o loadout de combate). */
export function resolvePlayerHpBonusBreakdownFromLoadoutInput(
  input: CombatLoadoutResolveInput,
): PlayerHpBonusBreakdown {
  return resolvePlayerHpBonusBreakdownFromEquipped(input.equipped);
}
