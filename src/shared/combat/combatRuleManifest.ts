import { getRuneDefinition } from '../items/runesBooksCatalog.js';
import type { RuneCombatEffect } from '../items/itemTypes.js';

export type CombatRuleEntry = {
  effectType: 'CRIT_BONUS' | 'REFLECT_DMG' | 'SPEED_NEXT_TURN';
  value: number;
  trigger: 'IMPACT' | 'BLOCK' | 'DASH';
  source: 'rune' | 'equip';
  charges?: number;
};

export type CombatRuleManifest = readonly CombatRuleEntry[];

export function buildRuneManifest(equippedRuneId: string | null, charges: number): CombatRuleManifest {
  if (!equippedRuneId || charges <= 0) return [];

  const rune = getRuneDefinition(equippedRuneId);
  if (!rune) return [];

  const effect: RuneCombatEffect = rune.combatEffect;
  return [{
    effectType: effect.type,
    value: effect.value,
    trigger: effect.trigger,
    source: 'rune',
    charges,
  }];
}
