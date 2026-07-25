import { getActiveMapTileSize } from './activeMapTileSize.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import { canPlayerWalkAt, type WorldPosition } from './movement.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';

/** Tolerância ampliada em mapas Construct alongados (ex.: Beco dos Fundos). */
export const NARROW_CORRIDOR_SNAP_TOLERANCE_RATIO = 0.85;

/** Limite de drift enquanto em movimento antes de correção forçada. */
export const NARROW_CORRIDOR_MOVING_RECONCILE_RATIO = 1.5;

export function isNarrowCorridorMap(mapId: string | undefined): boolean {
  return mapId === FARM_ZONE_01_ID;
}

/** @deprecated Corredor Tiled removido — Construct governa o espaço; sempre false. */
export function isNarrowCorridorTile(
  _mapId: string | undefined,
  _tileX: number,
  _tileY: number,
): boolean {
  return false;
}

export function resolvePositionReconcileThresholds(mapId: string | undefined): {
  readonly idleSnapPx: number;
  readonly movingReconcilePx: number;
} {
  const tileSize = getActiveMapTileSize();
  if (isNarrowCorridorMap(mapId)) {
    return {
      idleSnapPx: tileSize * NARROW_CORRIDOR_SNAP_TOLERANCE_RATIO,
      movingReconcilePx: tileSize * NARROW_CORRIDOR_MOVING_RECONCILE_RATIO,
    };
  }
  return {
    idleSnapPx: tileSize * 0.55,
    // ~3 tiles: cobre lag de 1 intent/tick (50ms) sem forçar snap visual.
    movingReconcilePx: tileSize * 3,
  };
}

/**
 * Snap-to-ground tolerante — alinha posição remota ao centro walkable mais próximo
 * quando o cliente/server divergem levemente.
 */
export function snapToWalkableGround(
  position: WorldPosition,
  mapData: number[][],
  mapId?: string,
): WorldPosition {
  if (canPlayerWalkAt(mapData, position)) {
    return position;
  }

  const tileSize = getActiveMapTileSize();
  const { idleSnapPx } = resolvePositionReconcileThresholds(mapId);
  const searchRadiusPx = isNarrowCorridorMap(mapId) ? tileSize * 1.5 : idleSnapPx;
  const { tileX, tileY } = worldPixelToTile(position.x, position.y, tileSize);

  const candidates: WorldPosition[] = [
    tileCenterToWorldPixel(tileX, tileY, tileSize),
    tileCenterToWorldPixel(tileX - 1, tileY, tileSize),
    tileCenterToWorldPixel(tileX + 1, tileY, tileSize),
    tileCenterToWorldPixel(tileX, tileY - 1, tileSize),
    tileCenterToWorldPixel(tileX, tileY + 1, tileSize),
  ];

  let best: WorldPosition | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!canPlayerWalkAt(mapData, candidate)) continue;
    const dist = Math.hypot(candidate.x - position.x, candidate.y - position.y);
    if (dist <= searchRadiusPx && dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }

  return best ?? position;
}

export type AuthoritativePositionReconcileInput = {
  readonly local: WorldPosition;
  readonly remote: WorldPosition;
  readonly mapId?: string | undefined;
  readonly mapData?: number[][] | undefined;
  readonly isMoving: boolean;
};

export type AuthoritativePositionReconcileResult = {
  readonly apply: boolean;
  readonly force: boolean;
  readonly position: WorldPosition;
};

/**
 * Decide se posição autoritativa deve ser aplicada e com qual snap.
 * Retorna apply=false quando drift está dentro da tolerância (predição local mantida).
 */
export function reconcileAuthoritativePosition(
  input: AuthoritativePositionReconcileInput,
): AuthoritativePositionReconcileResult {
  const { idleSnapPx, movingReconcilePx } = resolvePositionReconcileThresholds(input.mapId);
  const tileSize = getActiveMapTileSize();

  const remote = input.mapData
    ? snapToWalkableGround(input.remote, input.mapData, input.mapId)
    : input.remote;

  const dist = Math.hypot(remote.x - input.local.x, remote.y - input.local.y);
  const localTile = worldPixelToTile(input.local.x, input.local.y, tileSize);
  const remoteTile = worldPixelToTile(remote.x, remote.y, tileSize);
  const sameTile = localTile.tileX === remoteTile.tileX && localTile.tileY === remoteTile.tileY;

  if (input.isMoving) {
    if (dist <= movingReconcilePx) {
      return { apply: false, force: false, position: remote };
    }
    // Mesmo tile: alinha sem reset brusco de velocidade (evita teleporte ao roçar props).
    if (sameTile && dist <= tileSize * 1.05) {
      return { apply: true, force: false, position: remote };
    }
    return { apply: true, force: true, position: remote };
  }

  if (dist <= idleSnapPx || (sameTile && dist <= idleSnapPx)) {
    return { apply: false, force: false, position: remote };
  }

  return { apply: true, force: false, position: remote };
}
