import { WORLD_LORE_LONG_ABSENCE_MS } from '../../shared/world/worldLoreTypes.js';

type PresenceRecord = {
  lastSeenAt: number;
};

const presence = new Map<string, PresenceRecord>();

function presenceKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export type PlayerSessionPresence = {
  readonly previousLastSeenAt: number | null;
  readonly wasAwayLong: boolean;
};

/** Marca início de sessão — retorna última presença antes deste login. */
export function beginPlayerSession(
  playerId: string,
  characterId: number,
  now = Date.now(),
): PlayerSessionPresence {
  const key = presenceKey(playerId, characterId);
  const previousLastSeenAt = presence.get(key)?.lastSeenAt ?? null;
  const wasAwayLong =
    previousLastSeenAt !== null && now - previousLastSeenAt >= WORLD_LORE_LONG_ABSENCE_MS;

  return { previousLastSeenAt, wasAwayLong };
}

/** Atualiza última presença (logout, disconnect ou heartbeat de saída). */
export function recordPlayerLastSeen(
  playerId: string,
  characterId: number,
  now = Date.now(),
): void {
  presence.set(presenceKey(playerId, characterId), { lastSeenAt: now });
}

export function getPlayerLastSeenAt(playerId: string, characterId: number): number | null {
  return presence.get(presenceKey(playerId, characterId))?.lastSeenAt ?? null;
}

export function resetPlayerPresenceStore(): void {
  presence.clear();
}
