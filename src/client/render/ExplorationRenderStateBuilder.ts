// @ts-nocheck
import { isTiledMapEnabled } from '../../config/tiledMapManifest.js';
import { BASE_VIEWPORT, RENDER_ASSET_SCALE } from '../layout/UIConstants.js';
import { drawAuthoritativeCreatureDebugOverlay } from '../debug/authoritativeCreatureDebugDraw.js';
import { drawCollisionDebugOverlay } from '../debug/collisionDebugDraw.js';
import { drawNavigationDestinationMarker } from '../world/navigationDestinationMarker.js';
import { syncWorldDomOverlay } from '../world/worldDomOverlay.js';
import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';
/**
 * Monta GameRenderState a partir das entidades da cena de exploração.
 * Drawables devem usar tamanho real do PNG (trimmed.sw/sh) com RENDER_ASSET_SCALE = 1.
 * O GameRenderer aplica integer snap (Math.floor) em todas as coordenadas de desenho.
 */
export function buildExplorationRenderState(input) {
    if (RENDER_ASSET_SCALE !== 1) {
        console.warn('[ExplorationRenderStateBuilder] RENDER_ASSET_SCALE deve ser 1 para nitidez pixel-perfect.');
    }
    const { mapId, mapData, portals, camera, worldMapRenderer, worldMap, npcManager, playerSnapshot, petSnapshot, navigationDestination, timestampMs, speechBubbleEntries, domNametagEntries, } = input;
    const tiledMap = isTiledMapEnabled(input.mapId);
    const phaserEngineActive = getRenderLayerBridge().snapshot().renderEngine === 'phaser';
    const phaserMapActive = input.phaserMapActive === true && tiledMap;
    const phaserEntitiesReady = input.phaserEntitiesReady === true;
    const phaserOwnsWorldSprites = phaserMapActive && phaserEntitiesReady;
    const legacyClearColor = worldMapRenderer.getBackgroundColor();
    // Com motor Phaser ativo o canvas fica transparente — senão o fill opaco (#0a0b0f) cobre o tilemap.
    const clearColor = phaserEngineActive || phaserMapActive
        ? 'rgba(0,0,0,0)'
        : (legacyClearColor === 'transparent' ? '#0a0b0f' : legacyClearColor);
    return {
        timestampMs,
        mapId,
        viewport: {
            width: BASE_VIEWPORT.WIDTH,
            height: BASE_VIEWPORT.HEIGHT,
        },
        clearColor,
        camera,
        drawBackground: phaserMapActive
            ? () => { }
            : (ctx) => {
                worldMapRenderer.renderGroundLayer(ctx);
            },
        collectDynamicDrawables: (ctx) => [
            ...(phaserMapActive
                ? []
                : worldMapRenderer.collectStructureDrawables(ctx, {
                    x: playerSnapshot.x,
                    y: playerSnapshot.y,
                })),
            ...(phaserOwnsWorldSprites
                ? []
                : [
                    ...worldMap.collectMonsterDrawables(ctx),
                    ...npcManager.collectWorldActorDrawables(ctx, playerSnapshot, timestampMs, petSnapshot),
                ]),
        ],
        drawWorldOverlays: (ctx) => {
            if (!phaserOwnsWorldSprites && navigationDestination) {
                drawNavigationDestinationMarker(ctx, navigationDestination.worldX, navigationDestination.worldY);
            }
            if (phaserOwnsWorldSprites) {
                return;
            }
            drawAuthoritativeCreatureDebugOverlay(ctx, worldMap.getAuthoritativeSnapshotsForDebug());
            drawCollisionDebugOverlay(ctx, {
                mapId,
                mapData,
                portals,
                playerX: playerSnapshot.x,
                playerY: playerSnapshot.y,
                cameraX: camera.x,
                cameraY: camera.y,
                viewWidth: camera.visibleWorldWidth,
                viewHeight: camera.visibleWorldHeight,
            });
        },
        syncDomOverlay: () => {
            syncWorldDomOverlay({
                textEntries: domNametagEntries,
                speechBubbles: speechBubbleEntries,
                camera,
                timestampMs,
            });
        },
    };
}
