// @ts-nocheck
import { readActiveStatuses, resetActiveStatusSnapshotTurn, setActiveStatusSnapshotTurn, } from './activeStatusAdapter.js';
let combatants = {};
const listeners = new Set();
/** Espelha o snapshot autoritativo — atualizado pela HUD a cada TURN_START / sync. */
export function setCombatSnapshot(next, turn) {
    combatants = next;
    if (typeof turn === 'number') {
        setActiveStatusSnapshotTurn(turn);
    }
    for (const listener of listeners)
        listener();
}
export function getCombatSnapshot() {
    return combatants;
}
export function subscribeCombatSnapshot(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
/** Leitura pura: lista atual de status ativos para um combatente. */
export function useActiveStatuses(combatantId) {
    return readActiveStatuses(combatants, combatantId);
}
/** Observador reativo — reexecuta quando o snapshot de combate muda. */
export function subscribeActiveStatuses(combatantId, onChange) {
    const emit = () => onChange(useActiveStatuses(combatantId));
    emit();
    return subscribeCombatSnapshot(emit);
}
export function resetCombatSnapshotStore() {
    combatants = {};
    listeners.clear();
    resetActiveStatusSnapshotTurn();
}
