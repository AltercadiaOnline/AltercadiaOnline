import {
  subscribeExplorationRenderFrame,
  type ExplorationRenderFrame,
} from '../app/bridge/explorationRenderBridge.js';
import {
  getMinimapSnapshot,
  subscribeMinimapSnapshot,
} from '../world/minimap/minimapState.js';
import type { MinimapSnapshot } from '../world/minimap/minimapTypes.js';
import type { WorldRenderEngine } from './WorldRenderEngine.js';

export type ExplorationWorldSyncHandlers = {
  readonly onFrame: (frame: ExplorationRenderFrame) => void;
  readonly onMinimap?: (snapshot: MinimapSnapshot) => void;
};

/** Liga o publisher de Exploration ao motor de cena (Construct). */
export function bindExplorationWorldSync(
  engine: WorldRenderEngine,
  handlers?: Partial<ExplorationWorldSyncHandlers>,
): () => void {
  const onFrame = handlers?.onFrame ?? ((frame) => engine.applyFrame(frame));
  const onMinimap = handlers?.onMinimap
    ?? ((snapshot) => engine.applyMinimap?.(snapshot));

  const offFrame = subscribeExplorationRenderFrame(onFrame);
  const offMinimap = subscribeMinimapSnapshot(onMinimap);

  const latestMinimap = getMinimapSnapshot();
  if (latestMinimap) {
    onMinimap(latestMinimap);
  }

  return () => {
    offFrame();
    offMinimap();
  };
}
