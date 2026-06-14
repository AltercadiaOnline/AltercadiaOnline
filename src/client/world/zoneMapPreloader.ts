import { MAP_REGISTRY, type MapId } from '../../shared/world/mapRegistry.js';
import type { Portal } from '../../shared/world/portals.js';
import { shouldPreloadPortalDestination, warmMapCollisionData } from '../../shared/world/zoneTransition.js';
import { buildMapVisualLayout, type MapVisualLayout } from './mapVisualLayouts.js';

export type PreloadedZoneAssets = {
  readonly mapId: MapId;
  readonly mapData: number[][];
  readonly layout: MapVisualLayout;
  readonly warmedAt: number;
};

/** Mapas linkados por portal — aquecidos na sessão para swap instantâneo. */
export const LINKED_EXPLORATION_MAP_IDS = Object.keys(MAP_REGISTRY) as MapId[];

let activePreloader: ZoneMapPreloader | null = null;

/**
 * Camada de link entre zonas — cache de colisão + layout visual.
 * Troca de mapa reutiliza este cache (sem regenerateData / buildLayout).
 */
export class ZoneMapPreloader {
  private readonly cache = new Map<MapId, PreloadedZoneAssets>();

  /** Aquece city + farm no boot da exploração (sync, mapas pequenos). */
  warmSessionMaps(mapIds: readonly MapId[] = LINKED_EXPLORATION_MAP_IDS): void {
    for (const mapId of mapIds) {
      this.ensureReady(mapId);
    }
  }

  tick(playerX: number, playerY: number, portals: readonly Portal[]): void {
    for (const portal of portals) {
      if (!shouldPreloadPortalDestination(playerX, playerY, portal)) continue;
      this.ensureReady(portal.targetMapId as MapId);
    }
  }

  getPreloaded(mapId: MapId): PreloadedZoneAssets | null {
    return this.cache.get(mapId) ?? null;
  }

  /** Síncrono — retorna cache ou constrói na hora. */
  ensureReady(mapId: MapId): PreloadedZoneAssets | null {
    const cached = this.cache.get(mapId);
    if (cached) return cached;

    const layout = buildMapVisualLayout(mapId);
    const mapData = warmMapCollisionData(mapId);
    if (mapData.length === 0) return null;

    const entry: PreloadedZoneAssets = {
      mapId,
      mapData,
      layout,
      warmedAt: Date.now(),
    };
    this.cache.set(mapId, entry);
    return entry;
  }

  clear(): void {
    this.cache.clear();
  }
}

export function registerZoneMapPreloader(preloader: ZoneMapPreloader): void {
  activePreloader = preloader;
}

export function unregisterZoneMapPreloader(preloader: ZoneMapPreloader): void {
  if (activePreloader === preloader) activePreloader = null;
}

export function getZoneMapPreloader(): ZoneMapPreloader | null {
  return activePreloader;
}
