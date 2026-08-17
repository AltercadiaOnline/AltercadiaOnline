import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAuthoritativeWalletBalances,
  getCharacterInventoryStacks,
  resetEconomyStore,
  setCharacterInventoryStacks,
} from './economyStore.js';
import { getGlobalMarketListing, resetGlobalMarketplaceStore } from './globalMarketplaceStore.js';
import { getMarketplaceListings, resetMarketplaceStore } from './marketplaceStore.js';
import {
  cancelMarketListingAuthoritative,
  createMarketListingAuthoritative,
  executeMarketPurchaseAuthoritative,
} from './marketplaceGateway.js';

const ITEM = 'bones';
const seller = { playerId: 'mkt-seller', characterId: 1 };
const buyer = { playerId: 'mkt-buyer', characterId: 1 };

afterEach(() => {
  resetEconomyStore();
  resetMarketplaceStore();
  resetGlobalMarketplaceStore();
});

function bagItems(playerId: string, characterId: number) {
  return getCharacterInventoryStacks(playerId, characterId).filter(
    (row) => row.itemId !== 'dollar_volt' && row.itemId !== 'alter_coin',
  );
}

describe('marketplaceGateway compensating', () => {
  it('anunciar tira da bag e cancelar devolve', async () => {
    setCharacterInventoryStacks(seller.playerId, seller.characterId, [{ itemId: ITEM, quantity: 2 }]);
    const listed = await createMarketListingAuthoritative(
      seller.playerId,
      seller.characterId,
      ITEM,
      1,
      10,
      false,
    );
    expect(listed.ok).toBe(true);
    expect(bagItems(seller.playerId, seller.characterId)).toEqual([{ itemId: ITEM, quantity: 1 }]);

    const listing = getMarketplaceListings(seller.playerId, seller.characterId)[0];
    expect(listing).toBeDefined();
    if (!listing) return;
    const cancelled = await cancelMarketListingAuthoritative(
      seller.playerId,
      seller.characterId,
      listing.id,
    );
    expect(cancelled.ok).toBe(true);
    expect(bagItems(seller.playerId, seller.characterId)).toEqual([{ itemId: ITEM, quantity: 2 }]);
  });

  it('não anuncia quantidade travada em trade', async () => {
    setCharacterInventoryStacks(seller.playerId, seller.characterId, [
      { itemId: ITEM, quantity: 1, lockedQuantity: 1 },
    ]);
    const listed = await createMarketListingAuthoritative(
      seller.playerId,
      seller.characterId,
      ITEM,
      1,
      10,
      false,
    );
    expect(listed.ok).toBe(false);
    expect(bagItems(seller.playerId, seller.characterId)).toEqual([
      { itemId: ITEM, quantity: 1, lockedQuantity: 1 },
    ]);
    expect(getMarketplaceListings(seller.playerId, seller.characterId)).toEqual([]);
  });

  it('compra sem VOLTS não consome o anúncio', async () => {
    setCharacterInventoryStacks(seller.playerId, seller.characterId, [{ itemId: ITEM, quantity: 1 }]);
    applyAuthoritativeWalletBalances(buyer.playerId, buyer.characterId, 0, 0);
    const listed = await createMarketListingAuthoritative(
      seller.playerId,
      seller.characterId,
      ITEM,
      1,
      25,
      false,
    );
    expect(listed.ok).toBe(true);
    const listing = getMarketplaceListings(seller.playerId, seller.characterId)[0];
    expect(listing).toBeDefined();
    if (!listing) return;
    const purchase = await executeMarketPurchaseAuthoritative(
      buyer.playerId,
      buyer.characterId,
      listing.id,
    );
    expect(purchase.ok).toBe(false);
    expect(getGlobalMarketListing(listing.id)?.status).toBe('LISTED');
    expect(bagItems(buyer.playerId, buyer.characterId)).toEqual([]);
  });
});
