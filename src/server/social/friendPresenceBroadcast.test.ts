import { describe, expect, it, beforeEach } from 'vitest';
import {
  bindFriendPresenceBroadcast,
  notifyFriendPresenceChange,
  unbindFriendPresenceBroadcast,
} from './friendPresenceBroadcast.js';
import { addFriend, resetFriendListStore } from './friendListStore.js';

describe('friendPresenceBroadcast', () => {
  beforeEach(() => {
    resetFriendListStore();
    unbindFriendPresenceBroadcast();
  });

  it('notifica sessões que têm o jogador na lista de amigos', () => {
    addFriend('viewer', 1, {
      playerId: 'friend',
      characterId: 2,
      displayName: 'Friend',
      addedAt: 1,
    });

    const delivered: string[] = [];
    bindFriendPresenceBroadcast({
      deliver: (connectionId) => {
        delivered.push(connectionId);
      },
      listWorldSessions: () => [
        { connectionId: 'c-viewer', playerId: 'viewer', characterId: 1 },
        { connectionId: 'c-other', playerId: 'other', characterId: 1 },
      ],
    });

    notifyFriendPresenceChange('friend', 2, true);

    expect(delivered).toEqual(['c-viewer']);
  });

  it('não notifica o próprio jogador', () => {
    addFriend('viewer', 1, {
      playerId: 'friend',
      characterId: 2,
      displayName: 'Friend',
      addedAt: 1,
    });

    const delivered: string[] = [];
    bindFriendPresenceBroadcast({
      deliver: (connectionId) => {
        delivered.push(connectionId);
      },
      listWorldSessions: () => [
        { connectionId: 'c-friend', playerId: 'friend', characterId: 2 },
        { connectionId: 'c-viewer', playerId: 'viewer', characterId: 1 },
      ],
    });

    notifyFriendPresenceChange('friend', 2, true);

    expect(delivered).toEqual(['c-viewer']);
  });
});
