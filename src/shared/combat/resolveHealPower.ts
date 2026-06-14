import { CLASS_CATALOG, type ClassType } from '../types/classes.js';
import type { Combatant, SkillData } from '../types/combat.js';
import { MoveScalingStat } from './moveTypes.js';
import { resolveMoveCombatMeta } from './resolveMoveCombatMeta.js';

function resolveClassStatForScaling(combatant: Combatant, scalingStat: string): number {
  const classId = (combatant.classId ?? 'IMPETUS') as ClassType;
  const bonus = CLASS_CATALOG[classId]?.bonus;
  if (!bonus) return 0;
  switch (scalingStat) {
    case MoveScalingStat.STR:
      return bonus.attack;
    case MoveScalingStat.DEF:
      return bonus.defense;
    case MoveScalingStat.AGI:
      return bonus.agility;
    case MoveScalingStat.CRIT:
      return bonus.control;
    default:
      return 0;
  }
}

/** Cura base escalada pelo stat do move (`healScalingPercent` do catálogo). */
export function resolveHealPower(actor: Combatant, skill: SkillData): number {
  const base = skill.basePower ?? skill.damage ?? 0;
  if (base <= 0) return 0;

  const meta = resolveMoveCombatMeta(skill.id);
  const healScalingPercent = skill.effectParams?.healScalingPercent ?? 100;
  const statValue = meta ? resolveClassStatForScaling(actor, meta.scalingStat) : 0;
  const scaled = base * (1 + statValue / 100) * (healScalingPercent / 100);
  return Math.max(0, Math.floor(scaled));
}

export function resolveBonusHealAmount(
  baseHeal: number,
  bonusHealPercent: number,
): number {
  return Math.max(0, Math.floor(baseHeal * (1 + bonusHealPercent / 100)));
}
