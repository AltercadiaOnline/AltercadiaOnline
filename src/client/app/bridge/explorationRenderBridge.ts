import type { MapId } from '../../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';

/** Frame de exploração publicado pelo loop legado — espelhado pela camada Phaser. */
export type ExplorationRenderFrame = {
  readonly mapId: MapId;
  readonly playerX: number;
  readonly playerY: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly facing: PlayerFacing;
  readonly timestampMs: number;
};

let latestFrame: ExplorationRenderFrame | null = null;
const listeners = new Set<(frame: ExplorationRenderFrame) => void>();

export function publishExplorationRenderFrame(frame: ExplorationRenderFrame): void {
  latestFrame = frame;
  for (const listener of listeners) {
    listener(frame);
  }
}

export function getExplorationRenderFrame(): ExplorationRenderFrame | null {
  return latestFrame;
}

export function subscribeExplorationRenderFrame(
  listener: (frame: ExplorationRenderFrame) => void,
): () => void {
  listeners.add(listener);
  if (latestFrame) {
    listener(latestFrame);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function resetExplorationRenderBridge(): void {
  latestFrame = null;
  listeners.clear();
}
