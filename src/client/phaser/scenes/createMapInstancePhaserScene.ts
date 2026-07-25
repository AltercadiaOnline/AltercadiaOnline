// @ts-nocheck
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { GAME_ASSET_TARGETS } from '../../../game/assets/assetNormalizer.js';
import { resolveSceneConfigForMapId } from '../../../config/sceneConfig.js';
import { isTiledMapEnabled } from '../../../config/tiledMapManifest.js';
import { getMapDefinition } from '../../../shared/world/mapRegistry.js';
import { getMinimapSnapshot } from '../../world/minimap/minimapState.js';
import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';
import { bindExplorationPhaserSync } from '../explorationPhaserSync.js';
import { createMainSceneClass } from './MainScene.js';
import { PhaserPlayerSpriteController } from '../player/phaserPlayerSpriteController.js';
import { PhaserWorldActorsController } from '../player/phaserWorldActorsController.js';
import { PhaserRemotePlayersController } from '../player/phaserRemotePlayersController.js';
import { MapLoader } from '../tiled/MapLoader.js';
import { PhaserPetController } from '../pet/phaserPetController.js';
import { PhaserWorldOverlayController } from '../overlay/phaserWorldOverlayController.js';
import { destroyPhaserLayoutRoots, mountPhaserLayoutRoots, } from '../layout/phaserLayoutScene.js';
import { clampExplorationCameraScroll, configureExplorationPhaserCamera, } from '../layout/explorationPhaserCamera.js';
import { GAME_MAP_HEIGHT_PX, GAME_MAP_WIDTH_PX } from '../../../game/constants/GameConfig.js';
import { PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { buildTeleportZonesFromPortals } from '../world/buildTeleportZonesFromPortals.js';
import { TeleportZoneController } from '../world/TeleportZoneController.js';
import { notifyPortalZonePhaserTrigger } from '../world/portalZonePhaserBridge.js';
import { resolveMapInstanceSceneKey } from './mapInstanceSceneKeys.js';
import { activatePhaserExplorationPipeline } from '../phaserExplorationPipeline.js';
import { enablePhaserRenderMode } from '../../app/phaser/initPhaserReadyLayer.js';
import { TiledMapLoadError } from '../tiled/mapLoadFatalError.js';
import { buildWorldViewportFromCamera, filterWorldActorsForViewport, } from '../../world/worldActorViewportFilter.js';
/**
 * Cena Phaser isolada por mapa — cada instância possui MapLoader, zonas de portal e teardown próprio.
 * Ao trocar de mapa, a cena anterior é parada (shutdown) e liberada da memória.
 */
export function createMapInstancePhaserScene(Phaser, mapId) {
    const MainScene = createMainSceneClass(Phaser);
    const sceneKey = resolveMapInstanceSceneKey(mapId);
    const mapDefinition = getMapDefinition(mapId);
    class MapInstanceScene extends MainScene {
        boundMapId = mapId;
        playerSprite = new PhaserPlayerSpriteController();
        worldActors = new PhaserWorldActorsController();
        remotePlayers = new PhaserRemotePlayersController();
        mapLoader = new MapLoader();
        pet = new PhaserPetController();
        worldOverlay = new PhaserWorldOverlayController();
        layoutRoots = null;
        lastMinimap = null;
        entitiesMounted = false;
        entityLayerStarted = false;
        teleportZones = null;
        lastFrame = null;
        teardownSync = null;
        sceneActive = false;
        constructor() {
            super(sceneKey);
        }
        onMainPreload() {
            // Sem this.load.* — road2_atlas (PreloaderScene) + demais assets (MapInstanceLoading).
        }
        async onMainCreate(data) {
            const scene = this;
            if (this.mapLoader.isMountedOnScene(this.boundMapId, scene)) {
                console.debug(`[MapInstanceScene] create() repetido ignorado — mapa "${this.boundMapId}" já montado.`);
                enablePhaserRenderMode();
                activatePhaserExplorationPipeline();
                if (!this.entityLayerStarted) {
                    this.mountExplorationEntityLayer();
                }
                return;
            }
            this.sceneActive = true;
            try {
                if (isTiledMapEnabled(this.boundMapId)) {
                    const mounted = await this.mapLoader.load(scene, this.boundMapId);
                    this.applyCameraBounds(mounted.widthPx, mounted.heightPx);
                    this.focusCameraOnSpawn(mounted.playerSpawn, mounted.widthPx, mounted.heightPx);
                }
                else {
                    this.applyCameraBounds(this.resolveFallbackMapWidthPx(), this.resolveFallbackMapHeightPx());
                }
                enablePhaserRenderMode();
                activatePhaserExplorationPipeline();
                this.mountExplorationEntityLayer();
            }
            catch (error) {
                this.sceneActive = false;
                this.mapLoader.destroy();
                if (!(error instanceof TiledMapLoadError)) {
                    console.error('[MapInstanceScene] Falha fatal ao montar mapa Phaser.', error);
                }
                this.events.on('shutdown', () => this.teardownInstance());
                return;
            }
            this.mountTeleportZones();
            this.teardownSync = bindExplorationPhaserSync({
                onFrame: (frame) => this.applyExplorationFrame(frame),
                onMinimap: (snapshot) => this.applyMinimapOverlay(snapshot),
            });
            this.events.on('shutdown', () => this.teardownInstance());
        }
        onMainUpdate(_time, _delta) {
            if (!this.sceneActive || !this.lastFrame)
                return;
            if (this.lastFrame.mapId !== this.boundMapId)
                return;
            this.teleportZones?.update({
                x: this.lastFrame.playerX,
                y: this.lastFrame.playerY,
            });
        }
        mountTeleportZones() {
            const portals = mapDefinition?.portals ?? [];
            if (portals.length === 0)
                return;
            const tileSize = mapDefinition?.tileSize ?? GAME_CONFIG.TILE_SIZE;
            const zones = buildTeleportZonesFromPortals(portals, tileSize);
            this.teleportZones = new TeleportZoneController(zones, (portalId) => {
                notifyPortalZonePhaserTrigger(portalId);
            });
        }
        applyExplorationFrame(frame) {
            if (!this.sceneActive)
                return;
            if (frame.mapId !== this.boundMapId)
                return;
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
                const viewport = buildWorldViewportFromCamera(frame.cameraX, frame.cameraY);
                const visibleActors = filterWorldActorsForViewport(frame.worldActors, viewport);
                this.worldActors.sync(visibleActors);
                this.remotePlayers.sync(frame.mapId, frame.timestampMs);
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
        applyMinimapOverlay(snapshot) {
            this.lastMinimap = snapshot;
        }
        mountExplorationEntityLayer() {
            if (this.entityLayerStarted)
                return;
            this.entityLayerStarted = true;
            const layoutScene = this;
            this.layoutRoots = mountPhaserLayoutRoots(layoutScene);
            const entityDepth = PHASER_GROUND_DEPTH + this.mapLoader.getVisualTileLayerCount() + 1;
            this.layoutRoots.worldRoot.setDepth(entityDepth);
            this.worldOverlay.mount(this);
            this.worldActors.mount(this, this.layoutRoots.ySortContainer);
            this.remotePlayers.mount(this, this.boundMapId, this.layoutRoots.ySortContainer);
            this.pet.mount(this, this.layoutRoots.ySortContainer);
            // Câmera + atores não dependem do sheet do jogador — evita mundo “vazio” enquanto PNG carrega.
            this.entitiesMounted = true;
            getRenderLayerBridge().markPhaserEntitiesReady(true);
            void this.playerSprite
                .mount(this, this.layoutRoots.ySortContainer)
                .then((ready) => {
                if (!this.sceneActive)
                    return;
                if (ready) {
                    this.playerSprite.enableArcadePhysics(this);
                    this.mapLoader.bindPlayerCollider(this.playerSprite.getColliderTarget());
                    console.debug('[MapInstanceScene] Sprite do jogador Phaser montado.');
                }
                else {
                    console.warn('[MapInstanceScene] Sprite do jogador indisponível — silhueta/placeholder.');
                }
            });
        }
        applyCameraBounds(mapWidthPx, mapHeightPx) {
            configureExplorationPhaserCamera(this.cameras.main, mapWidthPx, mapHeightPx);
            this.cameras.main.setBounds(0, 0, mapWidthPx, mapHeightPx);
        }
        focusCameraOnSpawn(spawn, mapWidthPx, mapHeightPx) {
            if (!spawn)
                return;
            const scroll = clampExplorationCameraScroll(spawn.x - GAME_CONFIG.VIEWPORT_WIDTH / 2, spawn.y - GAME_CONFIG.VIEWPORT_HEIGHT / 2, mapWidthPx, mapHeightPx);
            this.cameras.main.setScroll(scroll.x, scroll.y);
        }
        resolveFallbackMapWidthPx() {
            return mapDefinition?.pixelWidth() ?? GAME_MAP_WIDTH_PX;
        }
        resolveFallbackMapHeightPx() {
            return mapDefinition?.pixelHeight() ?? GAME_MAP_HEIGHT_PX;
        }
        teardownInstance() {
            this.sceneActive = false;
            getRenderLayerBridge().markPhaserEntitiesReady(false);
            this.entitiesMounted = false;
            this.entityLayerStarted = false;
            this.teardownSync?.();
            this.teardownSync = null;
            this.teleportZones?.destroy();
            this.teleportZones = null;
            destroyPhaserLayoutRoots(this.layoutRoots);
            this.layoutRoots = null;
            this.playerSprite.destroy();
            this.worldActors.destroy();
            this.remotePlayers.destroy();
            this.mapLoader.destroy();
            this.pet.destroy();
            this.worldOverlay.destroy();
            this.lastFrame = null;
            this.lastMinimap = null;
        }
    }
    return MapInstanceScene;
}
