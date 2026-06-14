import { getActiveMapTileSize } from './activeMapTileSize.js';
import { FARM_ZONE_01_ID, FARM_ZONE_01_SOUTH_EXIT_ZONE } from './maps/farm_zone_01.js';
import {
  FARM_ZONE_01_ALLEY_MAX,
  FARM_ZONE_01_ALLEY_MIN,
} from './maps/farmZone01LayoutConstants.js';
import { canPlayerWalkAt, type WorldPosition } from './movement.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';

/** Tolerância ampliada em corredores estreitos (ex.: Beco dos Fundos). */
export const NARROW_CORRIDOR_SNAP_TOLERANCE_RATIO = 0.85;

/** Limite de drift enquanto em movimento antes de correção forçada. */
export const NARROW_CORRIDOR_MOVING_RECONCILE_RATIO = 1.5;

function southExitZoneContains(tileX: number, tileY: number): boolean {
  const zone = FARM_ZONE_01_SOUTH_EXIT_ZONE;
  return (
    tileX >= zone.tileX
    && tileX < zone.tileX + zone.tileW
    && tileY >= zone.tileY
    && tileY < zone.tileY + zone.tileH
  );
}

export function isNarrowCorridorMap(mapId: string | undefined): boolean {
  return mapId === FARM_ZONE_01_ID;
}

export function isNarrowCorridorTile(
  mapId: string | undefined,
  tileX: number,
  tileY: number,
): boolean {
  if (!isNarrowCorridorMap(mapId)) return false;
  if (southExitZoneContains(tileX, tileY)) return true;
  return tileX >= FARM_ZONE_01_ALLEY_MIN && tileX <= FARM_ZONE_01_ALLEY_MAX;
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
    movingReconcilePx: tileSize * 1.25,
  };
}

/**
 * Snap-to-ground tolerante — alinha posição remota ao centro walkable mais próximo
 * quando o cliente/server divergem levemente em zonas estreitas.
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
    return { apply: true, force: true, position: remote };
  }

  if (dist <= idleSnapPx || (sameTile && dist <= idleSnapPx)) {
    return { apply: false, force: false, position: remote };
  }

  return { apply: true, force: false, position: remote };
}
