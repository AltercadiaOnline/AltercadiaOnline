import { CAMERA_FOLLOW_LERP } from './cameraConfig.js';

export type CameraBounds = {
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly viewWidth: number;
  readonly viewHeight: number;
};

export type CameraFollowState = {
  readonly focusX: number;
  readonly focusY: number;
  readonly bounds: CameraBounds;
};

export type CameraFollowTarget = {
  readonly x: number;
  readonly y: number;
};

/** Converte fator LERP base (0.2 @ 60fps) para deltaTime arbitrário. */
export function computeCameraLerpFactor(
  deltaMs: number,
  baseLerp = CAMERA_FOLLOW_LERP,
  referenceFrameMs = 16.67,
): number {
  if (baseLerp <= 0) return 0;
  if (baseLerp >= 1) return 1;
  return 1 - (1 - baseLerp) ** (deltaMs / referenceFrameMs);
}

/** Impede que a viewport mostre área fora do mapa (0,0 até mapWidth×mapHeight). */
export function clampCameraToMapBounds(
  cameraX: number,
  cameraY: number,
  bounds: CameraBounds,
): CameraFollowTarget {
  const maxX = Math.max(0, bounds.mapWidth - bounds.viewWidth);
  const maxY = Math.max(0, bounds.mapHeight - bounds.viewHeight);

  return {
    x: Math.max(0, Math.min(cameraX, maxX)),
    y: Math.max(0, Math.min(cameraY, maxY)),
  };
}

/**
 * Centraliza o viewport no focus (centro visual do jogador).
 * camera.x = focusX - viewWidth/2 (com clamp nas bordas do mapa).
 */
export function computeCameraFollowTarget(state: CameraFollowState): CameraFollowTarget {
  const centeredX = state.focusX - state.bounds.viewWidth / 2;
  const centeredY = state.focusY - state.bounds.viewHeight / 2;
  return clampCameraToMapBounds(centeredX, centeredY, state.bounds);
}

/** Posição instantânea ao teleportar — centraliza no focus respeitando bordas. */
export function computeCameraSnapTarget(state: CameraFollowState): CameraFollowTarget {
  return computeCameraFollowTarget(state);
}

export function lerpCameraPosition(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  deltaMs: number,
): CameraFollowTarget {
  const t = computeCameraLerpFactor(deltaMs);
  const x = currentX + (targetX - currentX) * t;
  const y = currentY + (targetY - currentY) * t;
  return { x, y };
}
