import {
  friendIdentityKey,
  sanitizeFriendListView,
  type FriendListViewEntry,
} from '../../shared/social/friendListTypes.js';

const listeners = new Set<() => void>();

let friends: FriendListViewEntry[] = [];

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeFriendList(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFriendList(): readonly FriendListViewEntry[] {
  return friends;
}

export function applyAuthoritativeFriendList(value: unknown): void {
  friends = sanitizeFriendListView(value);
  notify();
}

export function upsertFriend(entry: FriendListViewEntry): void {
  const key = friendIdentityKey(entry.playerId, entry.characterId);
  const without = friends.filter(
    (row) => friendIdentityKey(row.playerId, row.characterId) !== key,
  );
  friends = [...without, entry].sort((a, b) => a.displayName.localeCompare(b.displayName));
  notify();
}

/** Presença ao vivo — patch de um amigo sem re-sync completo. */
export function patchFriendOnlineStatus(
  playerId: string,
  characterId: number,
  online: boolean,
): void {
  const key = friendIdentityKey(playerId, characterId);
  let changed = false;
  friends = friends.map((row) => {
    if (friendIdentityKey(row.playerId, row.characterId) !== key) return row;
    if (row.online === online) return row;
    changed = true;
    return { ...row, online };
  });
  if (changed) notify();
}

export function resetFriendListStore(): void {
  friends = [];
  notify();
}
