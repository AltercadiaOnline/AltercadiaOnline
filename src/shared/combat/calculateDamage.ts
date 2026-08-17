import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import {
  buildAttackBreakdown,
  buildDefenseBreakdown,
  resolveClassAttack,
  resolveClassDefense,
  sumAttackBreakdownTotal,
  sumDefenseBreakdownTotal,
} from './combatBreakdownBuilder.js';
import { MoveCategory } from './moveTypes.js';
import { resolveMoveCombatMeta } from './resolveMoveCombatMeta.js';
import { resolveCombatantGearBuffs } from './itemBuffCombat.js';
import type { Combatant, RuntimeStatus } from '../types/combat.js';
import { RuntimeModifierKind } from '../types/combat.js';
import {
  getMonsterByActorId,
  MonsterSpecialAbilityId,
  type MonsterCatalogEntry,
} from './MonsterCatalog.js';
import { vulnerableDamageMultiplierFromStatuses, resolveModifierPercentFromCombatant } from './runtimeStatusCatalog.js';
import { resolveCritHitMultiplier } from './critCadence.js';

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
  /** Motor decide o pico (pity / assinatura / marco). Sem dado local. */
  readonly forceCritical?: boolean;
  /** Bônus aditivo ao pico do crítico (0–1) — runa CRIT_BONUS neste golpe. */
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
  readonly vulnerableApplied?: boolean;
  readonly minDamageFloorApplied?: boolean;
  /** +N% do pico de crítico (espelho HUD). */
  readonly critBonusPercent?: number;
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
  return resolveClassAttack(combatant, monster);
}

export function resolveCombatantDefense(
  combatant: Combatant,
  monster?: MonsterCatalogEntry | null,
): number {
  return resolveClassDefense(combatant, monster);
}

export function resolveMovePower(moveId: string, attacker: Combatant): number {
  const fromSkill = attacker.skills.find((skill) => skill.id === moveId);
  const skillPower = fromSkill?.basePower ?? fromSkill?.damage;
  if (skillPower !== undefined && skillPower > 0) return skillPower;
  return resolveMoveCombatMeta(moveId)?.basePower ?? 0;
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
  const attackerMonster = getMonsterByActorId(attacker.id) ?? null;
  const defenderMonster = ctx.defenderMonster ?? getMonsterByActorId(defender.id) ?? null;
  const attackBreakdown = buildAttackBreakdown(
    attacker,
    normalized.power,
    attackerMonster,
    resolveMoveCombatMeta(moveId)?.scalingStat,
  );
  const incomingStrike = sumAttackBreakdownTotal(attackBreakdown);
  const defenseBreakdown = buildDefenseBreakdown(defender, defenderMonster, incomingStrike);
  const isPhysical = ctx.isPhysical ?? isPhysicalMove(moveId);
  const logLines: string[] = [];

  const withBreakdown = (
    result: Omit<DamageCalculationResult, 'attackBreakdown' | 'defenseBreakdown' | 'vulnerableApplied' | 'minDamageFloorApplied'>,
    extra?: Pick<DamageCalculationResult, 'minDamageFloorApplied'>,
  ): DamageCalculationResult => ({
    ...result,
    attackBreakdown,
    defenseBreakdown,
    ...(vulnerableApplied ? { vulnerableApplied: true } : {}),
    ...(extra?.minDamageFloorApplied ? { minDamageFloorApplied: true } : {}),
  });

  const turn = ctx.turn ?? 1;

  let vulnerableApplied = false;

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
    vulnerableApplied = true;
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
    }, { minDamageFloorApplied: true });
  }

  const gear = resolveCombatantGearBuffs(defender);
  const dodgePercent = gear.dodgePercent;
  if (dodgePercent > 0 && Math.random() * 100 < dodgePercent) {
    return withBreakdown({
      rawDamage: 0,
      finalDamage: 0,
      blocked: true,
      isCritical: false,
      logLines: [`${defender.name} esquivou o golpe!`],
    });
  }

  const isCritical = ctx.forceCritical === true;

  if (isCritical) {
    const attackerGear = resolveCombatantGearBuffs(attacker);
    const tempCritPercent = resolveModifierPercentFromCombatant(
      attacker,
      RuntimeModifierKind.CritChance,
      turn,
    );
    const critMultiplier = resolveCritHitMultiplier({
      critChancePercent: attackerGear.critChancePercent,
      critDamageBonus: attacker.combatStats?.critDamageBonus ?? 0,
      tempCritPercent,
      runeCritBonus: ctx.runeCritBonus ?? 0,
    });
    raw = Math.floor(raw * critMultiplier);
    const critBonusPercent = Math.round((critMultiplier - 1) * 100);
    logLines.push(`Acerto crítico (+${critBonusPercent}%)!`);
    return withBreakdown({
      rawDamage: raw,
      finalDamage: Math.max(MIN_BATTLE_DAMAGE, raw),
      blocked: false,
      isCritical: true,
      logLines,
      critBonusPercent,
    });
  }

  return withBreakdown({
    rawDamage: raw,
    finalDamage: Math.max(MIN_BATTLE_DAMAGE, raw),
    blocked: false,
    isCritical: false,
    logLines,
  });
}
