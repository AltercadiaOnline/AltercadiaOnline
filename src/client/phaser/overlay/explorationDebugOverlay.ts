// @ts-nocheck
import { isCollisionDebugEnabled, isVisualDebugModeEnabled, } from '../../debug/visualDebugMode.js';
export function buildExplorationDebugOverlaySnapshot(input) {
    const showCollisionDebug = isCollisionDebugEnabled();
    const showCreatureDebug = isVisualDebugModeEnabled();
    if (!showCollisionDebug && !showCreatureDebug) {
        return null;
    }
    return {
        collision: {
            mapId: input.mapId,
            mapData: input.mapData,
            playerX: input.playerX,
            playerY: input.playerY,
            portals: input.portals,
            cameraX: input.cameraX,
            cameraY: input.cameraY,
            viewWidth: input.viewWidth,
            viewHeight: input.viewHeight,
        },
        creatureSnapshots: showCreatureDebug ? input.creatureSnapshots : [],
        showCollisionDebug,
        showCreatureDebug,
    };
}
