import { getActionDispatcher } from '../ActionDispatcher.js';
import { getMutableDataStore } from '../PlayerDataStore.js';

/**
 * Confirma intenção bancária após UPDATE_BANK_SUCCESS — espelha wallet/inventário/cofre na HUD.
 */
export function completeBankTransactionSuccess(intentId: string | null | undefined): void {
  if (intentId) {
    getActionDispatcher().confirmIntent(intentId);
  }
  getMutableDataStore().refreshBankTransactionViews();
}
