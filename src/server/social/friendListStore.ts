import {
  FRIEND_LIST_MAX,
  friendIdentityKey,
  sanitizeFriendDisplayName,
  sanitizeFriendList,
  type FriendListEntry,
} from '../../shared/social/friendListTypes.js';
import { markCharacterPersistenceDirty } from '../persistence/characterPersistenceDirty.js';

function ownerKey(playerId: string, characterId: number): string {
  return friendIdentityKey(playerId, characterId);
}

function friendKey(playerId: string, characterId: number): string {
  return friendIdentityKey(playerId, characterId);
}

/** Lista unilateral (Tibia): A adiciona B na lista de A. B não precisa aceitar. */
const lists = new Map<string, Map<string, FriendListEntry>>();

function listOf(playerId: string, characterId: number): Map<string, FriendListEntry> {
  const key = ownerKey(playerId, characterId);
  let list = lists.get(key);
  if (!list) {
    list = new Map();
    lists.set(key, list);
  }
  return list;
}

export function hasFriend(
  ownerPlayerId: string,
  ownerCharacterId: number,
  friendPlayerId: string,
  friendCharacterId: number,
): boolean {
  return listOf(ownerPlayerId, ownerCharacterId).has(friendKey(friendPlayerId, friendCharacterId));
}

export function listFriends(playerId: string, characterId: number): FriendListEntry[] {
  return [...listOf(playerId, characterId).values()];
}

export function addFriend(
  ownerPlayerId: string,
  ownerCharacterId: number,
  entry: FriendListEntry,
): { readonly ok: true; readonly entry: FriendListEntry } | { readonly ok: false; readonly reason: string } {
  const list = listOf(ownerPlayerId, ownerCharacterId);
  const key = friendKey(entry.playerId, entry.characterId);
  if (list.has(key)) {
    return { ok: false, reason: 'Já está na sua lista de amigos.' };
  }
  if (list.size >= FRIEND_LIST_MAX) {
    return { ok: false, reason: 'Lista de amigos cheia.' };
  }
  const stored: FriendListEntry = {
    playerId: entry.playerId.trim(),
    characterId: Math.floor(entry.characterId),
    displayName: sanitizeFriendDisplayName(entry.displayName),
    addedAt: entry.addedAt,
  };
  list.set(key, stored);
  markCharacterPersistenceDirty(ownerPlayerId, ownerCharacterId, 'manual');
  return { ok: true, entry: stored };
}

export function exportFriendListPersistence(
  playerId: string,
  characterId: number,
): FriendListEntry[] {
  return sanitizeFriendList(listFriends(playerId, characterId));
}

export function hydrateFriendListPersistence(
  playerId: string,
  characterId: number,
  slice: unknown,
): void {
  const sanitized = sanitizeFriendList(slice);
  const list = new Map<string, FriendListEntry>();
  for (const entry of sanitized) {
    list.set(friendKey(entry.playerId, entry.characterId), entry);
  }
  lists.set(ownerKey(playerId, characterId), list);
}

export function resetFriendListStore(): void {
  lists.clear();
}
