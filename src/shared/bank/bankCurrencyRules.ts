import type { BankCurrencyTypeId } from './bankConstants.js';
import { BankCurrencyType } from './bankConstants.js';

/** Limite por transação — evita overflow e abusos por valores absurdos. */
export const BANK_CURRENCY_MAX_TRANSFER_AMOUNT = 999_999_999;

export type BankCurrencyValidation =
  | { readonly ok: true; readonly currency: BankCurrencyTypeId; readonly amount: number }
  | { readonly ok: false; readonly reason: string };

export function normalizeBankCurrencyAmount(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const qty = Math.floor(amount);
  if (qty <= 0) return null;
  if (qty > BANK_CURRENCY_MAX_TRANSFER_AMOUNT) return null;
  return qty;
}

export function parseBankCurrencyTypeId(value: unknown): BankCurrencyTypeId | null {
  if (value === BankCurrencyType.Volts || value === 'volts') return BankCurrencyType.Volts;
  if (value === BankCurrencyType.Alter || value === 'alter') return BankCurrencyType.Alter;
  return null;
}

/** Valida moeda + valor antes de qualquer mutação no cofre (servidor é autoridade). */
export function validateBankCurrencyRequest(
  currency: unknown,
  amount: number,
): BankCurrencyValidation {
  const parsedCurrency = parseBankCurrencyTypeId(currency);
  if (!parsedCurrency) {
    return { ok: false, reason: 'Moeda inválida.' };
  }

  const qty = normalizeBankCurrencyAmount(amount);
  if (qty === null) {
    return {
      ok: false,
      reason: `Informe um valor entre 1 e ${BANK_CURRENCY_MAX_TRANSFER_AMOUNT.toLocaleString('pt-BR')}.`,
    };
  }

  return { ok: true, currency: parsedCurrency, amount: qty };
}
