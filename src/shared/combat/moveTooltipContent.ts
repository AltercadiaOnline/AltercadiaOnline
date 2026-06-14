import {
  getClassMoveById,
  isClassMoveId,
  MoveEffectKind,
  MoveTarget,
  type MoveEffectKind as MoveEffectKindType,
} from './classMovesetCatalog.js';
import { formatMoveGameplayRoleLine } from './moveGameplayRole.js';
import {
  formatMoveBaseHealLabel,
  formatMoveBasePowerLabel,
} from './moveDisplayLabels.js';
import {
  buildClassMoveNarrativeTooltipLines,
  resolveClassMoveNarrativeTooltip,
} from './classMoveNarrativeTooltips.js';
import {
  formatEffectParamPercent,
  formatEffectParamPercentLabel,
} from './effectParamDisplay.js';
import { formatMoveBuildImpactLine } from './moveCombatTooltipTruth.js';
import {
  MOVE_CATEGORY_LABELS,
  MOVE_SCALING_STAT_LABELS,
  MoveCategory,
  type MoveDefinition,
} from './moveTypes.js';

const NON_DAMAGE_EFFECT_KINDS: ReadonlySet<MoveEffectKindType> = new Set([
  MoveEffectKind.Heal,
  MoveEffectKind.SelfShield,
  MoveEffectKind.GroupShield,
  MoveEffectKind.StatusImmunity,
  MoveEffectKind.Thorns,
  MoveEffectKind.ApplyParalyze,
  MoveEffectKind.MovesetWeaken,
  MoveEffectKind.LockEnemyMoves,
  MoveEffectKind.InvertDebuff,
  MoveEffectKind.Confuse,
  MoveEffectKind.CopyLastMove,
  MoveEffectKind.PpDrain,
  MoveEffectKind.PlaceTrap,
  MoveEffectKind.DamageMirror,
]);

const MOVE_TARGET_LABELS: Record<string, string> = {
  [MoveTarget.Self]: 'Si',
  [MoveTarget.AllyOrSelf]: 'Si ou aliado',
  [MoveTarget.Enemy]: 'Inimigo',
  [MoveTarget.AllEnemies]: 'Todos os inimigos',
};

function statLabel(move: MoveDefinition): string {
  return MOVE_SCALING_STAT_LABELS[move.scalingStat];
}

function resolveMoveTarget(move: MoveDefinition): string | null {
  if (move.moveTarget) {
    return MOVE_TARGET_LABELS[move.moveTarget] ?? move.moveTarget;
  }
  if (!isClassMoveId(move.id)) return null;
  const target = getClassMoveById(move.id).combat?.target;
  if (!target) return null;
  return MOVE_TARGET_LABELS[target] ?? target;
}

/** Linha de escala — cura/buff usa "Escala com"; ataques usam "Atributo". */
export function formatMoveScalingLine(move: MoveDefinition): string {
  const stat = statLabel(move);
  if (move.effectKind === MoveEffectKind.Heal) {
    return `Escala com: ${stat}`;
  }

  const isDirectAttack =
    move.category === MoveCategory.Attack
    && move.effectKind !== MoveEffectKind.Heal
    && move.damage > 0
    && !NON_DAMAGE_EFFECT_KINDS.has(move.effectKind as MoveEffectKindType);

  return isDirectAttack ? `Atributo: ${stat}` : `Escala com: ${stat}`;
}

export function formatMoveTargetLine(move: MoveDefinition): string | null {
  const label = resolveMoveTarget(move);
  return label ? `Alvo: ${label}` : null;
}

function pct(value: number | undefined, fallback = 0): number {
  return value ?? fallback;
}

function pctLabel(
  value: number | undefined,
  paramKey: string,
  fallback = 0,
): string {
  return formatEffectParamPercentLabel(value, paramKey, fallback);
}

function isDamageTooltipMove(move: MoveDefinition): boolean {
  if (NON_DAMAGE_EFFECT_KINDS.has(move.effectKind as MoveEffectKindType)) {
    return false;
  }
  if (move.effectKind === MoveEffectKind.Heal) {
    return false;
  }
  return move.category === MoveCategory.Attack && move.damage > 0;
}

/** @deprecated Importe de `moveDisplayLabels.js` */
export { formatMoveBasePowerLabel } from './moveDisplayLabels.js';

/** Efeito principal numérico/mecânico — nunca trata cura como dano. */
export function formatMovePrimaryEffect(move: MoveDefinition): string | null {
  const power = move.damage;
  const p = move.effectParams ?? {};
  const stat = statLabel(move);
  const target = resolveMoveTarget(move);

  switch (move.effectKind) {
    case MoveEffectKind.Heal: {
      const targetHint =
        target === 'Si ou aliado'
          ? ' — cura si ou aliado'
          : target === 'Si'
            ? ' — cura si'
            : '';
      let line = formatMoveBaseHealLabel(power, stat, targetHint);
      if (p.nextTurnsBaseHealEchoPercent && p.nextTurnsBaseHealEchoTurns) {
        line += `; eco +${pct(p.nextTurnsBaseHealEchoPercent)}% por ${pct(p.nextTurnsBaseHealEchoTurns)} turno(s)`;
      }
      if (p.bonusHealChancePercent && p.bonusHealPercent) {
        line += `; ${pct(p.bonusHealChancePercent)}% chance de +${pct(p.bonusHealPercent)}% cura extra`;
      }
      return line;
    }

    case MoveEffectKind.SelfShield:
      return `Escudo: ${pct(p.shieldPercent)}% do HP por ${pct(p.shieldTurns, 2)} turno(s)`;
    case MoveEffectKind.GroupShield:
      return `Barreira de grupo: ${pct(p.groupShieldPercent)}% por ${pct(p.groupShieldTurns, 2)} turno(s)`;

    case MoveEffectKind.StatusImmunity:
      return `Bloqueia debuffs por ${pct(p.statusBlockTurns, 2)} turno(s); −${pct(p.incomingDamageReductionPercent, 50)}% dano recebido`;

    case MoveEffectKind.Thorns: {
      let line = `Espinhos: devolve ${pct(p.thornsReflectPercent, 50)}% do dano por ${pct(p.thornsTurns, 2)} turno(s)`;
      if (p.thornsAttackBonusPercent && p.thornsAttackBonusTurns) {
        line += `; +${pct(p.thornsAttackBonusPercent)}% ATK por ${pct(p.thornsAttackBonusTurns)} turno(s) ao refletir`;
      }
      return line;
    }

    case MoveEffectKind.ApplyBurn:
      return `${formatMoveBasePowerLabel(power)}; Queimadura (${pctLabel(p.burnDamagePercent, 'burnDamagePercent', 5)}/turno, ${pct(p.burnTurns, 3)} turnos)`;

    case MoveEffectKind.StackingDamage: {
      const cap = pct(p.stackCap, 3);
      return `${formatMoveBasePowerLabel(power)} (+${pctLabel(p.stackBonusPerUse, 'stackBonusPerUse', 15)} por uso, até ${cap} acúmulos)`;
    }

    case MoveEffectKind.AttackEcho: {
      const bonus = pct(p.echoBonusPercent, 15);
      const echoTurns = pct(p.echoTurns, 2);
      let line = `Eco +${bonus}% do golpe (${echoTurns} turno(s) seus)`;
      if (p.critBonusPercent) {
        line += `; +${pct(p.critBonusPercent)}% crítico`;
      }
      if (power > 0) {
        return `${formatMoveBasePowerLabel(power)}; ${line}`;
      }
      return line;
    }

    case MoveEffectKind.AoeDamage: {
      const mult = formatEffectParamPercent(p.aoeDamageMultiplier, 'aoeDamageMultiplier', 100);
      let line = `${formatMoveBasePowerLabel(power)} em área (${mult}% por alvo)`;
      if (p.nextTurnAttackBonusPercent && p.nextTurnAttackBonusTurns) {
        line += `; +${pct(p.nextTurnAttackBonusPercent)}% ataque por ${pct(p.nextTurnAttackBonusTurns)} turno(s)`;
      }
      return line;
    }

    case MoveEffectKind.HighRiskBurst:
      return `${formatMoveBasePowerLabel(power)} (autodano: ${pct(p.selfDamagePercent, 15)}% do dano causado)`;

    case MoveEffectKind.DebuffScalingDamage: {
      const cap = pct(p.debuffBonusCap, 3);
      return `${formatMoveBasePowerLabel(power)} (+${pct(p.debuffBonusPercent, 12)}% por debuff no alvo, até ${cap})`;
    }

    case MoveEffectKind.ApplyParalyze: {
      let line = `Paralisia ${pct(p.paralyzeSkipTurnChance, 60)}% por ${pct(p.paralyzeTurns, 1)} turno(s)`;
      if (p.incomingBuffWeakenPercent && p.incomingBuffWeakenTurns) {
        line += `; buffs inimigos −${pct(p.incomingBuffWeakenPercent)}% por ${pct(p.incomingBuffWeakenTurns)} turno(s)`;
      }
      return line;
    }

    case MoveEffectKind.DelayedDetonation:
      return `${formatMoveBasePowerLabel(power)} imediato; detona ×${pct(p.delayedDamageMultiplier, 3)} após ${pct(p.delayedTurns, 2)} turno(s)`;

    case MoveEffectKind.MovesetWeaken: {
      const weakenLine = `−${pct(p.weakenPercent, 15)}% dano e cura inimiga por ${pct(p.weakenTurns, 3)} turno(s)`;
      if (power > 0) {
        return `${formatMoveBasePowerLabel(power)}; ${weakenLine}`;
      }
      return weakenLine;
    }

    case MoveEffectKind.LockEnemyMoves:
      return `Bloqueia ${pct(p.lockMoveCount, 2)} move(s) inimigo(s) por ${pct(p.lockTurns, 1)} turno(s)`;

    case MoveEffectKind.RetaliationStrike: {
      const step = pct(p.retaliationDamageStep, 10);
      const cap = pct(p.retaliationBonusCapPercent, 30);
      return `${formatMoveBasePowerLabel(power)} (+1% ATK a cada ${step} de dano recebido, até +${cap}%)`;
    }

    case MoveEffectKind.IgnoreBarrier:
      return `${formatMoveBasePowerLabel(power)} (ignora ${pct(p.ignoreBarrierPercent, 100)}% de barreira)`;

    case MoveEffectKind.InvertDebuff: {
      const weakenTurns = pct(p.enemyAttackWeakenTurns, 3);
      return `Debuff: −${pct(p.enemyAttackDamageReductionPercent, 30)}% dano de ataques inimigos por ${weakenTurns} turno(s)`;
    }

    case MoveEffectKind.OutOfTurn:
      return `${formatMoveBasePowerLabel(power)} reativo (age antes do inimigo neste turno)`;

    case MoveEffectKind.CopyLastMove:
      return `Copia último move inimigo (${formatEffectParamPercent(p.copyPowerMultiplier, 'copyPowerMultiplier', 90)}% poder)`;

    case MoveEffectKind.Confuse: {
      const confuseLine = `Confusão ${pct(p.confuseFailChance, 45)}% falha de turno · residual ${pct(p.residualDamageFromEnemyAttackPercent, 10)}% HP/turno (${pct(p.residualTurns, 2)} turnos)`;
      if (power > 0) {
        return `${formatMoveBasePowerLabel(power)}; ${confuseLine}`;
      }
      return confuseLine;
    }

    case MoveEffectKind.PureDamage:
      return power > 0 ? formatMoveBasePowerLabel(power) : null;

    case MoveEffectKind.AttackStack:
      return power > 0 ? formatMoveBasePowerLabel(power) : null;

    case MoveEffectKind.PpDrain:
    case MoveEffectKind.PlaceTrap:
    case MoveEffectKind.DamageMirror:
    case MoveEffectKind.RandomDamage:
      break;

    default:
      break;
  }

  if (isDamageTooltipMove(move)) {
    return formatMoveBasePowerLabel(power);
  }

  if (move.description) {
    return move.description;
  }

  return MOVE_CATEGORY_LABELS[move.category] ?? null;
}

/** Linhas do tooltip de move — ordem estável para HUD e combate. */
export function buildMoveTooltipLines(move: MoveDefinition): string[] {
  const narrative = resolveClassMoveNarrativeTooltip(move.id);
  if (narrative) {
    return [...buildClassMoveNarrativeTooltipLines(narrative)];
  }

  const lines: string[] = [
    MOVE_CATEGORY_LABELS[move.category],
    formatMoveGameplayRoleLine(move.effectKind as MoveEffectKindType),
  ];

  const targetLine = formatMoveTargetLine(move);
  if (targetLine) {
    lines.push(targetLine);
  }

  lines.push(formatMoveScalingLine(move));

  if (move.ppMax !== undefined && move.ppMax > 0) {
    lines.push(`Custo PP: ${move.ppMax}`);
  }

  const primary = formatMovePrimaryEffect(move);
  if (primary) {
    lines.push(primary);
  }

  lines.push(formatMoveBuildImpactLine(move));

  if (
    move.description
    && primary !== move.description
    && !primary?.includes(move.description)
  ) {
    lines.push(move.description);
  }

  return lines;
}
