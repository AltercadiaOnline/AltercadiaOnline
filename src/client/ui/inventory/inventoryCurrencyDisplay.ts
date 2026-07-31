import {
  ALTER_COIN_ITEM_ID,
  DOLLAR_VOLT_ITEM_ID,
  formatAlterCoins,
  formatVolts,
} from '../../../shared/economy/premiumCurrency.js';
import { isWalletCurrencyItemId } from '../../../shared/economy/walletCurrencyInventoryMirror.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';

export type WalletCurrencyView = Pick<
  WalletSnapshot,
  'voltsFormatted' | 'alterFormatted'
>;

export function isWalletBackedCurrencyItemId(itemId: string): boolean {
  return isWalletCurrencyItemId(itemId);
}

/** Rótulo do badge — mesmo texto exibido nas HUDs de carteira. */
export function resolveWalletCurrencySlotQtyLabel(
  itemId: string,
  wallet: WalletCurrencyView,
): string | null {
  if (itemId === DOLLAR_VOLT_ITEM_ID) return wallet.voltsFormatted;
  if (itemId === ALTER_COIN_ITEM_ID) return wallet.alterFormatted;
  return null;
}

/** Formata qty do stack de moeda (fallback se carteira ainda não chegou). */
export function formatCurrencyStackQtyLabel(itemId: string, quantity: number): string | null {
  if (itemId === DOLLAR_VOLT_ITEM_ID) return formatVolts(quantity);
  if (itemId === ALTER_COIN_ITEM_ID) return formatAlterCoins(quantity);
  return null;
}
