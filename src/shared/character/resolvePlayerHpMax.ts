import {
  resolveCombatLoadout,
  type CombatLoadoutResolveInput,
} from '../combat/combatLoadoutResolver.js';
import { computePlayerHpMax } from './playerVitals.js';

/** Máximo de HP do jogador — mesma fórmula que `buildCombatantFromLoadout`. */
export function resolvePlayerHpMaxFromLoadoutInput(input: CombatLoadoutResolveInput): number {
  const resolved = resolveCombatLoadout(input);
  return computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);
}
