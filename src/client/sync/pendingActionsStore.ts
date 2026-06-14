import type { ClientAction } from '../ActionDispatcher.js';
import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';
import type { CorrelationId } from '../../shared/sync/pendingActionProtocol.js';
import { getGameStore } from '../state/GameStore.js';

export type PendingActionEntry = {
  readonly correlationId: CorrelationId;
  readonly actionType: ClientAction['type'];
  readonly snapshot: AuthoritativePlayerSnapshot;
  readonly createdAtMs: number;
};

/**
 * @deprecated Prefer getGameStore().performAction / handleServerResponse.
 * Mantido para compatibilidade com módulos legados.
 */
export class PendingActionsStore {
  register(correlationId: CorrelationId, action: ClientAction): PendingActionEntry {
    const createdAtMs = Date.now();
    getGameStore().performAction(correlationId, () => {}, undefined);
    const pending = getGameStore().getState().pendingActions[correlationId];
    return {
      correlationId,
      actionType: action.type,
      snapshot: pending?.rollbackSnapshot ?? ({} as AuthoritativePlayerSnapshot),
      createdAtMs: pending?.createdAtMs ?? createdAtMs,
    };
  }

  has(correlationId: CorrelationId): boolean {
    return getGameStore().hasPendingAction(correlationId);
  }

  resolve(correlationId: CorrelationId): void {
    getGameStore().handleServerResponse(correlationId, true);
  }

  reject(correlationId: CorrelationId): boolean {
    return getGameStore().handleServerResponse(correlationId, false);
  }

  clear(): void {
    getGameStore().clearPendingActions();
  }
}

let store: PendingActionsStore | null = null;

export function getPendingActionsStore(): PendingActionsStore {
  if (!store) store = new PendingActionsStore();
  return store;
}

export function resetPendingActionsStore(): void {
  store = null;
}

/** Trata ack wire — restaura snapshot em falha correlacionada. */
export function handlePendingActionAck(payload: {
  readonly correlationId?: string;
  readonly intentId?: string;
  readonly success: boolean;
  readonly error?: string;
}): boolean {
  const correlationId = payload.correlationId ?? payload.intentId;
  if (!correlationId) return false;

  if (!getGameStore().hasPendingAction(correlationId)) return false;

  return getGameStore().handleServerResponse(
    correlationId,
    payload.success,
    payload.success ? undefined : payload.error,
  );
}
