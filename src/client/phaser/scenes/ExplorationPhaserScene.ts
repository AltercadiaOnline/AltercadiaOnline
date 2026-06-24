import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { logAssetRegistryVerification } from '../../../game/AssetRegistry.js';
import { resolveSceneConfigForMapId } from '../../../config/sceneConfig.js';
import { PHASER_EXPLORATION_SCENE_KEY } from '../PhaserConfig.js';import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import { CITY_01_MAP_CONFIG } from '../layout/MapConfig.js';
import {
  queueStructureLayoutPreloads,
  queueTerrainLayoutPreloads,
} from '../layout/phaserLayoutScene.js';
import { createMainSceneClass, type PhaserWorldSceneBase } from './MainScene.js';
import { PhaserPlayerSpriteController } from '../player/phaserPlayerSpriteController.js';
import { PhaserWorldActorsController } from '../player/phaserWorldActorsController.js';
import {
  PhaserTerrainController,
  queueGroundTilePreloads,
  preloadLegacyGroundTileCache,
} from '../terrain/phaserTerrainController.js';
import { queueTestPackCity01Preloads } from '../assets/phaserAssetRegistry.js';
import {
  PhaserStructureController,
  queueStructurePreloads,
} from '../structures/phaserStructureController.js';
import { PhaserPetController } from '../pet/phaserPetController.js';
import { PhaserWorldOverlayController } from '../overlay/phaserWorldOverlayController.js';
import {
  clampExplorationCameraScroll,
  configureExplorationPhaserCamera,
} from '../layout/explorationPhaserCamera.js';
import { GAME_MAP_HEIGHT_PX, GAME_MAP_WIDTH_PX } from '../../../game/constants/GameConfig.js';
type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

const PLAYER_WIDTH = GAME_CONFIG.PLAYER_WIDTH;
const PLAYER_HEIGHT = GAME_CONFIG.PLAYER_HEIGHT;
const PLAYER_PIVOT_X = GAME_CONFIG.PLAYER_FOOT_OFFSET.x;
const PLAYER_PIVOT_Y = GAME_CONFIG.PLAYER_FOOT_OFFSET.y;
/**
 * Cena de exploração online — estende MainScene; renderiza apenas mundo e entidades.
 */
export function createExplorationPhaserScene(Phaser: PhaserNamespace): new () => PhaserWorldSceneBase {
  const MainScene = createMainSceneClass(Phaser as never);

  class ExplorationWorldScene extends MainScene {
    private readonly playerSprite = new PhaserPlayerSpriteController();

    private readonly worldActors = new PhaserWorldActorsController();

    private readonly terrain = new PhaserTerrainController();

    private readonly structures = new PhaserStructureController();

    private readonly pet = new PhaserPetController();

    private readonly worldOverlay = new PhaserWorldOverlayController();

    private lastFrame: ExplorationRenderFrame | null = null;

    private lastMinimap: MinimapSnapshot | null = null;

    private teardownSync: (() => void) | null = null;

    constructor() {
      super(PHASER_EXPLORATION_SCENE_KEY);
    }

    onMainPreload(): void {
      logAssetRegistryVerification();
      queueTestPackCity01Preloads(this as never);
      queueTerrainLayoutPreloads(this as never, CITY_01_MAP_CONFIG.terrainAssets);
      queueStructureLayoutPreloads(this as never, CITY_01_MAP_CONFIG.structureAssets);
      this.playerSprite.queuePreload(this as never);
      queueGroundTilePreloads(this as never);
      queueStructurePreloads(this as never);
      preloadLegacyGroundTileCache();
    }

    onMainCreate(): void {
      configureExplorationPhaserCamera(this.cameras.main);
      this.cameras.main.setBounds(0, 0, GAME_MAP_WIDTH_PX, GAME_MAP_HEIGHT_PX);
      this.terrain.mount(this as never);
      const layoutRoots = this.terrain.getLayoutRoots();
      const ySortContainer = layoutRoots?.ySortContainer ?? null;
      this.structures.mount(this as never, layoutRoots);
      void this.playerSprite.mount(this as never, ySortContainer).then(() => {
        if (this.lastFrame) {
          this.playerSprite.applyFrame(this.lastFrame);
          this.syncOverlays();
        }
      });

      this.worldActors.mount(this as never, ySortContainer);
      this.pet.mount(this as never, ySortContainer);
      this.worldOverlay.mount(this as never);

      this.teardownSync = bindExplorationPhaserSync({
        onFrame: (frame) => this.applyExplorationFrame(frame),
        onMinimap: (snapshot) => this.applyMinimapOverlay(snapshot),
      });

      this.events.on('shutdown', () => {
        this.teardownSync?.();
        this.teardownSync = null;
        this.playerSprite.destroy();
        this.worldActors.destroy();
        this.terrain.destroy();
        this.structures.destroy();
        this.pet.destroy();
        this.worldOverlay.destroy();
      });
    }

    onMainUpdate(_time: number, _delta: number): void {
      // Futuro: física/colisão local espelhando intents online.
    }

    private applyExplorationFrame(frame: ExplorationRenderFrame): void {
      this.lastFrame = frame;
      const sceneConfig = resolveSceneConfigForMapId(frame.mapId);
      const mapWidthPx = sceneConfig?.mapPixelWidth ?? GAME_MAP_WIDTH_PX;
      const mapHeightPx = sceneConfig?.mapPixelHeight ?? GAME_MAP_HEIGHT_PX;

      configureExplorationPhaserCamera(this.cameras.main, mapWidthPx, mapHeightPx);

      const scroll = clampExplorationCameraScroll(frame.cameraX, frame.cameraY, mapWidthPx, mapHeightPx);
      this.cameras.main.setScroll(scroll.x, scroll.y);
      this.terrain.sync(frame.terrainTiles);
      this.structures.sync(frame.worldStructures, frame.timestampMs, frame.worldActors);
      this.pet.sync(frame.pet, frame.timestampMs);

      if (this.playerSprite.isReady()) {
        this.playerSprite.applyFrame(frame);
      }

      this.worldActors.sync(frame.worldActors);
      this.syncOverlays();
    }

    private applyMinimapOverlay(snapshot: MinimapSnapshot): void {
      this.lastMinimap = snapshot;
      this.syncOverlays();
    }

    private syncOverlays(): void {
      const frame = this.lastFrame;
      if (!frame) return;

      this.worldOverlay.sync(frame, this.lastMinimap, {
        drawPlayerPlaceholder: !this.playerSprite.isReady(),
        playerWidth: PLAYER_WIDTH,
        playerHeight: PLAYER_HEIGHT,
        playerPivotX: PLAYER_PIVOT_X,
        playerPivotY: PLAYER_PIVOT_Y,
        skipActorMinimapMarkers: this.worldActors.isActive(),
      });
    }
  }

  return ExplorationWorldScene;
}
