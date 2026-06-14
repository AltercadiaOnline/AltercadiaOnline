import type { Camera } from '../scenes/Camera.js';
import { toScreenCoords } from './screenCoords.js';

/** @deprecated Use toScreenCoords — mantido para imports legados. */
export function resolveNametagScreenPosition(
  camera: Camera,
  worldX: number,
  worldY: number,
): { readonly x: number; readonly y: number } {
  const { screenX, screenY } = toScreenCoords(camera, worldX, worldY, { round: true });
  return { x: screenX, y: screenY };
}
