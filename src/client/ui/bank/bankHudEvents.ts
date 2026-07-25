// @ts-nocheck
import { uiEvents, UIEventType } from '../uiEvents.js';
/** Propaga saldo formatado do cofre para a HUD (mock local ou espelho pós-servidor). */
export function emitBankBalanceUpdated(bank) {
    uiEvents.emit(UIEventType.BANK_BALANCE_UPDATED, {
        dollarVolt: bank.currencies.dollarVolt,
        alterCoins: bank.currencies.alterCoins,
        voltsFormatted: bank.voltsFormatted,
        alterFormatted: bank.alterFormatted,
        revision: bank.revision,
    });
}
