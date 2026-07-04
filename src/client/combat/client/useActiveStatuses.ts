import type { Combatant } from '../../../shared/types.js';
import {
  readActiveStatuses,
  resetActiveStatusSnapshotTurn,
  setActiveStatusSnapshotTurn,
  type ActiveStatusChip,
} from './activeStatusAdapter.js';

type SnapshotListener = () => void;

let combatants: Readonly<Record<string, Combatant>> = {};
const listeners = new Set<SnapshotListener>();

/** Espelha o snapshot autoritativo — atualizado pela HUD a cada TURN_START / sync. */
export function setCombatSnapshot(
  next: Readonly<Record<string, Combatant>>,
  turn?: number,
): void {
  combatants = next;
  if (typeof turn === 'number') {
    setActiveStatusSnapshotTurn(turn);
  }
  for (const listener of listeners) listener();
}

export function getCombatSnapshot(): Readonly<Record<string, Combatant>> {
  return combatants;
}

export function subscribeCombatSnapshot(listener: SnapshotListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Leitura pura: lista atual de status ativos para um combatente. */
export function useActiveStatuses(combatantId: string): readonly ActiveStatusChip[] {
  return readActiveStatuses(combatants, combatantId);
}

/** Observador reativo — reexecuta quando o snapshot de combate muda. */
export function subscribeActiveStatuses(
  combatantId: string,
  onChange: (statuses: readonly ActiveStatusChip[]) => void,
): () => void {
  const emit = () => onChange(useActiveStatuses(combatantId));
  emit();
  return subscribeCombatSnapshot(emit);
}

export function resetCombatSnapshotStore(): void {
  combatants = {};
  listeners.clear();
  resetActiveStatusSnapshotTurn();
}
