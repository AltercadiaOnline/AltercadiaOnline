import { describe, expect, it } from 'vitest';
import {
  ALTER_COIN_ITEM_ID,
  DOLLAR_VOLT_ITEM_ID,
} from './premiumCurrency.js';
import {
  isWalletCurrencyItemId,
  mirrorWalletCurrencyStacks,
} from './walletCurrencyInventoryMirror.js';

describe('walletCurrencyInventoryMirror', () => {
  it('identifies wallet currency item ids', () => {
    expect(isWalletCurrencyItemId(DOLLAR_VOLT_ITEM_ID)).toBe(true);
    expect(isWalletCurrencyItemId(ALTER_COIN_ITEM_ID)).toBe(true);
    expect(isWalletCurrencyItemId('potion_hp')).toBe(false);
  });

  it('inserts currency stacks when wallet has balance and bag is empty', () => {
    const next = mirrorWalletCurrencyStacks([], { dollarVolt: 6, alterCoins: 2 });
    expect(next).toEqual([
      { itemId: DOLLAR_VOLT_ITEM_ID, quantity: 6 },
      { itemId: ALTER_COIN_ITEM_ID, quantity: 2 },
    ]);
  });

  it('updates existing currency stack in place and drops orphans', () => {
    const next = mirrorWalletCurrencyStacks(
      [
        { itemId: 'herb_a', quantity: 1 },
        { itemId: DOLLAR_VOLT_ITEM_ID, quantity: 1 },
        { itemId: DOLLAR_VOLT_ITEM_ID, quantity: 99 },
        { itemId: 'herb_b', quantity: 2 },
      ],
      { dollarVolt: 250, alterCoins: 0 },
    );
    expect(next).toEqual([
      { itemId: 'herb_a', quantity: 1 },
      { itemId: DOLLAR_VOLT_ITEM_ID, quantity: 250 },
      { itemId: 'herb_b', quantity: 2 },
    ]);
  });

  it('removes currency stacks when wallet balance is zero', () => {
    const next = mirrorWalletCurrencyStacks(
      [
        { itemId: DOLLAR_VOLT_ITEM_ID, quantity: 10 },
        { itemId: ALTER_COIN_ITEM_ID, quantity: 1 },
        { itemId: 'herb_a', quantity: 1 },
      ],
      { dollarVolt: 0, alterCoins: 0 },
    );
    expect(next).toEqual([{ itemId: 'herb_a', quantity: 1 }]);
  });
});
