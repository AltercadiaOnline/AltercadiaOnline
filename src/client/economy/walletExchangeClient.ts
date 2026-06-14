import {
  ALTER_TO_VOLTS_EXCHANGE_RATE,
  calculateVoltsFromAlterCoins,
  isValidAlterExchangeAmount,
} from '../../shared/economy/premiumCurrency.js';
import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { alertSystem } from '../ui/alertSystem.js';
import { getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';

let activeSocket: BrowserCombatSocket | null = null;

export function bindEconomyExchangeSocket(socket: BrowserCombatSocket): void {
  activeSocket = socket;

  socket.on('economy-exchange-result', (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const record = raw as Record<string, unknown>;
    if (record.ok !== false) return;
    const message = typeof record.message === 'string'
      ? record.message
      : 'Falha ao trocar Alter Coins.';
    alertSystem(message);
  });
}

const WS_OPEN = 1;

/** Intenção de troca — WS quando conectado; fallback local na exploração. */
export function requestAlterToVoltsExchange(alterAmount: number): void {
  if (!isValidAlterExchangeAmount(alterAmount)) return;

  if (activeSocket && activeSocket.readyState === WS_OPEN) {
    activeSocket.send('economy-exchange-alter', { alterAmount, characterId: 1 });
    return;
  }

  getPlayerWalletStore().exchangeAlterForVolts(alterAmount);
}

export function getAlterExchangePreview(alterAmount: number): number {
  return calculateVoltsFromAlterCoins(alterAmount);
}

export { ALTER_TO_VOLTS_EXCHANGE_RATE };
