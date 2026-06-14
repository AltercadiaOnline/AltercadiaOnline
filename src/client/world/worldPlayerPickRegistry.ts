import { NPC_INTERACTION_RADIUS_TILES } from '../../shared/world/npcRegistry.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';

export type WorldPlayerPickEntry = {
  readonly playerId: string;
  readonly displayName: string;
  readonly worldX: number;
  readonly worldY: number;
};

const entries = new Map<string, WorldPlayerPickEntry>();

export function registerWorldPlayerPick(entry: WorldPlayerPickEntry): () => void {
  entries.set(entry.playerId, entry);
  return () => {
    entries.delete(entry.playerId);
  };
}

export function updateWorldPlayerPickPosition(
  playerId: string,
  worldX: number,
  worldY: number,
): void {
  const current = entries.get(playerId);
  if (!current) return;
  entries.set(playerId, { ...current, worldX, worldY });
}

export function clearWorldPlayerPicks(): void {
  entries.clear();
}

export function getWorldPlayerPickById(playerId: string): WorldPlayerPickEntry | null {
  return entries.get(playerId) ?? null;
}

export function pickWorldPlayerAt(tileX: number, tileY: number): WorldPlayerPickEntry | null {
  let closest: WorldPlayerPickEntry | null = null;
  let closestDistance = NPC_INTERACTION_RADIUS_TILES + 1;

  const tileSize = getActiveMapTileSize();
  for (const entry of entries.values()) {
    const entryTileX = entry.worldX / tileSize;
    const entryTileY = entry.worldY / tileSize;
    const distance = Math.hypot(entryTileX - tileX, entryTileY - tileY);
    if (distance <= NPC_INTERACTION_RADIUS_TILES && distance < closestDistance) {
      closest = entry;
      closestDistance = distance;
    }
  }

  return closest;
}

export function isWorldPlayerWithinInteractionRadius(
  entry: WorldPlayerPickEntry,
  worldX: number,
  worldY: number,
): boolean {
  const tileSize = getActiveMapTileSize();
  const playerTileX = worldX / tileSize;
  const playerTileY = worldY / tileSize;
  const entryTileX = entry.worldX / tileSize;
  const entryTileY = entry.worldY / tileSize;
  return Math.hypot(entryTileX - playerTileX, entryTileY - playerTileY) <= NPC_INTERACTION_RADIUS_TILES;
}
