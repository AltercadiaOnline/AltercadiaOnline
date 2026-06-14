import type { BankCurrencyTypeId } from './bankConstants.js';
import type { BankCurrencyBalances } from './bankTypes.js';
import type { BankWalletSnapshot } from './bankService.js';
import { depositCurrencySwap, withdrawCurrencySwap } from './bankService.js';

export type CurrencyLocation = 'wallet' | 'vault';
export type CurrencyKind = 'volts' | 'coins';

function toBankCurrencyType(kind: CurrencyKind): BankCurrencyTypeId {
  return kind === 'volts' ? 'volts' : 'alter';
}

/**
 * Transfere moeda entre carteira e cofre.
 * `from: 'wallet'` = depósito; `from: 'vault'` = saque.
 */
export function transferCurrency(
  amount: number,
  from: CurrencyLocation,
  type: CurrencyKind,
  wallet: BankWalletSnapshot,
  bankCurrencies: BankCurrencyBalances,
) {
  const currency = toBankCurrencyType(type);
  if (from === 'wallet') {
    return depositCurrencySwap(wallet, bankCurrencies, currency, amount);
  }
  return withdrawCurrencySwap(wallet, bankCurrencies, currency, amount);
}
