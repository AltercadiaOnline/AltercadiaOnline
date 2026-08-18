import { afterEach, describe, expect, it } from 'vitest';
import {
  clearPendingLootStore,
  discardPendingLootForCharacter,
  peekPendingLoot,
  stagePendingLoot,
} from './pendingLootStore.js';

afterEach(() => {
  clearPendingLootStore();
});

describe('discardPendingLootForCharacter', () => {
  it('apaga só o loot do personagem morto', () => {
    stagePendingLoot(
      {
        lootId: 'loot-a',
        sourceId: 'rat',
        winnerId: 'user-a',
        voltReward: 0,
        items: [],
      },
      1,
    );
    stagePendingLoot(
      {
        lootId: 'loot-b',
        sourceId: 'rat',
        winnerId: 'user-a',
        voltReward: 0,
        items: [],
      },
      2,
    );

    discardPendingLootForCharacter(1);

    expect(peekPendingLoot('loot-a')).toBeNull();
    expect(peekPendingLoot('loot-b')?.characterId).toBe(2);
  });
});
