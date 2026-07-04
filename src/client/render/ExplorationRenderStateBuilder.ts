import type { Camera } from '../scenes/Camera.js';
import type { NPCManager } from '../managers/NPCManager.js';
import type { WorldMap } from '../world/WorldMap.js';
import type { WorldMapRenderer } from '../world/WorldMapRenderer.js';
import type { NavigationDestination } from '../managers/PointClickController.js';
import type { PetRenderSnapshot } from '../entities/pet/PetFollowEntity.js';
import type { PlayerRenderSnapshot } from '../entities/player/PlayerSprite.js';
import { isTiledMapEnabled } from '../../config/tiledMapManifest.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { BASE_VIEWPORT, RENDER_ASSET_SCALE } from '../layout/UIConstants.js';
import { drawAuthoritativeCreatureDebugOverlay } from '../debug/authoritativeCreatureDebugDraw.js';
import { drawCollisionDebugOverlay } from '../debug/collisionDebugDraw.js';
import { drawNavigationDestinationMarker } from '../world/navigationDestinationMarker.js';
import type { SpeechBubbleDomEntry } from '../world/speech/speechBubbleDomLayer.js';
import { syncWorldDomOverlay, type DomNametagEntry } from '../world/worldDomOverlay.js';
import type { GameRenderState } from './GameRenderState.js';

export type ExplorationRenderFrameInput = {
  readonly mapId: string;
  readonly mapData: readonly (readonly number[])[];
  readonly portals: readonly import('../../shared/world/portals.js').Portal[];
  readonly camera: Camera;
  readonly worldMapRenderer: WorldMapRenderer;
  readonly worldMap: WorldMap;
  readonly npcManager: NPCManager;
  readonly playerSnapshot: PlayerRenderSnapshot;
  readonly petSnapshot: PetRenderSnapshot | null;
  readonly navigationDestination: NavigationDestination | null;
  readonly timestampMs: number;
  readonly speechBubbleEntries: readonly SpeechBubbleDomEntry[];
  readonly domNametagEntries: readonly DomNametagEntry[];
  /** Mapa Tiled desenhado pelo Phaser — canvas só entidades/overlays. */
  readonly phaserMapActive?: boolean;
  /** Sprites de mundo no Phaser — canvas não redesenha player/NPC/monstro/pet. */
  readonly phaserEntitiesReady?: boolean;
};

/**
 * Monta GameRenderState a partir das entidades da cena de exploração.
 * Drawables devem usar tamanho real do PNG (trimmed.sw/sh) com RENDER_ASSET_SCALE = 1.
 * O GameRenderer aplica integer snap (Math.floor) em todas as coordenadas de desenho.
 */
export function buildExplorationRenderState(input: ExplorationRenderFrameInput): GameRenderState {
  if (RENDER_ASSET_SCALE !== 1) {
    console.warn('[ExplorationRenderStateBuilder] RENDER_ASSET_SCALE deve ser 1 para nitidez pixel-perfect.');
  }
  const {
    mapId,
    mapData,
    portals,
    camera,
    worldMapRenderer,
    worldMap,
    npcManager,
    playerSnapshot,
    petSnapshot,
    navigationDestination,
    timestampMs,
    speechBubbleEntries,
    domNametagEntries,
  } = input;

  const tiledMap = isTiledMapEnabled(input.mapId as MapId);
  const phaserMapActive = input.phaserMapActive === true && tiledMap;
  const phaserEntitiesReady = input.phaserEntitiesReady === true;
  const phaserOwnsWorldSprites = phaserMapActive && phaserEntitiesReady;
  const legacyClearColor = worldMapRenderer.getBackgroundColor();
  const clearColor = phaserMapActive
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
      ? () => { /* chão/objetos Tiled no Phaser */ }
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
        drawNavigationDestinationMarker(
          ctx,
          navigationDestination.worldX,
          navigationDestination.worldY,
        );
      }
      if (phaserOwnsWorldSprites) {
        return;
      }
      drawAuthoritativeCreatureDebugOverlay(
        ctx,
        worldMap.getAuthoritativeSnapshotsForDebug(),
      );
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
