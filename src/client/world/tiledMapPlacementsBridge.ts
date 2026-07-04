import type { MapId } from '../../shared/world/mapRegistry.js';

type TiledPlacementsListener = (mapId: MapId) => void;

const listeners = new Set<TiledPlacementsListener>();

/** MapLoader confirmou placements após montar o mapa Phaser. */
export function notifyTiledMapPlacementsCommitted(mapId: MapId): void {
  for (const listener of listeners) {
    listener(mapId);
  }
}

export function subscribeTiledMapPlacementsCommitted(
  listener: TiledPlacementsListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
