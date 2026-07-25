/**
 * Espelho visual suave das criaturas — interpola poses do state-sync (sem lógica de jogo).
 */

import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { WorldCreatureSnapshot } from '../../shared/world/worldCreatureSync.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { getEntityFeetWorldY } from '../../config/playerDesignAnchoring.js';
import { resolveCreatureTileWorldPoint } from './creatureWorldRenderer.js';
import {
  RemoteEntityInterpolator,
  type RemoteEntityDisplayState,
} from './remoteEntityInterpolator.js';

const interpolator = new RemoteEntityInterpolator();

function resolveFacing(raw: string | undefined): PlayerFacing {
  if (raw === 'north' || raw === 'east' || raw === 'west' || raw === 'south') {
    return raw;
  }
  return 'south';
}

function resolveFeetFromSnapshot(snapshot: WorldCreatureSnapshot): { x: number; y: number } {
  const tileSize = getActiveMapTileSize();
  const worldPoint =
    snapshot.worldX !== undefined && snapshot.worldY !== undefined
      ? { x: snapshot.worldX, y: snapshot.worldY }
      : resolveCreatureTileWorldPoint(snapshot.tileX, snapshot.tileY, tileSize);
  return {
    x: worldPoint.x,
    y: getEntityFeetWorldY(worldPoint, tileSize),
  };
}

/** Empurra poses autoritativas recebidas no sync (timestamp local = agora). */
export function pushCreatureDisplaySnapshots(
  snapshots: readonly WorldCreatureSnapshot[],
  nowMs: number = performance.now(),
): void {
  const alive = new Set<string>();
  for (const snapshot of snapshots) {
    alive.add(snapshot.instanceId);
    const feet = resolveFeetFromSnapshot(snapshot);
    interpolator.pushKeyframe({
      entityId: snapshot.instanceId,
      feetX: feet.x,
      feetY: feet.y,
      facing: resolveFacing(snapshot.facing),
      serverTimeMs: nowMs,
    });
  }

  for (const id of interpolator.listEntityIds()) {
    if (!alive.has(id)) {
      interpolator.removeEntity(id);
    }
  }
}

export function sampleCreatureDisplay(
  instanceId: string,
  nowMs: number = performance.now(),
): RemoteEntityDisplayState | null {
  return interpolator.sample(instanceId, nowMs);
}

export function pruneCreatureDisplay(nowMs: number = performance.now()): void {
  interpolator.prune(nowMs);
}

export function clearCreatureDisplay(): void {
  interpolator.clear();
}
