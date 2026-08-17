import { afterEach, describe, expect, it } from 'vitest';
import {
  applyAuthoritativeWalletBalances,
  executeEconomyTransaction,
  executeTwoPartyEconomyTransaction,
  getCharacterInventoryStacks,
  getPlayerWallet,
  resetEconomyStore,
  setCharacterInventoryStacks,
} from './economyStore.js';

const ITEM_A = 'bones';
const ITEM_B = 'scale';

const partyA = { playerId: 'user-a', characterId: 1 };
const partyB = { playerId: 'user-b', characterId: 1 };

afterEach(() => {
  resetEconomyStore();
});

function seedParty(
  playerId: string,
  characterId: number,
  items: { itemId: string; quantity: number }[],
  volts: number,
): void {
  setCharacterInventoryStacks(playerId, characterId, items);
  applyAuthoritativeWalletBalances(playerId, characterId, volts, 0);
}

function bagItems(playerId: string, characterId: number) {
  return getCharacterInventoryStacks(playerId, characterId).filter(
    (row) => row.itemId !== 'dollar_volt' && row.itemId !== 'alter_coin',
  );
}

describe('executeTwoPartyEconomyTransaction', () => {
  it('troca itens e VOLTS nos dois lados', async () => {
    seedParty(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 2 }], 50);
    seedParty(partyB.playerId, partyB.characterId, [{ itemId: ITEM_B, quantity: 1 }], 10);

    const tx = await executeTwoPartyEconomyTransaction(partyA, partyB, (a, b) => {
      a.consumeInventoryItem(ITEM_A, 2);
      b.consumeInventoryItem(ITEM_B, 1);
      a.spendDollarVolt(30);
      b.addInventoryItem(ITEM_A, 2);
      a.addInventoryItem(ITEM_B, 1);
      b.addDollarVolt(30);
    });

    expect(tx.ok).toBe(true);
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([
      { itemId: ITEM_B, quantity: 1 },
    ]);
    expect(bagItems(partyB.playerId, partyB.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 2 },
    ]);
    expect(getPlayerWallet(partyA.playerId, partyA.characterId).dollarVolt).toBe(20);
    expect(getPlayerWallet(partyB.playerId, partyB.characterId).dollarVolt).toBe(40);
  });

  it('restaura os dois lados se o segundo falhar', async () => {
    seedParty(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 1 }], 10);
    seedParty(partyB.playerId, partyB.characterId, [{ itemId: ITEM_B, quantity: 1 }], 10);

    const tx = await executeTwoPartyEconomyTransaction(partyA, partyB, (a, b) => {
      a.consumeInventoryItem(ITEM_A, 1);
      b.addInventoryItem(ITEM_A, 1);
      throw new Error('capacidade recusada');
    });

    expect(tx.ok).toBe(false);
    if (!tx.ok) expect(tx.message).toBe('capacidade recusada');
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 1 },
    ]);
    expect(bagItems(partyB.playerId, partyB.characterId)).toEqual([
      { itemId: ITEM_B, quantity: 1 },
    ]);
  });

  it('serializa duas txs paralelas e não duplica o stack', async () => {
    seedParty(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 1 }], 0);
    seedParty(partyB.playerId, partyB.characterId, [], 0);

    const run = () => executeTwoPartyEconomyTransaction(partyA, partyB, async (a, b) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      a.consumeInventoryItem(ITEM_A, 1);
      b.addInventoryItem(ITEM_A, 1);
    });

    const [first, second] = await Promise.all([run(), run()]);
    const okCount = [first, second].filter((row) => row.ok).length;
    expect(okCount).toBe(1);
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([]);
    expect(bagItems(partyB.playerId, partyB.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 1 },
    ]);
  });

  it('rollback profundo também na tx de um jogador', async () => {
    seedParty(partyA.playerId, partyA.characterId, [{ itemId: ITEM_A, quantity: 3 }], 40);
    const tx = await executeEconomyTransaction(partyA.playerId, partyA.characterId, (store) => {
      store.removeInventoryItem(ITEM_A, 2);
      store.spendDollarVolt(15);
      throw new Error('abort');
    });
    expect(tx.ok).toBe(false);
    expect(bagItems(partyA.playerId, partyA.characterId)).toEqual([
      { itemId: ITEM_A, quantity: 3 },
    ]);
    expect(getPlayerWallet(partyA.playerId, partyA.characterId).dollarVolt).toBe(40);
  });
});
