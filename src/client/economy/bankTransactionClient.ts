import { getActionDispatcher } from '../ActionDispatcher.js';
import type { BrowserCombatSocket } from '../browser/createBrowserCombatSocket.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { alertSystem } from '../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';

let activeSocket: BrowserCombatSocket | null = null;
let activeCharacterId = 1;
let positionProvider: (() => { readonly x: number; readonly y: number } | null) | null = null;

const WS_OPEN = 1;

export function setBankTransactionCharacterId(characterId: number): void {
  if (Number.isInteger(characterId) && characterId > 0) {
    activeCharacterId = characterId;
  }
}

/** Posição visual do jogador no clique — compensa desync de MOVE_INTENT no servidor. */
export function setBankTransactionPositionProvider(
  provider: (() => { readonly x: number; readonly y: number } | null) | null,
): void {
  positionProvider = provider;
}

function resolveClientReportedPosition(): {
  readonly clientReportedX: number;
  readonly clientReportedY: number;
} | null {
  const position = positionProvider?.();
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return null;
  }
  return { clientReportedX: position.x, clientReportedY: position.y };
}

function notifyBankFailure(message: string, intentId: string | null): void {
  if (intentId) {
    getActionDispatcher().rejectIntent(intentId);
  }
  uiEvents.emit(UIEventType.BANK_TRANSACTION_FAILED, { message });
  alertSystem(message);
}

/**
 * Confirma intenção bancária após UPDATE_BANK_SUCCESS — espelha wallet/inventário/cofre na HUD.
 * Não usar no economy-bank-result isolado (estado autoritativo vem no economy-event).
 */
export function completeBankTransactionSuccess(intentId: string | null | undefined): void {
  if (intentId) {
    getActionDispatcher().confirmIntent(intentId);
  }
  getMutableDataStore().refreshBankTransactionViews();
}

export function bindBankTransactionSocket(socket: BrowserCombatSocket): void {
  activeSocket = socket;

  socket.on('economy-bank-result', (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const record = raw as Record<string, unknown>;
    const intentId = typeof record.intentId === 'string' ? record.intentId : null;

    if (record.ok === true) {
      // Estado autoritativo + confirmIntent: completeBankTransactionSuccess via economy-event.
      return;
    }

    if (record.ok === false) {
      const message = typeof record.message === 'string'
        ? record.message
        : 'Transação bancária recusada.';
      notifyBankFailure(message, intentId);
    }
  });
}

function mapCurrency(currency: import('../../shared/bank/bankConstants.js').BankCurrencyTypeId): 'volts' | 'alter' {
  return currency === 'volts' ? 'volts' : 'alter';
}

function buildBankPayloadBase(intentId: string, characterId: number, operation: string) {
  const clientPosition = resolveClientReportedPosition();
  return {
    intentId,
    characterId,
    operation,
    ...(clientPosition ?? {}),
  };
}

/** Envia intenção bancária ao servidor (requer WS aberto + sessão de mundo). */
export function requestBankTransaction(
  action: import('../ActionDispatcher.js').ClientAction,
  intentId: string,
): boolean {
  if (!activeSocket || activeSocket.readyState !== WS_OPEN) {
    return false;
  }

  const characterId = activeCharacterId;

  switch (action.type) {
    case 'DEPOSIT_ITEM':
      activeSocket.send('economy-bank-transaction', {
        ...buildBankPayloadBase(intentId, characterId, 'deposit-item'),
        itemId: action.payload.itemId,
        quantity: action.payload.quantity ?? 1,
      });
      return true;
    case 'WITHDRAW_ITEM':
      activeSocket.send('economy-bank-transaction', {
        ...buildBankPayloadBase(intentId, characterId, 'withdraw-item'),
        itemId: action.payload.itemId,
        quantity: action.payload.quantity ?? 1,
      });
      return true;
    case 'DEPOSIT_CURRENCY':
      activeSocket.send('economy-bank-transaction', {
        ...buildBankPayloadBase(intentId, characterId, 'deposit-currency'),
        currency: mapCurrency(action.payload.currency),
        amount: action.payload.amount,
      });
      return true;
    case 'WITHDRAW_CURRENCY':
      activeSocket.send('economy-bank-transaction', {
        ...buildBankPayloadBase(intentId, characterId, 'withdraw-currency'),
        currency: mapCurrency(action.payload.currency),
        amount: action.payload.amount,
      });
      return true;
    default:
      return false;
  }
}
