import { CLASS_CATALOG, type ClassType } from '../types/classes.js';
import type { Combatant, SkillData } from '../types/combat.js';
import { MoveScalingStat } from './moveTypes.js';
import { resolveMoveCombatMeta } from './resolveMoveCombatMeta.js';
import { resolveCombatantGearBuffs } from './itemBuffCombat.js';

function resolveClassStatForScaling(combatant: Combatant, scalingStat: string): number {
  const classId = (combatant.classId ?? 'IMPETUS') as ClassType;
  const bonus = CLASS_CATALOG[classId]?.bonus;
  if (!bonus) return 0;
  const gear = resolveCombatantGearBuffs(combatant);
  let base = 0;
  let percent = 0;
  switch (scalingStat) {
    case MoveScalingStat.STR:
      base = bonus.attack;
      percent = gear.strengthPercent;
      break;
    case MoveScalingStat.DEF:
      base = bonus.defense;
      percent = gear.defensePercent;
      break;
    case MoveScalingStat.AGI:
      base = bonus.agility;
      percent = gear.agilityPercent;
      break;
    case MoveScalingStat.CRIT:
      base = bonus.control;
      percent = gear.critChancePercent;
      break;
    default:
      return 0;
  }
  return base + Math.floor(base * percent / 100);
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
