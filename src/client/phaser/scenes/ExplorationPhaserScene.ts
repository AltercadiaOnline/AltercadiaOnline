import { DESIGN_CONFIG, DESIGN_MAP_PIXEL_HEIGHT, DESIGN_MAP_PIXEL_WIDTH } from '../../../config/designConstants.js';
import { resolveSceneConfigForMapId } from '../../../config/sceneConfig.js';
import { PHASER_EXPLORATION_SCENE_KEY } from '../PhaserConfig.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import type { ExplorationRenderFrame } from '../../app/bridge/explorationRenderBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import { createMainSceneClass, type PhaserWorldSceneBase } from './MainScene.js';
import { PhaserPlayerSpriteController } from '../player/phaserPlayerSpriteController.js';
import { PhaserWorldActorsController } from '../player/phaserWorldActorsController.js';
import {
  PhaserTerrainController,
  preloadLegacyGroundTileCache,
  queueGroundTilePreloads,
} from '../terrain/phaserTerrainController.js';
import {
  PhaserStructureController,
  queueStructurePreloads,
} from '../structures/phaserStructureController.js';
import { PhaserPetController } from '../pet/phaserPetController.js';
import { PhaserWorldOverlayController } from '../overlay/phaserWorldOverlayController.js';

type PhaserNamespace = {
  Scene: new (config?: string | Record<string, unknown>) => PhaserWorldSceneBase;
};

const PLAYER_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;
const PLAYER_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;
const PLAYER_PIVOT_X = DESIGN_CONFIG.PLAYER.PIVOT_X;
const PLAYER_PIVOT_Y = DESIGN_CONFIG.PLAYER.PIVOT_Y;

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
      this.playerSprite.queuePreload(this as never);
      queueGroundTilePreloads(this as never);
      queueStructurePreloads(this as never);
      preloadLegacyGroundTileCache();
    }

    onMainCreate(): void {
      this.cameras.main.setBounds(0, 0, DESIGN_MAP_PIXEL_WIDTH, DESIGN_MAP_PIXEL_HEIGHT);

      void this.playerSprite.mount(this as never).then(() => {
        if (this.lastFrame) {
          this.playerSprite.applyFrame(this.lastFrame);
          this.syncOverlays();
        }
      });

      this.worldActors.mount(this as never);
      this.terrain.mount(this as never);
      this.structures.mount(this as never);
      this.pet.mount(this as never);
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
      this.cameras.main.setBounds(
        0,
        0,
        sceneConfig?.mapPixelWidth ?? DESIGN_MAP_PIXEL_WIDTH,
        sceneConfig?.mapPixelHeight ?? DESIGN_MAP_PIXEL_HEIGHT,
      );
      this.cameras.main.setScroll(frame.cameraX, frame.cameraY);

      this.terrain.sync(frame.terrainTiles);
      this.structures.sync(frame.worldStructures, frame.timestampMs);
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
