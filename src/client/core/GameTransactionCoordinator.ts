/**
 * FLUXO DE DADOS — GameTransactionCoordinator
 *
 * UI / Services → runGameTransaction() ou reportTransactionFailure()
 *   → GameStore.performServerAction (optimistic + pendingActions + snapshot)
 *   → Servidor / Supabase confirma ou rejeita
 *   → handleServerResponse(success) → commit | handleServerResponse(false) → rollback
 *
 * Em qualquer falha: alertSystem (toast padrão) + rollback automático no GameStore.
 */

import { getIntentErrorMessage } from '../../shared/intent/intentProtocol.js';
import type { CorrelationId } from '../../shared/sync/pendingActionProtocol.js';
import { getGameStore } from '../state/GameStore.js';
import { alertSystem } from '../ui/alertSystem.js';

export type GameTransactionFailureOptions = {
  readonly silent?: boolean;
  readonly skipRollback?: boolean;
};

export function resolveTransactionErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim().length > 0) return error.trim();
  if (error instanceof Error && error.message.trim().length > 0) return error.message.trim();
  if (typeof error === 'string' && error.trim().length > 0) {
    return getIntentErrorMessage(error.trim());
  }
  return fallback;
}

/** Alerta padrão + rollback de pendingAction quando correlationId está ativo. */
export function reportTransactionFailure(
  correlationId: CorrelationId | null | undefined,
  error: unknown,
  fallbackMessage: string,
  options?: GameTransactionFailureOptions,
): void {
  const message = resolveTransactionErrorMessage(error, fallbackMessage);

  if (!options?.silent) {
    alertSystem(message);
  }

  if (options?.skipRollback || !correlationId) return;

  const store = getGameStore();
  if (store.hasPendingAction(correlationId)) {
    store.handleServerResponse(correlationId, false, message, { silent: true });
  }
}

export type GameTransactionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

/**
 * Executa transação com pendingAction. Em exceção ou `{ ok: false }`, faz rollback.
 */
export async function runGameTransaction<T>(
  correlationId: CorrelationId,
  kind: 'player-intent' | 'economy-event' | 'combat-command',
  actionFn: () => Promise<GameTransactionResult<T>> | GameTransactionResult<T>,
  fallbackMessage: string,
): Promise<GameTransactionResult<T>> {
  const store = getGameStore();

  if (!store.isAuthenticated()) {
    const message = 'Sessão não autenticada.';
    alertSystem(message);
    return { ok: false, message };
  }

  store.performServerAction(correlationId, kind, () => {});

  try {
    const result = await actionFn();

    if (!result.ok) {
      reportTransactionFailure(correlationId, result.message, fallbackMessage);
      return result;
    }

    store.handleServerResponse(correlationId, true, result.value, { silent: true });
    return result;
  } catch (error) {
    reportTransactionFailure(correlationId, error, fallbackMessage);
    return {
      ok: false,
      message: resolveTransactionErrorMessage(error, fallbackMessage),
    };
  }
}

/** Confirma transação pendente (resposta autoritativa do servidor). */
export function confirmTransaction(correlationId: CorrelationId): void {
  getGameStore().handleServerResponse(correlationId, true);
}

/** Rejeita transação pendente com alerta + rollback. */
export function rejectTransaction(
  correlationId: CorrelationId,
  error: unknown,
  fallbackMessage: string,
  options?: GameTransactionFailureOptions,
): void {
  reportTransactionFailure(correlationId, error, fallbackMessage, options);
}
