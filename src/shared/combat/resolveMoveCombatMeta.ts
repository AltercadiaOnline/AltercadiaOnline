import {
  getClassMoveById,
  isClassMoveId,
  MoveTarget,
  type MoveTarget as MoveTargetKind,
} from './classMovesetCatalog.js';
import { getMonsterSkillById } from './monsterSkillCatalog.js';
import { MoveTargetType } from './battleTargeting.js';
import { MoveCategory, MoveScalingStat, type MoveDefinition } from './moveTypes.js';

export type MoveCombatMeta = {
  readonly id: string;
  readonly name: string;
  readonly category: MoveCategory;
  readonly scalingStat: MoveScalingStat;
  readonly basePower: number;
  readonly cooldown: number;
  readonly priority?: 1 | 2 | 3;
  readonly ppMax?: number;
  readonly moveTarget: MoveTargetKind;
  readonly range: number;
  readonly targetType: MoveTargetType;
};

function mapMoveTargetToBattle(moveTarget: MoveTargetKind): {
  readonly range: number;
  readonly targetType: MoveTargetType;
} {
  switch (moveTarget) {
    case MoveTarget.Self:
    case MoveTarget.AllyOrSelf:
      return { range: 0, targetType: MoveTargetType.Self };
    case MoveTarget.AllEnemies:
    case MoveTarget.Enemy:
      return { range: 1, targetType: MoveTargetType.Enemy };
    default:
      return { range: 1, targetType: MoveTargetType.Enemy };
  }
}

function fromClassMove(moveId: string): MoveCombatMeta | undefined {
  if (!isClassMoveId(moveId)) return undefined;
  const move = getClassMoveById(moveId);
  const combat = move.combat;
  if (!combat || !move.isDefined) return undefined;

  const targeting = mapMoveTargetToBattle(combat.target);
  return {
    id: move.id,
    name: move.name,
    category: combat.category,
    scalingStat: combat.scalingStat,
    basePower: combat.basePower,
    cooldown: combat.cooldown,
    priority: combat.priority,
    ppMax: combat.basePp,
    moveTarget: combat.target,
    range: targeting.range,
    targetType: targeting.targetType,
  } satisfies MoveCombatMeta;
}

function fromMonsterSkill(moveId: string): MoveCombatMeta | undefined {
  const move = getMonsterSkillById(moveId);
  if (!move) return undefined;
  const targeting = mapMoveTargetToBattle(MoveTarget.Enemy);
  const meta: MoveCombatMeta = {
    id: move.id,
    name: move.name,
    category: move.category,
    scalingStat: move.scalingStat,
    basePower: move.damage,
    cooldown: move.cooldown,
    moveTarget: MoveTarget.Enemy,
    range: targeting.range,
    targetType: targeting.targetType,
  };
  if (move.priority !== undefined) {
    return { ...meta, priority: move.priority };
  }
  if (move.ppMax !== undefined) {
    return { ...meta, ppMax: move.ppMax };
  }
  return meta;
}

/** Metadados de combate — classe ou skill de monstro. */
export function resolveMoveCombatMeta(moveId: string): MoveCombatMeta | undefined {
  return fromClassMove(moveId) ?? fromMonsterSkill(moveId);
}

export function resolveMoveScalingStat(moveId: string): MoveScalingStat | undefined {
  return resolveMoveCombatMeta(moveId)?.scalingStat;
}

/** Movimentos alinhados à trilha Fluxo (telemetria PROGRESS_MARCO). */
export function isFluxAlignedMove(moveId: string): boolean {
  const meta = resolveMoveCombatMeta(moveId);
  if (!meta) return false;
  return (
    meta.scalingStat === MoveScalingStat.AGI
    && (meta.category === MoveCategory.Utility || meta.category === MoveCategory.Support)
  );
}

/** Tooltip / HUD — mesma forma que `MoveDefinition`. */
export function resolveMoveDefinitionForUi(moveId: string): MoveDefinition | undefined {
  const meta = resolveMoveCombatMeta(moveId);
  if (!meta) return undefined;
  const move = isClassMoveId(moveId) ? getClassMoveById(moveId) : getMonsterSkillById(moveId);
  const description =
    move && 'effectSummary' in move
      ? move.effectSummary
      : move && 'description' in move
        ? move.description
        : undefined;
  const def: MoveDefinition = {
    id: meta.id,
    name: meta.name,
    category: meta.category,
    scalingStat: meta.scalingStat,
    damage: meta.basePower,
    cooldown: meta.cooldown,
    ...(meta.priority !== undefined ? { priority: meta.priority } : {}),
    ...(meta.ppMax !== undefined ? { ppMax: meta.ppMax } : {}),
    ...(description ? { description } : {}),
  };

  if (isClassMoveId(moveId)) {
    const classMove = getClassMoveById(moveId);
    return {
      ...def,
      effectKind: classMove.effectKind,
      ...(classMove.combat?.target ? { moveTarget: classMove.combat.target } : {}),
      ...(classMove.combat?.effectParams
        ? { effectParams: classMove.combat.effectParams }
        : {}),
    };
  }

  return def;
}
