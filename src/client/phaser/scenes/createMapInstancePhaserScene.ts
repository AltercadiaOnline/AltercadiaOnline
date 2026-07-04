import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { resolveSceneConfigForMapId } from '../../../config/sceneConfig.js';
import { isTiledMapEnabled } from '../../../config/tiledMapManifest.js';
import { getMapDefinition, type MapId } from '../../../shared/world/mapRegistry.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import { getMinimapSnapshot } from '../../world/minimap/minimapState.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import { createMainSceneClass, type PhaserWorldSceneBase } from './MainScene.js';
import { PhaserPlayerSpriteController } from '../player/phaserPlayerSpriteController.js';
import { PhaserWorldActorsController } from '../player/phaserWorldActorsController.js';
import { MapLoader } from '../tiled/MapLoader.js';
import type { MapLoaderScene } from '../tiled/phaserTiledMapTypes.js';
import { PhaserPetController } from '../pet/phaserPetController.js';
import { PhaserWorldOverlayController } from '../overlay/phaserWorldOverlayController.js';
import {
  destroyPhaserLayoutRoots,
  mountPhaserLayoutRoots,
  type PhaserLayoutRoots,
  type PhaserLayoutScene,
} from '../layout/phaserLayoutScene.js';
import {
  clampExplorationCameraScroll,
  configureExplorationPhaserCamera,
} from '../layout/explorationPhaserCamera.js';
import { GAME_MAP_HEIGHT_PX, GAME_MAP_WIDTH_PX } from '../../../game/constants/GameConfig.js';
import { buildTeleportZonesFromPortals } from '../world/buildTeleportZonesFromPortals.js';
import { TeleportZoneController } from '../world/TeleportZoneController.js';
import { notifyPortalZonePhaserTrigger } from '../world/portalZonePhaserBridge.js';
import { resolveMapInstanceSceneKey } from './mapInstanceSceneKeys.js';
import type { MapTransitionPayload } from '../../../shared/world/protocol.js';
import {
  activatePhaserExplorationPipeline,
  fallbackToCanvasExplorationPipeline,
} from '../phaserExplorationPipeline.js';
import { enablePhaserRenderMode } from '../../app/phaser/initPhaserReadyLayer.js';

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

export type MapInstanceSceneInitData = {
  readonly spawn?: MapTransitionPayload;
};

/**
 * Cena Phaser isolada por mapa — cada instância possui MapLoader, zonas de portal e teardown próprio.
 * Ao trocar de mapa, a cena anterior é parada (shutdown) e liberada da memória.
 */
export function createMapInstancePhaserScene(
  Phaser: PhaserNamespace,
  mapId: MapId,
): new () => PhaserWorldSceneBase {
  const MainScene = createMainSceneClass(Phaser as never);
  const sceneKey = resolveMapInstanceSceneKey(mapId);
  const mapDefinition = getMapDefinition(mapId);

  class MapInstanceScene extends MainScene {
    private readonly boundMapId = mapId;

    private readonly playerSprite = new PhaserPlayerSpriteController();

    private readonly worldActors = new PhaserWorldActorsController();

    private readonly mapLoader = new MapLoader();

    private readonly pet = new PhaserPetController();

    private readonly worldOverlay = new PhaserWorldOverlayController();

    private layoutRoots: PhaserLayoutRoots | null = null;

    private lastMinimap: MinimapSnapshot | null = null;

    private entitiesMounted = false;

    private teleportZones: TeleportZoneController | null = null;

    private lastFrame: ExplorationRenderFrame | null = null;

    private teardownSync: (() => void) | null = null;

    private sceneActive = false;

    constructor() {
      super(sceneKey);
    }

    onMainPreload(): void {
      // Assets carregados pela MapInstanceLoadingScene antes de scene.start nesta instância.
    }

    onMainCreate(data?: MapInstanceSceneInitData): void {
      this.sceneActive = true;
      const scene = this as unknown as MapLoaderScene;

      if (isTiledMapEnabled(this.boundMapId)) {
        let mounted = null;
        try {
          mounted = this.mapLoader.load(scene, this.boundMapId);
        } catch (error) {
          console.error('[MapInstanceScene] Exceção ao montar mapa Tiled — fallback canvas.', error);
          this.mapLoader.destroy();
        }

        const mapMounted = Boolean(
          mounted
          && this.mapLoader.hasRenderableTileLayers()
          && this.mapLoader.getBoundTilesetCount() > 0,
        );
        if (!mapMounted) {
          console.error(
            '[MapInstanceScene] Mapa Tiled incompleto — fallback para canvas legado.',
            this.boundMapId,
            {
              visualLayers: this.mapLoader.getVisualTileLayerCount(),
              tilesetsBound: this.mapLoader.getBoundTilesetCount(),
            },
          );
          fallbackToCanvasExplorationPipeline(this.boundMapId);
          this.applyCameraBounds(this.resolveFallbackMapWidthPx(), this.resolveFallbackMapHeightPx());
        } else {
          const mapWidthPx = mounted!.widthPx;
          const mapHeightPx = mounted!.heightPx;
          this.applyCameraBounds(mapWidthPx, mapHeightPx);
          enablePhaserRenderMode();
          activatePhaserExplorationPipeline(this.boundMapId);
          this.mountExplorationEntityLayer();
        }
      } else {
        this.applyCameraBounds(this.resolveFallbackMapWidthPx(), this.resolveFallbackMapHeightPx());
        enablePhaserRenderMode();
        activatePhaserExplorationPipeline(this.boundMapId);
        this.mountExplorationEntityLayer();
      }

      this.mountTeleportZones();

      this.teardownSync = bindExplorationPhaserSync({
        onFrame: (frame) => this.applyExplorationFrame(frame),
        onMinimap: (snapshot) => this.applyMinimapOverlay(snapshot),
      });

      this.events.on('shutdown', () => this.teardownInstance());
    }

    onMainUpdate(_time: number, _delta: number): void {
      if (!this.sceneActive || !this.lastFrame) return;
      if (this.lastFrame.mapId !== this.boundMapId) return;

      this.teleportZones?.update({
        x: this.lastFrame.playerX,
        y: this.lastFrame.playerY,
      });
    }

    private mountTeleportZones(): void {
      const portals = mapDefinition?.portals ?? [];
      if (portals.length === 0) return;

      const tileSize = mapDefinition?.tileSize ?? GAME_CONFIG.TILE_SIZE;
      const zones = buildTeleportZonesFromPortals(portals, tileSize);
      this.teleportZones = new TeleportZoneController(zones, (portalId) => {
        notifyPortalZonePhaserTrigger(portalId);
      });
    }

    private applyExplorationFrame(frame: ExplorationRenderFrame): void {
      if (!this.sceneActive) return;
      if (frame.mapId !== this.boundMapId) return;

      this.lastFrame = frame;

      const sceneConfig = resolveSceneConfigForMapId(frame.mapId);
      const tiledSize = this.mapLoader.getMapPixelSize();
      const mapWidthPx = tiledSize?.widthPx ?? sceneConfig?.mapPixelWidth ?? this.resolveFallbackMapWidthPx();
      const mapHeightPx = tiledSize?.heightPx ?? sceneConfig?.mapPixelHeight ?? this.resolveFallbackMapHeightPx();

      this.applyCameraBounds(mapWidthPx, mapHeightPx);

      const scroll = clampExplorationCameraScroll(frame.cameraX, frame.cameraY, mapWidthPx, mapHeightPx);
      this.cameras.main.setScroll(scroll.x, scroll.y);

      if (this.entitiesMounted) {
        this.playerSprite.applyFrame(frame);
        this.worldActors.sync(frame.worldActors);
        this.pet.sync(frame.pet, frame.timestampMs);
        this.worldOverlay.sync(frame, this.lastMinimap ?? getMinimapSnapshot(), {
          drawPlayerPlaceholder: !this.playerSprite.isReady(),
          playerWidth: GAME_ASSET_TARGETS.player.width,
          playerHeight: GAME_ASSET_TARGETS.player.height,
          playerPivotX: GAME_CONFIG.PLAYER_FOOT_OFFSET.x,
          playerPivotY: GAME_CONFIG.PLAYER_FOOT_OFFSET.y,
          skipActorMinimapMarkers: this.worldActors.isActive(),
        });
      }

      this.teleportZones?.update({ x: frame.playerX, y: frame.playerY });
    }

    private applyMinimapOverlay(snapshot: MinimapSnapshot): void {
      this.lastMinimap = snapshot;
    }

    private mountExplorationEntityLayer(): void {
      if (this.entitiesMounted) return;

      const layoutScene = this as unknown as PhaserLayoutScene;
      this.layoutRoots = mountPhaserLayoutRoots(layoutScene);
      this.worldOverlay.mount(this as unknown as Parameters<PhaserWorldOverlayController['mount']>[0]);
      this.worldActors.mount(
        this as unknown as Parameters<PhaserWorldActorsController['mount']>[0],
        this.layoutRoots.ySortContainer,
      );
      this.pet.mount(
        this as unknown as Parameters<PhaserPetController['mount']>[0],
        this.layoutRoots.ySortContainer,
      );

      void this.playerSprite
        .mount(
          this as unknown as Parameters<PhaserPlayerSpriteController['mount']>[0],
          this.layoutRoots.ySortContainer,
        )
        .then((ready) => {
          if (!this.sceneActive) return;
          this.entitiesMounted = ready;
          if (ready) {
            getRenderLayerBridge().markPhaserEntitiesReady(true);
            console.debug('[MapInstanceScene] Entidades Phaser montadas — canvas legado só input/DOM.');
          } else {
            console.warn('[MapInstanceScene] Sprite do jogador indisponível — entidades permanecem no canvas.');
          }
        });
    }

    private applyCameraBounds(mapWidthPx: number, mapHeightPx: number): void {
      configureExplorationPhaserCamera(this.cameras.main, mapWidthPx, mapHeightPx);
      this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
    }

    private resolveFallbackMapWidthPx(): number {
      return mapDefinition?.pixelWidth() ?? GAME_MAP_WIDTH_PX;
    }

    private resolveFallbackMapHeightPx(): number {
      return mapDefinition?.pixelHeight() ?? GAME_MAP_HEIGHT_PX;
    }

    private teardownInstance(): void {
      this.sceneActive = false;
      getRenderLayerBridge().markPhaserEntitiesReady(false);
      this.entitiesMounted = false;
      this.teardownSync?.();
      this.teardownSync = null;
      this.teleportZones?.destroy();
      this.teleportZones = null;
      destroyPhaserLayoutRoots(this.layoutRoots);
      this.layoutRoots = null;
      this.playerSprite.destroy();
      this.worldActors.destroy();
      this.mapLoader.destroy();
      this.pet.destroy();
      this.worldOverlay.destroy();
      this.lastFrame = null;
      this.lastMinimap = null;
    }
  }

  return MapInstanceScene;
}
