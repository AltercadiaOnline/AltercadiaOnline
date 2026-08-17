import { afterEach, describe, expect, it } from 'vitest';
import {
  getCharacterInventoryStacks,
  hasCharacterEconomyLoaded,
  resetEconomyStore,
  setCharacterInventoryStacks,
} from './economyStore.js';
import { commitAuthoritativeGiftTransfer } from './economyGateway.js';

const ITEM = 'bones';
const sender = { playerId: 'gift-sender', characterId: 1 };
const target = { playerId: 'gift-target', characterId: 2 };

afterEach(() => {
  resetEconomyStore();
});

function bagItems(playerId: string, characterId: number) {
  return getCharacterInventoryStacks(playerId, characterId).filter(
    (row) => row.itemId !== 'dollar_volt' && row.itemId !== 'alter_coin',
  );
}

describe('commitAuthoritativeGiftTransfer', () => {
  it('move o item nos dois lados na mesma transação', async () => {
    setCharacterInventoryStacks(sender.playerId, sender.characterId, [{ itemId: ITEM, quantity: 3 }]);
    setCharacterInventoryStacks(target.playerId, target.characterId, []);

    const result = await commitAuthoritativeGiftTransfer({
      senderPlayerId: sender.playerId,
      senderCharacterId: sender.characterId,
      targetPlayerId: target.playerId,
      targetCharacterId: target.characterId,
      itemId: ITEM,
      quantity: 2,
    });

    expect(result.ok).toBe(true);
    expect(bagItems(sender.playerId, sender.characterId)).toEqual([{ itemId: ITEM, quantity: 1 }]);
    expect(bagItems(target.playerId, target.characterId)).toEqual([{ itemId: ITEM, quantity: 2 }]);
  });

  it('recusa se o destinatário não estiver hidratado — não cria perfil vazio', async () => {
    setCharacterInventoryStacks(sender.playerId, sender.characterId, [{ itemId: ITEM, quantity: 1 }]);
    expect(hasCharacterEconomyLoaded(target.playerId, target.characterId)).toBe(false);

    const result = await commitAuthoritativeGiftTransfer({
      senderPlayerId: sender.playerId,
      senderCharacterId: sender.characterId,
      targetPlayerId: target.playerId,
      targetCharacterId: target.characterId,
      itemId: ITEM,
      quantity: 1,
    });

    expect(result.ok).toBe(false);
    expect(hasCharacterEconomyLoaded(target.playerId, target.characterId)).toBe(false);
    expect(bagItems(sender.playerId, sender.characterId)).toEqual([{ itemId: ITEM, quantity: 1 }]);
  });

  it('recusa presente para si mesmo', async () => {
    setCharacterInventoryStacks(sender.playerId, sender.characterId, [{ itemId: ITEM, quantity: 1 }]);
    const result = await commitAuthoritativeGiftTransfer({
      senderPlayerId: sender.playerId,
      senderCharacterId: sender.characterId,
      targetPlayerId: sender.playerId,
      targetCharacterId: sender.characterId,
      itemId: ITEM,
      quantity: 1,
    });
    expect(result.ok).toBe(false);
    expect(bagItems(sender.playerId, sender.characterId)).toEqual([{ itemId: ITEM, quantity: 1 }]);
  });

  it('não gasta stack reservada (lockedQuantity)', async () => {
    setCharacterInventoryStacks(sender.playerId, sender.characterId, [
      { itemId: ITEM, quantity: 1, lockedQuantity: 1 },
    ]);
    setCharacterInventoryStacks(target.playerId, target.characterId, []);

    const result = await commitAuthoritativeGiftTransfer({
      senderPlayerId: sender.playerId,
      senderCharacterId: sender.characterId,
      targetPlayerId: target.playerId,
      targetCharacterId: target.characterId,
      itemId: ITEM,
      quantity: 1,
    });

    expect(result.ok).toBe(false);
    expect(bagItems(sender.playerId, sender.characterId)).toEqual([
      { itemId: ITEM, quantity: 1, lockedQuantity: 1 },
    ]);
    expect(bagItems(target.playerId, target.characterId)).toEqual([]);
  });
});
