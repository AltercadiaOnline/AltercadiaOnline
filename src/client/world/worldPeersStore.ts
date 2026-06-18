import type { WorldPeersCompactPayload } from '../../shared/world/worldPeerWire.js';
import { isWorldPeersCompactPayload } from '../../shared/world/worldPeerWire.js';

let latestByMap = new Map<string, WorldPeersCompactPayload>();

/** Espelho local de peers visíveis (AOI) — alimentado pelo servidor via world-peers. */
export function applyWorldPeersPayload(raw: unknown): void {
  if (!isWorldPeersCompactPayload(raw)) return;
  latestByMap.set(raw.m, raw);
}

export function getWorldPeersForMap(mapId: string): WorldPeersCompactPayload | null {
  return latestByMap.get(mapId) ?? null;
}

export function resetWorldPeersStore(): void {
  latestByMap = new Map();
}
