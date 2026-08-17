export const FRIEND_LIST_MAX = 50;

export type FriendListEntry = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly addedAt: number;
};

/** Espelho para HUD — `online` é da sessão, não vai no save. */
export type FriendListViewEntry = FriendListEntry & {
  readonly online: boolean;
};

export function friendIdentityKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function sanitizeFriendDisplayName(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return 'Operative';
  return raw.slice(0, 24);
}

export function isFriendListEntry(value: unknown): value is FriendListEntry {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.playerId === 'string'
    && record.playerId.trim().length > 0
    && typeof record.characterId === 'number'
    && Number.isFinite(record.characterId)
    && record.characterId >= 1
    && typeof record.displayName === 'string'
    && typeof record.addedAt === 'number'
    && Number.isFinite(record.addedAt)
  );
}

export function sanitizeFriendList(value: unknown): FriendListEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const next: FriendListEntry[] = [];
  for (const row of value) {
    if (!isFriendListEntry(row)) continue;
    const playerId = row.playerId.trim();
    const characterId = Math.floor(row.characterId);
    const key = friendIdentityKey(playerId, characterId);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({
      playerId,
      characterId,
      displayName: sanitizeFriendDisplayName(row.displayName),
      addedAt: Math.max(0, Math.floor(row.addedAt)),
    });
    if (next.length >= FRIEND_LIST_MAX) break;
  }
  return next;
}

export function isFriendListViewEntry(value: unknown): value is FriendListViewEntry {
  return isFriendListEntry(value) && typeof (value as { online?: unknown }).online === 'boolean';
}

export function sanitizeFriendListView(value: unknown): FriendListViewEntry[] {
  if (!Array.isArray(value)) return [];
  return sanitizeFriendList(value).map((row, index) => {
    const raw = value[index];
    const online = Boolean(raw && typeof raw === 'object' && (raw as { online?: unknown }).online === true);
    return { ...row, online };
  });
}
