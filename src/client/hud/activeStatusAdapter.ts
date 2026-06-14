import type { Combatant } from '../../shared/types.js';
import type { RuntimeStatus } from '../../shared/types/combat.js';
import {
  computeRuntimeTurnsRemaining,
  isRuntimeEffectActive,
  resolveRuntimeAppliedAtTurn,
} from '../../shared/combat/runtimeActorTiming.js';

/** Contrato simples para a HUD — motor → adaptador → StatusDisplay. */
export type ActiveStatusChip = {
  readonly id: string;
  readonly stacks: number;
  readonly turnsRemaining: number;
};

/** Turno global do combate para calcular duração restante (Tick por Ator). */
let snapshotTurnForHud = Number.MAX_SAFE_INTEGER;

export function setActiveStatusSnapshotTurn(turn: number): void {
  snapshotTurnForHud = turn;
}

export function resetActiveStatusSnapshotTurn(): void {
  snapshotTurnForHud = Number.MAX_SAFE_INTEGER;
}

function isStatusVisible(row: RuntimeStatus, currentTurn: number): boolean {
  if (currentTurn === Number.MAX_SAFE_INTEGER) {
    return row.turnsRemaining > 0;
  }
  const appliedAtTurn = resolveRuntimeAppliedAtTurn(row);
  return isRuntimeEffectActive(currentTurn, appliedAtTurn, row.turnsRemaining, row.id);
}

function resolveTurnsRemaining(row: RuntimeStatus, currentTurn: number): number {
  if (currentTurn === Number.MAX_SAFE_INTEGER) {
    return row.turnsRemaining;
  }
  const appliedAtTurn = resolveRuntimeAppliedAtTurn(row);
  return computeRuntimeTurnsRemaining(currentTurn, appliedAtTurn, row.turnsRemaining, row.id);
}

export function toActiveStatusChips(
  statuses: readonly RuntimeStatus[] | undefined,
  currentTurn: number = snapshotTurnForHud,
): readonly ActiveStatusChip[] {
  if (!statuses?.length) return [];
  return statuses
    .filter((row) => isStatusVisible(row, currentTurn))
    .map((row) => ({
      id: row.id,
      stacks: Math.max(1, row.stacks),
      turnsRemaining: resolveTurnsRemaining(row, currentTurn),
    }));
}

export function readActiveStatusesFromCombatant(
  combatant: Combatant | null | undefined,
  currentTurn: number = snapshotTurnForHud,
): readonly ActiveStatusChip[] {
  if (!combatant) return [];
  return toActiveStatusChips(combatant.activeStatuses, currentTurn);
}

export function readActiveStatuses(
  combatants: Readonly<Record<string, Combatant>>,
  combatantId: string,
  currentTurn: number = snapshotTurnForHud,
): readonly ActiveStatusChip[] {
  return readActiveStatusesFromCombatant(combatants[combatantId], currentTurn);
}
