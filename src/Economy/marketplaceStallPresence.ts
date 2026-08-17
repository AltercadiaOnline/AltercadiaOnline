/** Quem está no mundo — fan-out de snapshot P2P. Oferta pública vale mesmo offline. */

export type MarketplaceStallIdentity = {
  readonly playerId: string;
  readonly characterId: number;
};

function stallKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

type StallEntry = MarketplaceStallIdentity & { refs: number };

const onlineStalls = new Map<string, StallEntry>();

export function markMarketplaceStallOnline(playerId: string, characterId: number): boolean {
  const key = stallKey(playerId, characterId);
  const existing = onlineStalls.get(key);
  if (existing) {
    existing.refs += 1;
    return false;
  }
  onlineStalls.set(key, { playerId, characterId, refs: 1 });
  return true;
}

export function markMarketplaceStallOffline(playerId: string, characterId: number): boolean {
  const key = stallKey(playerId, characterId);
  const existing = onlineStalls.get(key);
  if (!existing) return false;
  existing.refs -= 1;
  if (existing.refs > 0) return false;
  onlineStalls.delete(key);
  return true;
}

export function isMarketplaceStallOnline(playerId: string, characterId: number): boolean {
  return (onlineStalls.get(stallKey(playerId, characterId))?.refs ?? 0) > 0;
}

export function listMarketplaceStallsOnline(): readonly MarketplaceStallIdentity[] {
  return [...onlineStalls.values()].map((row) => ({
    playerId: row.playerId,
    characterId: row.characterId,
  }));
}

export function resetMarketplaceStallPresence(): void {
  onlineStalls.clear();
}
