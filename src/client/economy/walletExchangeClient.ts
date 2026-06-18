import {
  ALTER_TO_VOLTS_EXCHANGE_RATE,
  calculateVoltsFromAlterCoins,
  isValidAlterExchangeAmount,
} from '../../shared/economy/premiumCurrency.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';
import { alertSystem } from '../ui/alertSystem.js';
import { getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';

/** Fallback localhost — online usa ActionDispatcher → player-intent. */
export function requestAlterToVoltsExchangeLocal(alterAmount: number): void {
  if (!isValidAlterExchangeAmount(alterAmount)) return;

  if (getActionDispatcher().getMode() === 'online' || !allowsOfflineGameplayFallback()) {
    alertSystem('Servidor offline — reconecte para trocar Alter Coins.');
    return;
  }

  getPlayerWalletStore().exchangeAlterForVolts(alterAmount);
}

/** Online: ActionDispatcher.dispatch({ type: 'EXCHANGE_ALTER_FOR_VOLTS', ... }). */
export function requestAlterToVoltsExchange(alterAmount: number): void {
  if (getActionDispatcher().getMode() === 'online') {
    getActionDispatcher().dispatch({
      type: 'EXCHANGE_ALTER_FOR_VOLTS',
      payload: { alterAmount },
    });
    return;
  }

  requestAlterToVoltsExchangeLocal(alterAmount);
}

export function getAlterExchangePreview(alterAmount: number): number {
  return calculateVoltsFromAlterCoins(alterAmount);
}

export { ALTER_TO_VOLTS_EXCHANGE_RATE };
