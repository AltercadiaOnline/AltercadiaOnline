/**
 * FLUXO DE DADOS — BattleService
 *
 * UI / HUD (battle screen, turn buttons)
 *   → BattleService (comandos de combate)
 *   → ActionDispatcher / combat socket
 *   → GameStore.performServerAction (combat-command + pendingActions)
 *   → combat-event / intent-result do servidor
 *   → GameStore.resolveFromCombatEvents / updateBattleState
 *   → Falha → GameTransactionCoordinator (alerta + rollback)
 *
 * UI de batalha é puramente visual — escuta GameStore.battle via subscribe.
 */

import type { GameStoreBattleState } from '../../state/GameStore.js';
import { getGameStore } from '../../state/GameStore.js';
import {
  confirmTransaction,
  rejectTransaction,
  reportTransactionFailure,
} from '../../core/GameTransactionCoordinator.js';
import type { CombatEvent } from '../../../shared/events.js';

export function getBattleState(): GameStoreBattleState {
  return getGameStore().getState().battle;
}

export function subscribeBattleView(listener: () => void): () => void {
  return getGameStore().subscribe('battle', () => listener());
}

export function updateBattleState(partial: Partial<GameStoreBattleState>): void {
  getGameStore().updateBattleState(partial);
}

export function resolveCombatEvents(events: readonly CombatEvent[]): void {
  getGameStore().resolveFromCombatEvents(events);
}

export function confirmCombatAction(correlationId: string): void {
  confirmTransaction(correlationId);
}

export function rejectCombatAction(
  correlationId: string,
  error: unknown,
  fallbackMessage = 'Ação de combate rejeitada.',
): void {
  rejectTransaction(correlationId, error, fallbackMessage);
}

export function rejectLatestCombatPending(reason: string): void {
  getGameStore().rejectLatestCombatPending(reason);
  reportTransactionFailure(null, reason, reason);
}

export function registerCombatPending(correlationId: string): void {
  getGameStore().performServerAction(correlationId, 'combat-command', () => {});
}
