import { PLAYER_MOVE_SPEED_PX_PER_SEC } from './movement.js';

/** Intervalo padrão entre pacotes de sync (500ms). */
export const POSITION_SYNC_DELTA_TIME_SEC = 0.5;

export const POSITION_SYNC_MAX_WINDOW_MS = POSITION_SYNC_DELTA_TIME_SEC * 1000;

/**
 * Velocidade máxima em px/s — ajuste via multiplicador sobre a locomoção do boneco.
 * Equivalente ao MAX_VELOCITY do snippet de anti-teleporte.
 */
export const PLAYER_MAX_VELOCITY_PX_PER_SEC = PLAYER_MOVE_SPEED_PX_PER_SEC * 1.5;

/** Alias legível — mesma unidade (px/s). */
export const MAX_VELOCITY = PLAYER_MAX_VELOCITY_PX_PER_SEC;

export type WorldPosition2D = {
  readonly x: number;
  readonly y: number;
};

/** Distância euclidiana entre dois pontos (calcularDistancia). */
export function calculateEuclideanDistance(
  p1: WorldPosition2D,
  p2: WorldPosition2D,
): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/** Limite de deslocamento: MAX_VELOCITY × deltaTime (segundos). */
export function getMaxDistanceForElapsed(elapsedMs: number): number {
  const deltaTimeSec = Math.max(elapsedMs, 50) / 1000;
  return MAX_VELOCITY * deltaTimeSec;
}

/**
 * A nova posição é fisicamente possível?
 * Bloqueia se distância > MAX_VELOCITY × tempo desde o último sync.
 */
export function isPositionDeltaWithinVelocity(
  official: WorldPosition2D,
  claimed: WorldPosition2D,
  elapsedMs: number,
): boolean {
  const distancia = calculateEuclideanDistance(official, claimed);
  const limiteDistancia = getMaxDistanceForElapsed(elapsedMs);
  return distancia <= limiteDistancia;
}

export function positionDeltaPx(official: WorldPosition2D, claimed: WorldPosition2D): number {
  return calculateEuclideanDistance(official, claimed);
}
