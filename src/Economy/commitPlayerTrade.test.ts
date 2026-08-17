import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAuthoritativeWalletBalances,
  getCharacterInventoryStacks,
  getPlayerWallet,
  resetEconomyStore,
  setCharacterInventoryStacks,
} from './economyStore.js';
import {
  commitAuthoritativePlayerTrade,
  replaceTradeSideReservation,
} from './economyGateway.js';

const ITEM_A = 'bones';
const ITEM_B = 'scale';
const partyA = { playerId: 'trader-a', characterId: 1 };
const partyB = { playerId: 'trader-b', characterId: 1 };

afterEach(() => {
  resetEconomyStore();
});

function bagItems(playerId: string, characterId: number) {
  return getCharacterInventoryStacks(playerId, characterId).filter(
    (row) => row.itemId !== 'dollar_volt' && row.itemId !== 'alter_coin',
  );
}

describe('commitAuthoritativePlayerTrade', () => {
  it('só move itens após reserva nos dois lados', async () => {
    setCharacterInventoryStacks(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 2 }]);
    setCharacterInventoryStacks(partyB.playerId, partyB.characterId, [{ itemId: ITEM_B, quantity: 1 }]);
    applyAuthoritativeWalletBalances(partyA.playerId, partyA.characterId, 40, 0);
    applyAuthoritativeWalletBalances(partyB.playerId, partyB.characterId, 5, 0);

    const lockA = await replaceTradeSideReservation(
      partyA.playerId,
      partyA.characterId,
      { items: [], volts: 0 },
      { items: [{ itemId: ITEM_A, quantity: 2 }], volts: 10 },
    );
    const lockB = await replaceTradeSideReservation(
      partyB.playerId,
      partyB.characterId,
      { items: [], volts: 0 },
      { items: [{ itemId: ITEM_B, quantity: 1 }], volts: 0 },
    );
    expect(lockA.ok).toBe(true);
    expect(lockB.ok).toBe(true);
    expect(bagItems(partyA.playerId, partyA.characterId)[0]?.lockedQuantity).toBe(2);
    expect(getPlayerWallet(partyA.playerId, partyA.characterId).lockedDollarVolt).toBe(10);

    const commit = await commitAuthoritativePlayerTrade({
      partyA,
      partyB,
      offerA: { items: [{ itemId: ITEM_A, quantity: 2 }], volts: 10 },
      offerB: { items: [{ itemId: ITEM_B, quantity: 1 }], volts: 0 },
    });
    expect(commit.ok).toBe(true);
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([
      { itemId: ITEM_B, quantity: 1 },
    ]);
    expect(bagItems(partyB.playerId, partyB.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 2 },
    ]);
    expect(getPlayerWallet(partyA.playerId, partyA.characterId).dollarVolt).toBe(30);
    expect(getPlayerWallet(partyB.playerId, partyB.characterId).dollarVolt).toBe(15);
  });

  it('recusa commit se o item não estiver reservado (anti-spoof)', async () => {
    setCharacterInventoryStacks(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 1 }]);
    setCharacterInventoryStacks(partyB.playerId, partyB.characterId, []);
    const commit = await commitAuthoritativePlayerTrade({
      partyA,
      partyB,
      offerA: { items: [{ itemId: ITEM_A, quantity: 1 }], volts: 0 },
      offerB: { items: [], volts: 0 },
    });
    expect(commit.ok).toBe(false);
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 1 },
    ]);
    expect(bagItems(partyB.playerId, partyB.characterId)).toEqual([]);
  });
});
