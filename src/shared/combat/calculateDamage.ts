import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import {
  buildAttackBreakdown,
  buildDefenseBreakdown,
  resolveClassAttack,
  resolveClassDefense,
  sumAttackBreakdownTotal,
  sumDefenseBreakdownTotal,
} from './combatBreakdownBuilder.js';
import { MoveEffectKind } from './classMovesetCatalog.js';
import { MoveCategory } from './moveTypes.js';
import { resolveMoveCombatMeta } from './resolveMoveCombatMeta.js';
import { CLASS_CATALOG, type ClassType } from '../types/classes.js';
import type { Combatant, RuntimeStatus } from '../types/combat.js';
import { RuntimeModifierKind } from '../types/combat.js';
import {
  getMonsterByActorId,
  MonsterSpecialAbilityId,
  type MonsterCatalogEntry,
} from './MonsterCatalog.js';
import { vulnerableDamageMultiplierFromStatuses, resolveModifierPercentFromCombatant } from './runtimeStatusCatalog.js';

export const MIN_BATTLE_DAMAGE = 1;

export type BattleMove = {
  readonly id: string;
  readonly power: number;
  readonly name?: string;
};

export type DamageCalculationContext = {
  readonly turn?: number;
  readonly defenderActiveStatuses?: readonly RuntimeStatus[];
  readonly defenderMonster?: MonsterCatalogEntry | null;
  readonly isPhysical?: boolean;
  readonly behaviorMultiplier?: number;
  readonly forceCritical?: boolean;
  /** Bônus aditivo à chance de crítico (0–1) — ex.: runa CRIT_BONUS neste golpe. */
  readonly runeCritBonus?: number;
};

export type DamageCalculationResult = {
  readonly rawDamage: number;
  readonly finalDamage: number;
  readonly blocked: boolean;
  readonly isCritical: boolean;
  readonly logLines: readonly string[];
  readonly attackBreakdown: CombatActionBreakdown;
  readonly defenseBreakdown: CombatActionBreakdown;
};

export function isPhysicalMove(moveId: string): boolean {
  const meta = resolveMoveCombatMeta(moveId);
  if (!meta) return true;
  if (meta.category === MoveCategory.Defense || meta.category === MoveCategory.Support) {
    return false;
  }
  if (meta.category === MoveCategory.Utility) {
    return meta.basePower > 0;
  }
  return meta.category === MoveCategory.Attack;
}

export function resolveCombatantAttack(
  combatant: Combatant,
  monster?: MonsterCatalogEntry | null,
): number {
  const classId = (combatant.classId ?? monster?.classId ?? 'IMPETUS') as ClassType;
  return CLASS_CATALOG[classId]?.bonus.attack ?? 5;
}

export function resolveCombatantDefense(
  combatant: Combatant,
  monster?: MonsterCatalogEntry | null,
): number {
  const classId = (combatant.classId ?? monster?.classId ?? 'TUTATOR') as ClassType;
  const base = CLASS_CATALOG[classId]?.bonus.defense ?? 2;
  const defensePercent = combatant.combatStats?.defensePercent ?? 0;
  return base + Math.floor(base * defensePercent / 100);
}

export function resolveMovePower(moveId: string, attacker: Combatant): number {
  const fromMeta = resolveMoveCombatMeta(moveId)?.basePower;
  if (fromMeta !== undefined) return fromMeta;
  const fromSkill = attacker.skills.find((skill) => skill.id === moveId);
  return fromSkill?.basePower ?? fromSkill?.damage ?? 0;
}

export function resolveMoveName(moveId: string, attacker: Combatant): string {
  return (
    resolveMoveCombatMeta(moveId)?.name
    ?? attacker.skills.find((skill) => skill.id === moveId)?.name
    ?? moveId
  );
}

export function normalizeBattleMove(
  move: BattleMove | string,
  attacker: Combatant,
): BattleMove & { readonly name: string } {
  if (typeof move === 'string') {
    return {
      id: move,
      power: resolveMovePower(move, attacker),
      name: resolveMoveName(move, attacker),
    };
  }
  return {
    id: move.id,
    power: move.power ?? resolveMovePower(move.id, attacker),
    name: move.name ?? resolveMoveName(move.id, attacker),
  };
}

/**
 * Fórmula central de dano — toda alteração de HP por golpe deve derivar daqui
 * (via CombatEngine.applyDirectDamage).
 */
export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  move: BattleMove | string,
  ctx: DamageCalculationContext = {},
): DamageCalculationResult {
  const normalized = normalizeBattleMove(move, attacker);
  const moveId = normalized.id;
  const defenderMonster = ctx.defenderMonster ?? getMonsterByActorId(defender.id) ?? null;
  const attackBreakdown = buildAttackBreakdown(attacker, normalized.power);
  const defenseBreakdown = buildDefenseBreakdown(defender, defenderMonster);
  const isPhysical = ctx.isPhysical ?? isPhysicalMove(moveId);
  const logLines: string[] = [];

  const withBreakdown = (
    result: Omit<DamageCalculationResult, 'attackBreakdown' | 'defenseBreakdown'>,
  ): DamageCalculationResult => ({
    ...result,
    attackBreakdown,
    defenseBreakdown,
  });

  const turn = ctx.turn ?? 1;

  if (
    defenderMonster?.specialAbility?.id === MonsterSpecialAbilityId.PhaseShift
    && isPhysical
    && turn % 2 === 1
  ) {
    return withBreakdown({
      rawDamage: 0,
      finalDamage: 0,
      blocked: true,
      isCritical: false,
      logLines: [`${defender.name} está intangível (turno ímpar) — dano físico ignorado!`],
    });
  }

  let raw = sumAttackBreakdownTotal(attackBreakdown) - sumDefenseBreakdownTotal(defenseBreakdown);

  console.debug('[damageCalculation]', {
    attackerId: attacker.id,
    defenderId: defender.id,
    moveId,
    classAttack: resolveClassAttack(attacker),
    classDefense: resolveClassDefense(defender, defenderMonster),
    movePower: normalized.power,
    attackTotal: sumAttackBreakdownTotal(attackBreakdown),
    defenseTotal: sumDefenseBreakdownTotal(defenseBreakdown),
    rawAfterDefense: raw,
    attackArmorPercent: attacker.combatStatSources?.attackArmorPercent ?? 0,
    defenseArmorPercent: defender.combatStatSources?.defenseArmorPercent ?? 0,
    attackRunePercent: attacker.combatStatSources?.attackRunePercent ?? 0,
    defenseRunePercent: defender.combatStatSources?.defenseRunePercent ?? 0,
    attackBookPercent: attacker.combatStatSources?.attackBookPercent ?? 0,
    defenseBookPercent: defender.combatStatSources?.defenseBookPercent ?? 0,
  });

  const statusMult = vulnerableDamageMultiplierFromStatuses(ctx.defenderActiveStatuses ?? [], turn);
  if (statusMult > 1) {
    raw = Math.floor(raw * statusMult);
    logLines.push(`${defender.name} está vulnerável (+20%)!`);
  }

  if (ctx.behaviorMultiplier !== undefined && ctx.behaviorMultiplier !== 1) {
    raw = Math.floor(raw * ctx.behaviorMultiplier);
    if (ctx.behaviorMultiplier === 0) {
      return withBreakdown({
        rawDamage: 0,
        finalDamage: 0,
        blocked: true,
        isCritical: false,
        logLines,
      });
    }
  }

  if (raw <= 0) {
    return withBreakdown({
      rawDamage: raw,
      finalDamage: MIN_BATTLE_DAMAGE,
      blocked: false,
      isCritical: false,
      logLines,
    });
  }

  const dodgePercent = defender.combatStats?.dodgePercent ?? 0;
  if (dodgePercent > 0 && Math.random() * 100 < dodgePercent) {
    return withBreakdown({
      rawDamage: 0,
      finalDamage: 0,
      blocked: true,
      isCritical: false,
      logLines: [`${defender.name} esquivou o golpe!`],
    });
  }

  const tempCritPercent = resolveModifierPercentFromCombatant(attacker, RuntimeModifierKind.CritChance, turn);
  const critChance =
    (attacker.combatStats?.critChanceBonus ?? 0)
    + (ctx.runeCritBonus ?? 0)
    + tempCritPercent / 100;
  const skill = attacker.skills.find((s) => s.id === moveId);
  const forceCritMove =
    skill?.effectKind === MoveEffectKind.HighRiskBurst
    || skill?.effectKind === MoveEffectKind.DebuffScalingDamage;

  const isCritical =
    ctx.forceCritical === true
    || forceCritMove
    || (critChance > 0 && Math.random() < critChance);

  if (isCritical) {
    const critMultiplier = 1.5 + (attacker.combatStats?.critDamageBonus ?? 0);
    raw = Math.floor(raw * critMultiplier);
    logLines.push('Acerto crítico!');
  }

  return withBreakdown({
    rawDamage: raw,
    finalDamage: Math.max(MIN_BATTLE_DAMAGE, raw),
    blocked: false,
    isCritical,
    logLines,
  });
}
