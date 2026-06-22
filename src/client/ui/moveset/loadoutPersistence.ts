import { getActionDispatcher } from '../../ActionDispatcher.js';
import { canApplyLocalGameplayMutations } from '../../sync/intentPolicy.js';

/**
 * Persiste loadout confirmado no servidor (SYNC_MOVESET).
 * Em mock/local aplica apenas no cliente — sem round-trip.
 */
export async function persistLoadoutToServer(activeMovesets: readonly string[]): Promise<void> {
  const dispatcher = getActionDispatcher();

  if (canApplyLocalGameplayMutations(dispatcher.getMode())) {
    return;
  }

  const result = dispatcher.dispatch({
    type: 'SYNC_MOVESET',
    payload: { activeMovesets: [...activeMovesets] },
  });

  if (!result.ok) {
    throw new Error(result.reason);
  }

  if (result.status === 'pending' && result.intentId) {
    const acknowledged = await dispatcher.waitForIntentResult(result.intentId);
    if (!acknowledged) {
      throw new Error('Servidor rejeitou a confirmação do loadout.');
    }
  }
}
