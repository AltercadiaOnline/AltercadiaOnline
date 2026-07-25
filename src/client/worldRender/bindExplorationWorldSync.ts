// @ts-nocheck
import { subscribeExplorationRenderFrame, } from '../app/bridge/explorationRenderBridge.js';
import { getMinimapSnapshot, subscribeMinimapSnapshot, } from '../world/minimap/minimapState.js';
/** Liga o publisher de Exploration ao motor de cena (Construct). */
export function bindExplorationWorldSync(engine, handlers) {
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
