import { getActionDispatcher } from '../../ActionDispatcher.js';
import { canApplyLocalGameplayMutations } from '../../sync/intentPolicy.js';

/**
 * Persiste loadout confirmado.
 * Online → SYNC_MOVESET + intent-result.
 * Local/mock → mesmo intent no MockEconomyService (grava CharacterPersistenceRecord.world).
 */
export async function persistLoadoutToServer(activeMovesets: readonly string[]): Promise<void> {
  const dispatcher = getActionDispatcher();

  const result = dispatcher.dispatch({
    type: 'SYNC_MOVESET',
    payload: { activeMovesets: [...activeMovesets] },
  });

  if (!result.ok) {
    throw new Error(result.reason);
  }

  if (canApplyLocalGameplayMutations(dispatcher.getMode())) {
    // Mock confirma no handleIntent e grava localSave; sem wait de WS.
    return;
  }

  if (result.status === 'pending' && result.intentId) {
    const acknowledged = await dispatcher.waitForIntentResult(result.intentId);
    if (!acknowledged) {
      throw new Error('Servidor não confirmou o loadout. Verifique a conexão WebSocket.');
    }
  }
}
