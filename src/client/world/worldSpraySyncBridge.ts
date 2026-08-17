import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  parseWorldSpraySnapshots,
  type WorldSpraySnapshot,
} from '../../shared/social/spraySocialTypes.js';
import { pointHitsSprayPick } from '../../shared/social/sprayOverlap.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';

type SprayMirrorListener = () => void;

const spraysByMap = new Map<string, readonly WorldSpraySnapshot[]>();
const listeners = new Set<SprayMirrorListener>();
let revision = 0;

function notify(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

export function subscribeWorldSprayMirror(listener: SprayMirrorListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorldSprayMirrorRevision(): number {
  return revision;
}

export function getAllMirroredSprays(): readonly WorldSpraySnapshot[] {
  const all: WorldSpraySnapshot[] = [];
  for (const rows of spraysByMap.values()) {
    all.push(...rows);
  }
  return all;
}

export function getWorldSpraysForMap(mapId: string): readonly WorldSpraySnapshot[] {
  return spraysByMap.get(mapId) ?? [];
}

export function applyWorldSpraySnapshots(
  mapId: string,
  snapshots: readonly WorldSpraySnapshot[],
): void {
  spraysByMap.set(mapId, snapshots);
  notify();
}

export function parseAndApplyWorldSpraySnapshots(mapId: string, raw: unknown): void {
  const parsed = parseWorldSpraySnapshots(raw);
  if (!parsed) return;
  applyWorldSpraySnapshots(mapId, parsed);
}

export function pickWorldSprayAt(
  mapId: MapId | string,
  worldX: number,
  worldY: number,
): WorldSpraySnapshot | null {
  const tileSize = resolveMapTileSize(mapId);
  const sprays = getWorldSpraysForMap(mapId);
  for (let i = sprays.length - 1; i >= 0; i -= 1) {
    const spray = sprays[i];
    if (!spray) continue;
    if (pointHitsSprayPick(worldX, worldY, spray.tileX, spray.tileY, tileSize)) {
      return spray;
    }
  }
  return null;
}

export function resetWorldSprayMirror(): void {
  spraysByMap.clear();
  notify();
}
