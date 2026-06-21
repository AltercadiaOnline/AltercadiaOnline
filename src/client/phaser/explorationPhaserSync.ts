import {
  subscribeExplorationRenderFrame,
  type ExplorationRenderFrame,
} from '../app/bridge/explorationRenderBridge.js';
import { subscribeMinimapSnapshot } from '../world/minimap/minimapState.js';
import type { MinimapSnapshot } from '../world/minimap/minimapTypes.js';

export type ExplorationPhaserSyncHandlers = {
  readonly onFrame: (frame: ExplorationRenderFrame) => void;
  readonly onMinimap: (snapshot: MinimapSnapshot) => void;
};

/** Liga a cena Phaser aos snapshots do loop de exploração legado. */
export function bindExplorationPhaserSync(handlers: ExplorationPhaserSyncHandlers): () => void {
  const offFrame = subscribeExplorationRenderFrame(handlers.onFrame);
  const offMinimap = subscribeMinimapSnapshot(handlers.onMinimap);
  return () => {
    offFrame();
    offMinimap();
  };
}
