import { getActiveMapTileSize } from './activeMapTileSize.js';
import { TILE_SIZE } from './mapConstants.js';
import type { MoveVector } from './movementInput.js';
import type { MoveDirection } from './protocol.js';
import { getMapDefinition } from './mapRegistry.js';
import { isNpcOccupiedTile } from './npcTileOccupancy.js';
import {
  isPlayerBlockedByObstacles,
  depenetratePlayerMovementCircle,
  resolvePlayerWalkabilitySamplePoints,
} from './playerCollision.js';
import { tileToWorldPixel, worldPixelToTile } from './portals.js';
import { getActiveWorldCollisionMapId } from './worldCollisionRegistry.js';
import { canWalkAt } from './worldMap.js';
import { WORLD_LEGACY_COLLISION_ENABLED } from './worldCollisionPolicy.js';

export type WorldPosition = {
  x: number;
  y: number;
};

function isInsideMapPixelBounds(mapData: number[][], position: WorldPosition): boolean {
  const mapId = getActiveWorldCollisionMapId();
  const def = mapId ? getMapDefinition(mapId) : null;
  if (def) {
    const maxX = def.pixelWidth();
    const maxY = def.pixelHeight();
    return position.x >= 0 && position.y >= 0 && position.x < maxX && position.y < maxY;
  }

  const tileSize = getActiveMapTileSize();
  const mapHeight = mapData.length;
  const mapWidth = mapData[0]?.length ?? 0;
  if (mapWidth <= 0 || mapHeight <= 0) return false;
  const maxX = mapWidth * tileSize;
  const maxY = mapHeight * tileSize;
  return position.x >= 0 && position.y >= 0 && position.x < maxX && position.y < maxY;
}

/** Ajuste global de locomoção no mapa. 0.82 = 18% mais lento que o passo anterior. */
export const PLAYER_WORLD_MOVE_SPEED_SCALE = 0.82;

/** Multiplicador da velocidade base de locomoção (×0.7 histórico × scale atual). */
export const PLAYER_BASE_MOVE_SPEED_MULTIPLIER =
  1.3 * 1.35 * 1.25 * 0.7 * PLAYER_WORLD_MOVE_SPEED_SCALE;

/** Tempo alvo para cruzar 1 tile (64px) — derivado do multiplicador acima. */
export const PLAYER_TILE_CROSS_SECONDS = 0.5 / PLAYER_BASE_MOVE_SPEED_MULTIPLIER;

/** Velocidade em px/s para cruzar 1 tile do mapa ativo no tempo alvo. */
export function resolvePlayerMoveSpeedPxPerSec(tileSize: number = TILE_SIZE): number {
  return tileSize / PLAYER_TILE_CROSS_SECONDS;
}

/** Referência legado (64px) — preferir resolvePlayerMoveSpeedPxPerSec(tileAtivo). */
export const PLAYER_MOVE_SPEED_PX_PER_SEC = resolvePlayerMoveSpeedPxPerSec(TILE_SIZE);

/** Sub-passos máximos por frame — colisão amostrada antes de entrar no tile. */
export const PLAYER_MOVE_COLLISION_SUBSTEP_PX = 8;

/** Evita saltos enormes após tab-out ou hitch de frame. */
export const MAX_FRAME_DELTA_MS = 48;

export function clampFrameDeltaMs(deltaMs: number): number {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return 1000 / 60;
  return Math.min(deltaMs, MAX_FRAME_DELTA_MS);
}

const DELTA: Record<MoveDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Ponto amostrado para walkability — interior inferior do tile lógico.
 * position.y é o centro do SQM; não usar resolvePlayerCollisionPoint (render),
 * que cai na linha do tile abaixo e bloqueia corredores estreitos.
 */
export function resolvePlayerWalkabilitySample(
  position: WorldPosition,
  tileSize = getActiveMapTileSize(),
): WorldPosition {
  const { tileX, tileY } = worldPixelToTile(position.x, position.y, tileSize);
  const origin = tileToWorldPixel(tileX, tileY, tileSize);
  return {
    x: position.x,
    y: origin.y + tileSize - 1,
  };
}

/**
 * Colisão do jogador.
 * Construct-first: bounds do mapa + obstáculos (NPCs/props por tamanho de asset).
 * Com WORLD_LEGACY_COLLISION_ENABLED: também valida tiles pintados.
 */
export function canPlayerWalkAt(
  mapData: number[][],
  position: WorldPosition,
): boolean {
  if (!isInsideMapPixelBounds(mapData, position)) {
    return false;
  }

  if (isPlayerBlockedByObstacles(position)) {
    return false;
  }

  if (!WORLD_LEGACY_COLLISION_ENABLED) {
    return true;
  }

  const tileSize = getActiveMapTileSize();
  const samples = resolvePlayerWalkabilitySamplePoints(position, tileSize);
  for (const sample of samples) {
    if (!canWalkAt(mapData, sample.x, sample.y)) return false;
  }

  const tile = worldPixelToTile(position.x, position.y, tileSize);
  if (isNpcOccupiedTile(tile.tileX, tile.tileY)) return false;

  return true;
}

/**
 * Valida passo incluindo cantos — diagonal exige os dois cardinais adjacentes livres
 * (evita atravessar vértice de parede).
 */
export function canPlayerStepTo(
  mapData: number[][],
  from: WorldPosition,
  to: WorldPosition,
): boolean {
  if (!canPlayerWalkAt(mapData, to)) return false;

  const stepX = to.x - from.x;
  const stepY = to.y - from.y;
  if (stepX !== 0 && stepY !== 0) {
    if (!canPlayerWalkAt(mapData, { x: from.x + stepX, y: from.y })) return false;
    if (!canPlayerWalkAt(mapData, { x: from.x, y: from.y + stepY })) return false;
  }

  return true;
}

export function directionToUnitVector(direction: MoveDirection): { dx: number; dy: number } {
  return DELTA[direction];
}

/**
 * Deslocamento contínuo com deltaTime — subdivide em sub-passos e valida colisão
 * antes de aplicar cada incremento (evita “entrar” no tile bloqueado).
 */
export function moveByDelta(
  position: WorldPosition,
  deltaX: number,
  deltaY: number,
  mapData: number[][],
  pixelWidth: number,
  pixelHeight: number,
  maxSubStepPx = PLAYER_MOVE_COLLISION_SUBSTEP_PX,
): WorldPosition {
  // Já encravado (spawn / desync) — libera antes de tentar andar.
  let start = position;
  if (isPlayerBlockedByObstacles(start)) {
    start = depenetratePlayerMovementCircle(start);
  }

  let { x, y } = start;
  const totalDist = Math.hypot(deltaX, deltaY);
  if (totalDist <= 0) return start;

  const steps = Math.max(1, Math.ceil(totalDist / maxSubStepPx));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;
  let moved = false;

  for (let i = 0; i < steps; i += 1) {
    const nextX = clamp(x + stepX, 0, pixelWidth);
    const nextY = clamp(y + stepY, 0, pixelHeight);
    const from = { x, y };
    const candidate = { x: nextX, y: nextY };

    if (canPlayerStepTo(mapData, from, candidate)) {
      x = nextX;
      y = nextY;
      moved = true;
      continue;
    }

    // Slide por eixo — permite deslizar ao longo de paredes/quinas.
    if (stepX !== 0 && canPlayerStepTo(mapData, from, { x: nextX, y })) {
      x = nextX;
      moved = true;
      continue;
    }

    if (stepY !== 0 && canPlayerStepTo(mapData, from, { x, y: nextY })) {
      y = nextY;
      moved = true;
      continue;
    }

    break;
  }

  const result = { x, y };
  // Colisão = parar no último ponto válido. Sem MTV/skin push no hot path
  // (empurrar pra trás = sensação de esbarrar e voltar). Depenetrate só no start se spawn stuck.
  if (!moved && result.x === position.x && result.y === position.y) {
    return position;
  }
  return result;
}

export function moveByVectorDelta(
  position: WorldPosition,
  vector: MoveVector,
  deltaMs: number,
  mapData: number[][],
  pixelWidth: number,
  pixelHeight: number,
): WorldPosition {
  const distance = PLAYER_MOVE_SPEED_PX_PER_SEC * (deltaMs / 1000);
  return moveByDelta(
    position,
    vector.dx * distance,
    vector.dy * distance,
    mapData,
    pixelWidth,
    pixelHeight,
  );
}

/** Movimento discreto legado — preferir moveByVectorDelta. */
export function applyMove(
  position: WorldPosition,
  direction: MoveDirection,
  mapData: number[][],
  pixelWidth: number,
  pixelHeight: number,
  step = TILE_SIZE,
): WorldPosition {
  const { dx, dy } = DELTA[direction];
  return moveByDelta(
    position,
    dx * step,
    dy * step,
    mapData,
    pixelWidth,
    pixelHeight,
  );
}

export function moveByDirectionDelta(
  position: WorldPosition,
  direction: MoveDirection,
  deltaMs: number,
  mapData: number[][],
  pixelWidth: number,
  pixelHeight: number,
): WorldPosition {
  const { dx, dy } = directionToUnitVector(direction);
  return moveByVectorDelta(
    position,
    { dx, dy },
    deltaMs,
    mapData,
    pixelWidth,
    pixelHeight,
  );
}
