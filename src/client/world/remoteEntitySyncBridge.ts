import type { MapId } from '../../shared/world/mapRegistry.js';
import {
  parseRemotePlayerSnapshots,
  type RemotePlayerSnapshot,
} from '../../shared/world/remotePlayerSync.js';
import {
  RemoteEntityInterpolator,
  type RemoteEntityDisplayState,
} from './remoteEntityInterpolator.js';

type RemoteEntitySyncListener = (mapId: MapId) => void;

const interpolator = new RemoteEntityInterpolator();
let listener: RemoteEntitySyncListener | null = null;
let activeMapId: MapId | null = null;
const latestSnapshotsByMap = new Map<string, readonly RemotePlayerSnapshot[]>();

export function setRemoteEntitySyncListener(next: RemoteEntitySyncListener | null): void {
  listener = next;
}

export function getRemoteEntityInterpolator(): RemoteEntityInterpolator {
  return interpolator;
}

export function getAuthoritativeRemotePlayerSnapshots(mapId: MapId): readonly RemotePlayerSnapshot[] {
  return latestSnapshotsByMap.get(mapId) ?? [];
}

/** Aplica pacote `nearbyPlayers` do state-sync tick (quando o servidor passar a enviar). */
export function applyServerRemotePlayerSnapshots(
  mapId: string,
  snapshots: readonly RemotePlayerSnapshot[],
  serverTimeMs: number,
): void {
  const resolvedMapId = mapId as MapId;
  activeMapId = resolvedMapId;
  latestSnapshotsByMap.set(resolvedMapId, [...snapshots]);

  const seen = new Set<string>();
  for (const snapshot of snapshots) {
    seen.add(snapshot.playerId);
    interpolator.pushRemotePlayerSnapshot({
      ...snapshot,
      serverTimeMs: snapshot.serverTimeMs > 0 ? snapshot.serverTimeMs : serverTimeMs,
    });
  }

  for (const entityId of interpolator.listEntityIds()) {
    if (!seen.has(entityId)) {
      interpolator.removeEntity(entityId);
    }
  }

  interpolator.prune(serverTimeMs);
  listener?.(resolvedMapId);
}

export function parseAndApplyRemotePlayerSnapshots(
  mapId: string,
  raw: unknown,
  serverTimeMs: number,
): boolean {
  const snapshots = parseRemotePlayerSnapshots(raw);
  if (!snapshots) return false;
  applyServerRemotePlayerSnapshots(mapId, snapshots, serverTimeMs);
  return true;
}

export function sampleRemoteEntitiesForRender(
  mapId: MapId,
  nowMs: number = performance.now(),
): readonly RemoteEntityDisplayState[] {
  if (activeMapId !== mapId) return [];
  return interpolator.listEntityIds()
    .map((entityId) => interpolator.sample(entityId, nowMs))
    .filter((state): state is RemoteEntityDisplayState => state !== null);
}

export function clearRemoteEntitySyncBridge(): void {
  latestSnapshotsByMap.clear();
  activeMapId = null;
  interpolator.clear();
  listener = null;
}
