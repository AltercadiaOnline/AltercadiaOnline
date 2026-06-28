import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { resolveSceneConfigForMapId } from '../../../config/sceneConfig.js';
import { isTiledMapEnabled } from '../../../config/tiledMapManifest.js';
import { getMapDefinition, type MapId } from '../../../shared/world/mapRegistry.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import { createMainSceneClass, type PhaserWorldSceneBase } from './MainScene.js';
import { PhaserPlayerSpriteController } from '../player/phaserPlayerSpriteController.js';
import { PhaserWorldActorsController } from '../player/phaserWorldActorsController.js';
import { MapLoader } from '../tiled/MapLoader.js';
import type { MapLoaderScene } from '../tiled/phaserTiledMapTypes.js';
import { PhaserPetController } from '../pet/phaserPetController.js';
import { PhaserWorldOverlayController } from '../overlay/phaserWorldOverlayController.js';
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

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

const PLAYER_WIDTH = GAME_CONFIG.PLAYER_WIDTH;
const PLAYER_HEIGHT = GAME_CONFIG.PLAYER_HEIGHT;
const PLAYER_PIVOT_X = GAME_CONFIG.PLAYER_FOOT_OFFSET.x;
const PLAYER_PIVOT_Y = GAME_CONFIG.PLAYER_FOOT_OFFSET.y;

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

    private teleportZones: TeleportZoneController | null = null;

    private lastFrame: ExplorationRenderFrame | null = null;

    private lastMinimap: MinimapSnapshot | null = null;

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
        const mounted = this.mapLoader.load(scene, this.boundMapId);
        const mapWidthPx = mounted?.widthPx ?? this.resolveFallbackMapWidthPx();
        const mapHeightPx = mounted?.heightPx ?? this.resolveFallbackMapHeightPx();
        this.applyCameraBounds(mapWidthPx, mapHeightPx);
      } else {
        this.applyCameraBounds(this.resolveFallbackMapWidthPx(), this.resolveFallbackMapHeightPx());
      }

      this.mountTeleportZones();

      void this.playerSprite.mount(this as never, null).then(() => {
        if (this.lastFrame) {
          this.playerSprite.applyFrame(this.lastFrame);
          this.syncOverlays();
        }
      });

      this.worldActors.mount(this as never, null);
      this.pet.mount(this as never, null);
      this.worldOverlay.mount(this as never);

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

      this.pet.sync(frame.pet, frame.timestampMs);

      if (this.playerSprite.isReady()) {
        this.playerSprite.applyFrame(frame);
      }

      this.worldActors.sync(frame.worldActors);
      this.syncOverlays();

      this.teleportZones?.update({ x: frame.playerX, y: frame.playerY });
    }

    private applyMinimapOverlay(snapshot: MinimapSnapshot): void {
      if (!this.sceneActive) return;
      this.lastMinimap = snapshot;
      this.syncOverlays();
    }

    private syncOverlays(): void {
      const frame = this.lastFrame;
      if (!frame || frame.mapId !== this.boundMapId) return;

      this.worldOverlay.sync(frame, this.lastMinimap, {
        drawPlayerPlaceholder: !this.playerSprite.isReady(),
        playerWidth: PLAYER_WIDTH,
        playerHeight: PLAYER_HEIGHT,
        playerPivotX: PLAYER_PIVOT_X,
        playerPivotY: PLAYER_PIVOT_Y,
        skipActorMinimapMarkers: this.worldActors.isActive(),
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
      this.teardownSync?.();
      this.teardownSync = null;
      this.teleportZones?.destroy();
      this.teleportZones = null;
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
