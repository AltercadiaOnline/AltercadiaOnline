import { describe, expect, it } from 'vitest';
import {
  FRIEND_LIST_MAX,
  friendIdentityKey,
  sanitizeFriendDisplayName,
  sanitizeFriendList,
} from './friendListTypes.js';

describe('friendListTypes', () => {
  it('sanitiza nomes e ignora entradas inválidas', () => {
    const list = sanitizeFriendList([
      { playerId: ' a ', characterId: 2, displayName: '  Nyx  ', addedAt: 10 },
      { playerId: '', characterId: 1, displayName: 'x', addedAt: 1 },
      { playerId: 'a', characterId: 2, displayName: 'dup', addedAt: 99 },
    ]);
    expect(list).toEqual([
      { playerId: 'a', characterId: 2, displayName: 'Nyx', addedAt: 10 },
    ]);
    expect(friendIdentityKey('a', 2)).toBe('a:2');
    expect(sanitizeFriendDisplayName('')).toBe('Operative');
  });

  it('respeita o teto da lista', () => {
    const rows = Array.from({ length: FRIEND_LIST_MAX + 8 }, (_, i) => ({
      playerId: `p${i}`,
      characterId: 1,
      displayName: `n${i}`,
      addedAt: i,
    }));
    expect(sanitizeFriendList(rows)).toHaveLength(FRIEND_LIST_MAX);
  });
});
