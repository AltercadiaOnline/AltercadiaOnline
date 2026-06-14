import { CombatEventType, type CombatEvent } from '../events.js';
import type { ActionRequest, CombatState } from '../types/combat.js';
import type { GridCell } from './battleGridConstants.js';
import {
  BATTLE_GRID_COLS,
  BATTLE_GRID_ROWS,
  DEFAULT_BATTLE_PLACEMENT,
  type BattleUnitPlacement,
} from './battleGridConstants.js';
import { validateTargetClick, manhattanDistance, isInsideGrid } from './battleTargeting.js';
import {
  createBehaviorState,
  runBehaviorSwitch,
  type BehaviorHookResult,
  type MonsterBehaviorState,
} from './monsterBehavior.js';
import {
  getMonsterByActorId,
  MonsterBehaviorType,
  type MonsterCatalogEntry,
  type MonsterPatrolZone,
} from './MonsterCatalog.js';
import { isPhysicalMove } from './calculateDamage.js';
import { createBattleLogEvent } from './battleCombatLog.js';

export const BattleTurnOwner = {
  Player: 'PLAYER',
  Monster: 'MONSTER',
} as const;

export type BattleTurnOwner = (typeof BattleTurnOwner)[keyof typeof BattleTurnOwner];

export type BattleGridLayout = {
  readonly playerPos: GridCell;
  readonly enemyPos: GridCell;
};

export type PlayerGridAction = {
  readonly skillId: string;
  readonly targetTile: GridCell;
};

export type PlayerActionValidation =
  | { readonly ok: true; readonly target: GridCell }
  | { readonly ok: false; readonly reason: 'OUT_OF_RANGE' | 'INVALID_TARGET' | 'UNKNOWN_MOVE' };

export type MonsterTurnResult = {
  readonly action: ActionRequest | null;
  readonly logLines: readonly string[];
  readonly events: readonly CombatEvent[];
  readonly skipReason?: 'BEHAVIOR_CANCEL' | 'PATROL' | 'TRAP_WAIT';
};

export type MonsterBehaviorDecision = {
  readonly skillId: string | null;
  readonly targetTile: GridCell | null;
  readonly logLines: readonly string[];
  readonly skipReason?: MonsterTurnResult['skipReason'];
  readonly grid?: BattleGridLayout;
};

export type MonsterBehaviorTurnContext = {
  readonly monster: MonsterCatalogEntry;
  readonly state: CombatState;
  readonly monsterActorId: string;
  readonly grid: BattleGridLayout;
  readonly turnStart: BehaviorHookResult;
  readonly defaultSkill: string;
};

function computePatrolSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isInsidePatrolZone(cell: GridCell, zone: MonsterPatrolZone): boolean {
  return cell.x >= zone.minX && cell.x <= zone.maxX && cell.y >= zone.minY && cell.y <= zone.maxY;
}

function getAdjacentCells(cell: GridCell): GridCell[] {
  const deltas = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  return deltas
    .map((delta) => ({ x: cell.x + delta.x, y: cell.y + delta.y }))
    .filter((candidate) => isInsideGrid(candidate));
}

function pickRandomPatrolTile(
  current: GridCell,
  zone: MonsterPatrolZone | undefined,
  turn: number,
  actorId: string,
): GridCell {
  const bounds = zone ?? {
    minX: 0,
    maxX: BATTLE_GRID_COLS - 1,
    minY: 0,
    maxY: BATTLE_GRID_ROWS - 1,
  };
  const candidates = getAdjacentCells(current).filter((cell) => isInsidePatrolZone(cell, bounds));
  if (candidates.length === 0) return current;
  const seed = computePatrolSeed(`${actorId}:${turn}:patrol`);
  return candidates[seed % candidates.length] ?? current;
}

/** IA por behavior — Patrulha | Aggro | Trap. Dano sempre via CombatEngine. */
export function processMonsterBehavior(ctx: MonsterBehaviorTurnContext): MonsterBehaviorDecision {
  const { monster, state, monsterActorId, grid, turnStart, defaultSkill } = ctx;
  const playerPos = grid.playerPos;
  const enemyPos = grid.enemyPos;

  switch (monster.behavior) {
    case MonsterBehaviorType.Aggressive:
      return {
        skillId: turnStart.preferredSkillId ?? defaultSkill,
        targetTile: playerPos,
        logLines: [`${monster.name} foca no jogador mais próximo (Aggro).`],
      };

    case MonsterBehaviorType.Patrol: {
      const nextTile = pickRandomPatrolTile(enemyPos, monster.patrolZone, state.turn, monsterActorId);
      if (nextTile.x !== enemyPos.x || nextTile.y !== enemyPos.y) {
        return {
          skillId: null,
          targetTile: null,
          logLines: [`${monster.name} patrulha até (${nextTile.x}, ${nextTile.y}).`],
          skipReason: 'PATROL',
          grid: { ...grid, enemyPos: nextTile },
        };
      }
      return {
        skillId: null,
        targetTile: null,
        logLines: [`${monster.name} patrulha cautelosamente.`],
        skipReason: 'PATROL',
      };
    }

    case MonsterBehaviorType.Trap: {
      const distance = manhattanDistance(playerPos, enemyPos);
      if (distance <= 1) {
        return {
          skillId: turnStart.preferredSkillId ?? defaultSkill,
          targetTile: playerPos,
          logLines: [`${monster.name} dispara a emboscada (Trap)!`],
        };
      }
      return {
        skillId: null,
        targetTile: null,
        logLines: [`${monster.name} permanece imóvel na armadilha.`],
        skipReason: 'TRAP_WAIT',
      };
    }

    default:
      return {
        skillId: defaultSkill,
        targetTile: playerPos,
        logLines: [],
      };
  }
}

/**
 * IA de monstro + validação de grid — não aplica dano.
 * Autoridade de dano: CombatEngine.applyDirectDamage → calculateDamage.
 */
export class MonsterTurnController {
  private readonly playerActorId: string;
  private grid: BattleGridLayout;
  private turnOwner: BattleTurnOwner = BattleTurnOwner.Player;
  private readonly behaviorStateByActor = new Map<string, MonsterBehaviorState>();

  constructor(playerActorId: string, grid: BattleGridLayout | BattleUnitPlacement = DEFAULT_BATTLE_PLACEMENT) {
    this.playerActorId = playerActorId;
    this.grid = 'playerPos' in grid
      ? grid
      : { playerPos: grid.player, enemyPos: grid.enemy };
  }

  getTurnOwner(): BattleTurnOwner {
    return this.turnOwner;
  }

  getGridLayout(): BattleGridLayout {
    return this.grid;
  }

  setGridLayout(grid: BattleGridLayout): void {
    this.grid = grid;
  }

  validatePlayerGridAction(state: CombatState, action: PlayerGridAction): PlayerActionValidation {
    const targetCheck = validateTargetClick(
      action.skillId,
      action.targetTile,
      this.grid.playerPos,
      this.grid.enemyPos,
    );
    if (!targetCheck.ok) {
      return { ok: false, reason: targetCheck.reason };
    }

    const actor = state.combatants[this.playerActorId];
    if (!actor) {
      return { ok: false, reason: 'INVALID_TARGET' };
    }

    const hasSkill = actor.skills.some((skill) => skill.id === action.skillId);
    if (!hasSkill) {
      return { ok: false, reason: 'UNKNOWN_MOVE' };
    }

    return { ok: true, target: targetCheck.target };
  }

  buildPlayerActionRequest(
    state: CombatState,
    action: PlayerGridAction,
    requestId: string,
  ): { readonly ok: true; readonly request: ActionRequest } | { readonly ok: false; readonly validation: PlayerActionValidation } {
    const validation = this.validatePlayerGridAction(state, action);
    if (!validation.ok) {
      return { ok: false, validation };
    }

    return {
      ok: true,
      request: {
        battleId: state.battleId,
        actorId: this.playerActorId,
        turn: state.turn,
        skillId: action.skillId,
        requestId,
        targetTile: validation.target,
      },
    };
  }

  markPlayerTurnComplete(): void {
    this.turnOwner = BattleTurnOwner.Monster;
  }

  markMonsterTurnComplete(): void {
    this.turnOwner = BattleTurnOwner.Player;
  }

  processMonsterTurn(state: CombatState, monsterActorId: string): MonsterTurnResult {
    const monster = getMonsterByActorId(monsterActorId);
    if (!monster) {
      return this.fallbackMonsterTurn(state, monsterActorId);
    }

    const behaviorState = this.getBehaviorState(monsterActorId);
    const ctx = {
      turn: state.turn,
      monster,
      playerActorId: this.playerActorId,
      behaviorState,
    };

    const turnStart = this.executeBehaviorPhase(monster, 'onTurnStart', ctx);
    const logLines = [...(turnStart.logLines ?? [])];

    const behaviorDecision = this.decideBehaviorAction(monster, state, monsterActorId, turnStart);
    logLines.push(...behaviorDecision.logLines);

    if (!behaviorDecision.skillId) {
      const events = logLines.map((line) => createBattleLogEvent(state.battleId, line));
      return {
        action: null,
        logLines,
        events,
        ...(behaviorDecision.skipReason !== undefined ? { skipReason: behaviorDecision.skipReason } : {}),
      };
    }

    const skillId = behaviorDecision.skillId;
    const attackCtx = {
      ...ctx,
      skillId,
      isPhysical: isPhysicalMove(skillId),
    };

    const attackHook = this.executeBehaviorPhase(monster, 'onAttack', attackCtx);
    logLines.push(...(attackHook.logLines ?? []));

    if (attackHook.cancelAction) {
      const events = logLines.map((line) => createBattleLogEvent(state.battleId, line));
      return { action: null, logLines, events, skipReason: 'BEHAVIOR_CANCEL' };
    }

    const action: ActionRequest = {
      battleId: state.battleId,
      actorId: monsterActorId,
      turn: state.turn,
      skillId,
      requestId: `ai-${state.battleId}-${state.turn}-${monsterActorId}`,
      ...(behaviorDecision.targetTile ? { targetTile: behaviorDecision.targetTile } : {}),
    };

    const events = logLines.map((line) => createBattleLogEvent(state.battleId, line));
    return { action, logLines, events };
  }

  resolveActiveMonsterId(state: CombatState): string | null {
    for (const [id] of Object.entries(state.combatants)) {
      if (id !== this.playerActorId) return id;
    }
    return null;
  }

  private decideBehaviorAction(
    monster: MonsterCatalogEntry,
    state: CombatState,
    monsterActorId: string,
    turnStart: BehaviorHookResult,
  ): MonsterBehaviorDecision {
    const defaultSkill = this.pickMonsterSkill(monster, state, monsterActorId, turnStart);
    const decision = processMonsterBehavior({
      monster,
      state,
      monsterActorId,
      grid: this.grid,
      turnStart,
      defaultSkill,
    });
    if (decision.grid) {
      this.grid = decision.grid;
    }
    return decision;
  }

  private fallbackMonsterTurn(state: CombatState, monsterActorId: string): MonsterTurnResult {
    const enemy = state.combatants[monsterActorId];
    const skill = enemy?.skills[0];
    if (!skill) {
      return { action: null, logLines: [], events: [] };
    }
    return {
      action: {
        battleId: state.battleId,
        actorId: monsterActorId,
        turn: state.turn,
        skillId: skill.id,
        requestId: `ai-${state.battleId}-${state.turn}-${monsterActorId}`,
      },
      logLines: [],
      events: [],
    };
  }

  private executeBehaviorPhase(
    monster: MonsterCatalogEntry,
    phase: 'onTurnStart' | 'onAttack' | 'onDefend',
    ctx: Parameters<typeof runBehaviorSwitch>[2],
  ): BehaviorHookResult {
    switch (monster.behavior) {
      case MonsterBehaviorType.Patrol:
      case MonsterBehaviorType.Aggressive:
      case MonsterBehaviorType.Trap:
        return runBehaviorSwitch(monster, phase, ctx);
      default:
        return {};
    }
  }

  private pickMonsterSkill(
    monster: MonsterCatalogEntry,
    state: CombatState,
    monsterActorId: string,
    turnStart: BehaviorHookResult,
  ): string {
    if (turnStart.preferredSkillId) {
      return turnStart.preferredSkillId;
    }
    const combatant = state.combatants[monsterActorId];
    const fromCatalog = monster.skillIds[0];
    const fromCombatant = combatant?.skills[0]?.id;
    return fromCatalog ?? fromCombatant ?? 'rat_bite';
  }

  private getBehaviorState(actorId: string): MonsterBehaviorState {
    let behaviorState = this.behaviorStateByActor.get(actorId);
    if (!behaviorState) {
      behaviorState = createBehaviorState();
      this.behaviorStateByActor.set(actorId, behaviorState);
    }
    return behaviorState;
  }
}

/** @deprecated Use MonsterTurnController — alias de compatibilidade. */
export { MonsterTurnController as BattleManager };
