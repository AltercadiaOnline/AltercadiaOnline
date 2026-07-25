// @ts-nocheck
import { subscribeExplorationRenderFrame, } from '../app/bridge/explorationRenderBridge.js';
import { subscribeMinimapSnapshot } from '../world/minimap/minimapState.js';
/** Liga a cena Phaser aos snapshots do loop de exploração legado. */
export function bindExplorationPhaserSync(handlers) {
    const offFrame = subscribeExplorationRenderFrame(handlers.onFrame);
    const offMinimap = subscribeMinimapSnapshot(handlers.onMinimap);
    return () => {
        offFrame();
        offMinimap();
    };
}
