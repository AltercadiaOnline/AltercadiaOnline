import {
  ALTER_COIN_ITEM_ID,
  DOLLAR_VOLT_ITEM_ID,
} from '../../../shared/economy/premiumCurrency.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';

export type WalletCurrencyView = Pick<
  WalletSnapshot,
  'voltsFormatted' | 'alterFormatted'
>;

export function isWalletBackedCurrencyItemId(itemId: string): boolean {
  return itemId === DOLLAR_VOLT_ITEM_ID || itemId === ALTER_COIN_ITEM_ID;
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
