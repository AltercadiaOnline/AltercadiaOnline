import type { MapId } from '../../shared/world/mapRegistry.js';

/** Mapas Tiled que voltaram ao canvas legado — exibir layout procedural até Phaser montar. */
const proceduralFallbackMapIds = new Set<MapId>();

export type PhaserCanvasFallbackListener = (mapId: MapId) => void;

const listeners = new Set<PhaserCanvasFallbackListener>();

export function isPhaserCanvasProceduralFallback(mapId: MapId): boolean {
  return proceduralFallbackMapIds.has(mapId);
}

export function markPhaserCanvasProceduralFallback(mapId: MapId): void {
  if (proceduralFallbackMapIds.has(mapId)) return;
  proceduralFallbackMapIds.add(mapId);
  for (const listener of listeners) {
    listener(mapId);
  }
}

export function clearPhaserCanvasProceduralFallback(mapId?: MapId): void {
  if (mapId) {
    proceduralFallbackMapIds.delete(mapId);
    return;
  }
  proceduralFallbackMapIds.clear();
}

export function subscribePhaserCanvasProceduralFallback(
  listener: PhaserCanvasFallbackListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
