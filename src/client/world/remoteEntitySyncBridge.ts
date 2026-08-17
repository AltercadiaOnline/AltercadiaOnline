import type { MapId } from '../../shared/world/mapRegistry.js';
import type { PlayerSkinBundleId } from '../../shared/character/playerSkinBundle.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import {
  parseRemotePlayerSnapshots,
  type RemotePlayerCompanionSnapshot,
  type RemotePlayerSnapshot,
} from '../../shared/world/remotePlayerSync.js';
import {
  estimateRemoteServerNowMs,
  RemoteEntityInterpolator,
  type RemoteEntityClockAnchor,
  type RemoteEntityDisplayState,
} from './remoteEntityInterpolator.js';

type RemoteEntitySyncListener = (mapId: MapId) => void;

export type RemotePlayerRenderFrame = {
  readonly playerId: string;
  readonly displayName: string;
  readonly skinBundleId?: PlayerSkinBundleId;
  readonly level?: number;
  readonly companion?: RemotePlayerCompanionSnapshot;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
};

const interpolator = new RemoteEntityInterpolator();
let listener: RemoteEntitySyncListener | null = null;
let activeMapId: MapId | null = null;
let clockAnchor: RemoteEntityClockAnchor | null = null;
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

/** Aplica pacote `nearbyPlayers` do state-sync tick. */
export function applyServerRemotePlayerSnapshots(
  mapId: string,
  snapshots: readonly RemotePlayerSnapshot[],
  serverTimeMs: number,
  localNowMs: number = performance.now(),
): void {
  clockAnchor = { serverTimeMs, localMs: localNowMs };
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
  localNowMs: number = performance.now(),
): readonly RemoteEntityDisplayState[] {
  if (activeMapId !== mapId) return [];
  const serverNowMs = estimateRemoteServerNowMs(clockAnchor, localNowMs);
  return interpolator.listEntityIds()
    .map((entityId) => interpolator.sample(entityId, serverNowMs))
    .filter((state): state is RemoteEntityDisplayState => state !== null);
}

export function collectRemotePlayersForRender(
  mapId: MapId,
  localNowMs: number = performance.now(),
): readonly RemotePlayerRenderFrame[] {
  if (activeMapId !== mapId) return [];
  const snapshots = latestSnapshotsByMap.get(mapId) ?? [];
  if (snapshots.length === 0) return [];

  const displayById = new Map(
    sampleRemoteEntitiesForRender(mapId, localNowMs).map((state) => [state.entityId, state] as const),
  );

  return snapshots.map((snapshot) => {
    const display = displayById.get(snapshot.playerId);
    return {
      playerId: snapshot.playerId,
      displayName: snapshot.displayName?.trim() || 'Jogador',
      feetX: display?.feetX ?? snapshot.feetX,
      feetY: display?.feetY ?? snapshot.feetY,
      facing: display?.facing ?? snapshot.facing,
      ...(snapshot.skinBundleId ? { skinBundleId: snapshot.skinBundleId } : {}),
      ...(snapshot.level !== undefined ? { level: snapshot.level } : {}),
      ...(snapshot.companion ? { companion: snapshot.companion } : {}),
    };
  });
}

export function clearRemoteEntitySyncBridge(): void {
  latestSnapshotsByMap.clear();
  activeMapId = null;
  clockAnchor = null;
  interpolator.clear();
  listener = null;
}
