import { getActiveMapTileSize } from './activeMapTileSize.js';
import { FARM_ZONE_01_ID } from './maps/farm_zone_01.js';
import { canPlayerWalkAt, type WorldPosition } from './movement.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';

/** Tolerância ampliada em mapas Construct alongados (ex.: Beco dos Fundos). */
export const NARROW_CORRIDOR_SNAP_TOLERANCE_RATIO = 0.85;

/** Limite de drift enquanto em movimento antes de correção forçada. */
export const NARROW_CORRIDOR_MOVING_RECONCILE_RATIO = 1.5;

/** Drift acima disso → correção por exceção (lerp). Abaixo = silêncio / predição local. */
export const ONLINE_CORRECTION_TILES = 1.5;

/** Drift absurdo (teleporte / speedhack) → snap seco. */
export const ONLINE_HARD_SNAP_TILES = 4;

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
  readonly hardSnapPx: number;
} {
  const tileSize = getActiveMapTileSize();
  const hardSnapPx = tileSize * ONLINE_HARD_SNAP_TILES;
  if (isNarrowCorridorMap(mapId)) {
    return {
      idleSnapPx: tileSize * NARROW_CORRIDOR_SNAP_TOLERANCE_RATIO,
      movingReconcilePx: tileSize * NARROW_CORRIDOR_MOVING_RECONCILE_RATIO,
      hardSnapPx,
    };
  }
  return {
    // Idle: cobre RTT residual sem puxar o sprite ao soltar WASD.
    idleSnapPx: tileSize * ONLINE_CORRECTION_TILES,
    movingReconcilePx: tileSize * ONLINE_CORRECTION_TILES,
    hardSnapPx,
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
  /** Predição / lock ativo — trata como movimento (silêncio ampliado). */
  readonly isPredicting?: boolean;
};

export type AuthoritativePositionReconcileResult = {
  readonly apply: boolean;
  /** Snap imediato (teleporte / cheat / parede grave). */
  readonly force: boolean;
  /** Micro-ajuste elástico — evita tranco para trás. */
  readonly soft: boolean;
  readonly position: WorldPosition;
};

/**
 * Decide se posição autoritativa deve ser aplicada e com qual snap.
 * Silêncio = aprovação dentro da tolerância; correção só por exceção.
 */
export function reconcileAuthoritativePosition(
  input: AuthoritativePositionReconcileInput,
): AuthoritativePositionReconcileResult {
  const { idleSnapPx, movingReconcilePx, hardSnapPx } = resolvePositionReconcileThresholds(input.mapId);

  const remote = input.mapData
    ? snapToWalkableGround(input.remote, input.mapData, input.mapId)
    : input.remote;

  const dist = Math.hypot(remote.x - input.local.x, remote.y - input.local.y);
  const treatingAsMoving = input.isMoving || Boolean(input.isPredicting);

  if (dist <= (treatingAsMoving ? movingReconcilePx : idleSnapPx)) {
    return { apply: false, force: false, soft: false, position: remote };
  }

  if (dist >= hardSnapPx) {
    return { apply: true, force: true, soft: false, position: remote };
  }

  // Drift moderado: lerp elástico (não teleporta o boneco).
  return { apply: true, force: false, soft: true, position: remote };
}
