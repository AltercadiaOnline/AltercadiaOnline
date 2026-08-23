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
  resolveRemoteRenderDelayMs,
  remotePlayerEntityId,
  type RemoteEntityClockAnchor,
  type RemoteEntityDisplayState,
} from './remoteEntityInterpolator.js';
import { getMovementNetTelemetry } from './movementNetTelemetry.js';
import { resolveWorldLoreCredentials } from '../services/worldLoreCredentials.js';

type RemoteEntitySyncListener = (mapId: MapId) => void;

export type RemotePlayerRenderFrame = {
  readonly playerId: string;
  readonly characterId: number;
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
  const local = resolveLocalIdentityForRemotes();
  const withoutSelf = local
    ? snapshots.filter(
      (row) => !(row.playerId === local.playerId && row.characterId === local.characterId),
    )
    : snapshots;
  latestSnapshotsByMap.set(resolvedMapId, [...withoutSelf]);

  const seen = new Set<string>();
  for (const snapshot of withoutSelf) {
    const entityId = remotePlayerEntityId(snapshot.playerId, snapshot.characterId);
    seen.add(entityId);
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
  const renderDelayMs = resolveRemoteRenderDelayMs(getMovementNetTelemetry().getSnapshot().rttMs);
  return interpolator.listEntityIds()
    .map((entityId) => interpolator.sample(entityId, serverNowMs, renderDelayMs))
    .filter((state): state is RemoteEntityDisplayState => state !== null);
}

export function collectRemotePlayersForRender(
  mapId: MapId,
  localNowMs: number = performance.now(),
): readonly RemotePlayerRenderFrame[] {
  if (activeMapId !== mapId) return [];
  const snapshots = latestSnapshotsByMap.get(mapId) ?? [];
  if (snapshots.length === 0) return [];

  const local = resolveLocalIdentityForRemotes();
  const displayById = new Map(
    sampleRemoteEntitiesForRender(mapId, localNowMs).map((state) => [state.entityId, state] as const),
  );

  return snapshots
    .filter((snapshot) =>
      !local
      || !(snapshot.playerId === local.playerId && snapshot.characterId === local.characterId),
    )
    .map((snapshot) => {
      const entityId = remotePlayerEntityId(snapshot.playerId, snapshot.characterId);
      const display = displayById.get(entityId);
      return {
        playerId: snapshot.playerId,
        characterId: snapshot.characterId,
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

function resolveLocalIdentityForRemotes(): { playerId: string; characterId: number } | null {
  try {
    const creds = resolveWorldLoreCredentials();
    return { playerId: creds.playerId, characterId: creds.characterId };
  } catch {
    return null;
  }
}

export function clearRemoteEntitySyncBridge(): void {
  latestSnapshotsByMap.clear();
  activeMapId = null;
  clockAnchor = null;
  interpolator.clear();
  listener = null;
}
