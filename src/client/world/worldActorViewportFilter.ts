import {
  CAMERA_VISIBLE_WORLD_HEIGHT,
  CAMERA_VISIBLE_WORLD_WIDTH,
} from '../scenes/cameraConfig.js';
import type { WorldActorRenderSnapshot } from './worldActorsRenderSnapshot.js';

export type WorldViewportRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

const DEFAULT_VIEWPORT_MARGIN_PX = 64;

export function buildWorldViewportFromCamera(
  cameraX: number,
  cameraY: number,
  marginPx: number = DEFAULT_VIEWPORT_MARGIN_PX,
): WorldViewportRect {
  return {
    left: cameraX - marginPx,
    top: cameraY - marginPx,
    right: cameraX + CAMERA_VISIBLE_WORLD_WIDTH + marginPx,
    bottom: cameraY + CAMERA_VISIBLE_WORLD_HEIGHT + marginPx,
  };
}

export function isPointInsideWorldViewport(
  x: number,
  y: number,
  viewport: WorldViewportRect,
): boolean {
  return x >= viewport.left && x <= viewport.right && y >= viewport.top && y <= viewport.bottom;
}

export function isWorldActorInViewport(
  actor: WorldActorRenderSnapshot,
  viewport: WorldViewportRect,
): boolean {
  return isPointInsideWorldViewport(actor.feetX, actor.feetY, viewport);
}

export function filterWorldActorsForViewport(
  actors: readonly WorldActorRenderSnapshot[],
  viewport: WorldViewportRect,
): WorldActorRenderSnapshot[] {
  return actors.filter((actor) => isWorldActorInViewport(actor, viewport));
}
