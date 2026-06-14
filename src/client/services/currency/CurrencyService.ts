/**
 * FLUXO DE DADOS — CurrencyService
 *
 * UI (SidebarWallet, exchange panels, shop HUD)
 *   → CurrencyService (leitura via GameStore selectors)
 *   → Mutações: ActionDispatcher (EXCHANGE_ALTER_FOR_VOLTS, bank, vendor)
 *   → GameStore.performServerAction (economy-event)
 *   → Servidor / economyGateway confirma
 *   → Falha → GameTransactionCoordinator (alerta + rollback)
 *
 * UI NUNCA chama playerWalletStore nem Supabase currency table diretamente.
 */

import type { BalanceChangedPayload } from '../../../shared/economy/events.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import {
  selectBalanceChangedPayload,
  selectPlayerGold,
} from '../../core/gameStoreSelectors.js';
import { reportTransactionFailure } from '../../core/GameTransactionCoordinator.js';
import { getGameStore } from '../../state/GameStore.js';

export type CurrencySnapshot = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
  readonly voltsFormatted: string;
  readonly alterFormatted: string;
};

export function getCurrencySnapshot(): CurrencySnapshot {
  return selectPlayerGold();
}

export function getBalanceChangedPayload(): BalanceChangedPayload {
  return selectBalanceChangedPayload();
}

export function subscribeCurrencyView(listener: () => void): () => void {
  return subscribeGameStore('player', listener);
}

export function exchangeAlterForVolts(alterAmount: number): { ok: boolean; reason?: string } {
  const result = getActionDispatcher().dispatch({
    type: 'EXCHANGE_ALTER_FOR_VOLTS',
    payload: { alterAmount },
  });

  if (!result.ok) {
    reportTransactionFailure(null, result.reason, 'Falha na troca de moedas.');
    return { ok: false, reason: result.reason };
  }

  return { ok: true };
}

export function isCurrencySyncPending(): boolean {
  return getGameStore().hasPendingActions();
}
