// @ts-nocheck
import { computeRuntimeTurnsRemaining, isRuntimeEffectActive, resolveRuntimeAppliedAtTurn, } from '../../shared/combat/runtimeActorTiming.js';
/** Turno global do combate para calcular duração restante (Tick por Ator). */
let snapshotTurnForHud = Number.MAX_SAFE_INTEGER;
export function setActiveStatusSnapshotTurn(turn) {
    snapshotTurnForHud = turn;
}
export function resetActiveStatusSnapshotTurn() {
    snapshotTurnForHud = Number.MAX_SAFE_INTEGER;
}
function isStatusVisible(row, currentTurn) {
    if (currentTurn === Number.MAX_SAFE_INTEGER) {
        return row.turnsRemaining > 0;
    }
    const appliedAtTurn = resolveRuntimeAppliedAtTurn(row);
    return isRuntimeEffectActive(currentTurn, appliedAtTurn, row.turnsRemaining, row.id);
}
function resolveTurnsRemaining(row, currentTurn) {
    if (currentTurn === Number.MAX_SAFE_INTEGER) {
        return row.turnsRemaining;
    }
    const appliedAtTurn = resolveRuntimeAppliedAtTurn(row);
    return computeRuntimeTurnsRemaining(currentTurn, appliedAtTurn, row.turnsRemaining, row.id);
}
export function toActiveStatusChips(statuses, currentTurn = snapshotTurnForHud) {
    if (!statuses?.length)
        return [];
    return statuses
        .filter((row) => isStatusVisible(row, currentTurn))
        .map((row) => ({
        id: row.id,
        stacks: Math.max(1, row.stacks),
        turnsRemaining: resolveTurnsRemaining(row, currentTurn),
    }));
}
export function readActiveStatusesFromCombatant(combatant, currentTurn = snapshotTurnForHud) {
    if (!combatant)
        return [];
    return toActiveStatusChips(combatant.activeStatuses, currentTurn);
}
export function readActiveStatuses(combatants, combatantId, currentTurn = snapshotTurnForHud) {
    return readActiveStatusesFromCombatant(combatants[combatantId], currentTurn);
}
