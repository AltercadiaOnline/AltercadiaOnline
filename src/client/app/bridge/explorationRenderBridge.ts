import type { MapId } from '../../../shared/world/mapRegistry.js';
import type { PlayerFacing } from '../../../shared/world/playerFacing.js';
import type { SpriteDirectionKey } from '../../../shared/world/playerFacing.js';
import type { AnimationState } from '../../entities/player/types.js';
import type { WorldActorRenderSnapshot } from '../../world/worldActorsRenderSnapshot.js';
import type { WorldTerrainTileSnapshot } from '../../world/worldTerrainRenderSnapshot.js';
import type { WorldStructureRenderSnapshot } from '../../world/worldStructureRenderSnapshot.js';
import type { PetRenderSnapshot } from '../../entities/pet/PetFollowEntity.js';
import type { NavigationDestination } from '../../managers/PointClickController.js';
import type { ExplorationDebugOverlaySnapshot } from '../../phaser/overlay/explorationDebugOverlay.js';

export type ExplorationPlayerSpriteFrame = {
  readonly frameIndex: number;
  readonly state: AnimationState;
  readonly direction: SpriteDirectionKey;
};

/** Frame de exploração publicado pelo loop legado — espelhado pela camada Phaser. */
export type ExplorationRenderFrame = {
  readonly mapId: MapId;
  readonly playerX: number;
  readonly playerY: number;
  readonly cameraX: number;
  readonly cameraY: number;
  readonly facing: PlayerFacing;
  readonly timestampMs: number;
  readonly playerSprite: ExplorationPlayerSpriteFrame;
  readonly worldActors: readonly WorldActorRenderSnapshot[];
  readonly terrainTiles: readonly WorldTerrainTileSnapshot[];
  readonly worldStructures: readonly WorldStructureRenderSnapshot[];
  readonly pet: PetRenderSnapshot | null;
  readonly navigationDestination: NavigationDestination | null;
  readonly debugOverlay: ExplorationDebugOverlaySnapshot | null;
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
