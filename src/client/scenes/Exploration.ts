import type { MapManager } from '../managers/mapManager.js';

import { InputHandler } from '../inputHandler.js';
import {
  getWorldHudInteractionSession,
  isWorldHudInteractionLocked,
  resolveWorldHudInteractionPose,
} from '../world/worldHudInteractionSession.js';
import { isPauseMenuOpen } from '../components/pauseMenu.js';
import { isWorldSessionReady } from '../world/worldSessionGate.js';

import { preloadPlayerSprites } from '../renderPlayer.js';

import type { MapTransitionPayload } from '../../shared/world/protocol.js';
import type { ExplorationSnapshot } from '../../shared/game/gameState.js';
import type { WorldLoginResult } from '../../shared/world/playerWorldProfile.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import type { MockWorldSocket } from '../services/mockWorldSocket.js';

import type { WorldSocket } from '../world/WorldSocket.js';

import { getSharedPlayerSprite } from '../entities/player/index.js';

import { WorldMapRenderer } from '../world/WorldMapRenderer.js';
import { invalidateDomNametagLayoutCache } from '../world/domNametagLayer.js';

import { Camera } from './Camera.js';
import { CameraManager } from './CameraManager.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { resolveSceneConfigForMapId } from '../../config/sceneConfig.js';
import { isTiledMapEnabled } from '../../config/tiledMapManifest.js';
import { applyPhaserMapInstanceSwap } from '../phaser/MapInstanceTransitionCoordinator.js';

import { Player } from '../entities/Player.js';

import { NPCManager } from '../managers/NPCManager.js';

import {
  PointClickController,
  type NavigationDestination,
} from '../managers/PointClickController.js';
import { registerMinimapNavigateHandler } from '../world/minimap/minimapNavigation.js';
import { WorldMap } from '../world/WorldMap.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { getPlayerSkinStore } from '../ui/character/playerSkinStore.js';
import { postGameChatMessage } from '../ui/gameChat.js';
import type { PlayerSkin } from '../../shared/character/playerSkin.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import {
  destroyPortalConfirmationController,
  evaluatePortalProximityForPlayer,
  getPortalConfirmationController,
  initPortalConfirmationController,
  resetPortalConfirmationSession,
} from '../world/portalConfirmationController.js';
import {
  destroyZoneTransitionController,
  getZoneTransitionController,
  initZoneTransitionController,
  recoverStuckZoneTransition,
} from '../world/zoneTransitionController.js';
import { ZoneMapPreloader, registerZoneMapPreloader, unregisterZoneMapPreloader } from '../world/zoneMapPreloader.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import {
  initGameStageScale,
  updateScale,
  enforceFixedGameStagePixels,
  GAME_CANVAS_ID,
  resolveGameUiLayer,
} from '../layout/gameLayout.js';
import {
  createGameCanvas2DContext,
  disableCanvasImageSmoothing,
} from '../layout/gamePixelScale.js';
import { setActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import { publishMinimapSnapshot } from '../world/minimap/minimapState.js';
import { getRenderLayerBridge, isPhaserRenderPipelineReady } from '../app/bridge/renderLayerBridge.js';
import { publishExplorationRenderFrame } from '../app/bridge/explorationRenderBridge.js';
import { subscribePhaserCanvasProceduralFallback } from '../phaser/phaserCanvasFallback.js';
import { buildExplorationDebugOverlaySnapshot } from '../phaser/overlay/explorationDebugOverlay.js';
import { sortWorldActorsByDepth } from '../world/worldActorsRenderSnapshot.js';
import {
  collectMinimapMonsterMarkers,
  collectMinimapNpcMarkers,
} from '../world/minimap/collectMinimapMarkers.js';
import { PetFollowEntity } from '../entities/pet/PetFollowEntity.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { getSpeechBubbleManager } from '../world/speech/SpeechBubbleManager.js';
import {
  bindInteractionCardController,
  InteractionCardController,
} from '../world/interactionCardController.js';
import { bindNpcModalController } from '../ui/npcModalController.js';
import { setWorldCreatureSyncListener } from '../world/worldCreatureSyncBridge.js';
import { ensureWorldMonsterInstances } from '../../shared/world/worldMonsterInstances.js';
import { initVisualDebugModeHotkey } from '../debug/visualDebugMode.js';
import { GameRenderer } from '../render/GameRenderer.js';
import { buildExplorationRenderState } from '../render/ExplorationRenderStateBuilder.js';
import { getGameRenderLoop } from '../render/GameRenderLoop.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { cancelScheduledFrame, scheduleNextFrame } from '../sync/frameScheduler.js';
import { refreshCharacterLevelProgressHud } from '../progression/characterLevelHud.js';
import { triggerLevelUpFeedback } from '../progression/levelUpFeedback.js';
import {
  getWorldMovementAuthority,
  isAuthoritativeMovementOnline,
} from '../world/worldMovementAuthority.js';
import { moveDirectionToFacing } from '../../shared/world/playerFacing.js';
import { isAuthoritativeWorldSocket } from '../world/authoritativeWorldSocket.js';
import { resetInteractionCardController } from '../world/interactionCardController.js';
import { resetNpcModalController } from '../ui/npcModalController.js';
import type { Disposable } from '../utils/Disposable.js';

export class ExplorationScene implements Disposable {
  private readonly canvas: HTMLCanvasElement;

  public readonly ctx: CanvasRenderingContext2D;

  public readonly camera: Camera;

  private readonly cameraManager: CameraManager;

  private readonly mapManager: MapManager;

  private readonly worldMapRenderer: WorldMapRenderer;

  private readonly worldSocket: WorldSocket;

  private readonly player: Player;

  private readonly playerAvatar = getSharedPlayerSprite();

  private readonly npcManager: NPCManager;

  private readonly pointClickController: PointClickController;

  private readonly interactionCardController: InteractionCardController;

  private navigationDestination: NavigationDestination | null = null;

  private readonly worldMap: WorldMap;

  private onRequestCombat: ((monsterId: string) => void) | null = null;

  private offBattleFinished: (() => void) | null = null;

  private offCapacitySync: (() => void) | null = null;

  private offSkinSync: (() => void) | null = null;

  private offEquipmentSync: (() => void) | null = null;

  private equipmentStatsFrame: number | null = null;

  private offProfileSync: (() => void) | null = null;

  private offCharacterLevelSync: (() => void) | null = null;

  private offPetSync: (() => void) | null = null;

  private readonly petFollow = new PetFollowEntity();

  private offRestoreWorldPosition: (() => void) | null = null;

  private offWorldPositionSync: (() => void) | null = null;

  private offPlayerUpdate: (() => void) | null = null;

  private offPortalAccessDenied: (() => void) | null = null;

  private offPhaserCanvasFallback: (() => void) | null = null;

  private portalConfirmationCleanup: (() => void) | null = null;

  private zoneTransitionCleanup: (() => void) | null = null;

  private readonly zonePreloader = new ZoneMapPreloader();


  private paused = false;

  private worldPlayerId: string | null = null;

  private worldCharacterId: number | null = null;
  private disconnectViewportObserver: (() => void) | null = null;
  private readonly gameRenderer: GameRenderer;
  private lastMinimapPublishKey = '';
  private lastSpeechBubbleTileKey = '';
  private teardownVisualDebugHotkey: (() => void) | null = null;

  private disposed = false;

  constructor(mapManager: MapManager, worldSocket: WorldSocket) {

    const canvas = document.getElementById(GAME_CANVAS_ID);

    if (!(canvas instanceof HTMLCanvasElement)) {

      throw new Error('[ExplorationScene] Elemento #game-canvas não encontrado.');

    }



    const ctx = createGameCanvas2DContext(canvas);



    const stage = document.getElementById('game-stage');

    if (!stage) {

      throw new Error('[ExplorationScene] Elemento #game-stage não encontrado.');

    }

    const worldOverlayHost =
      document.getElementById('game-ui-overlay')
      ?? resolveGameUiLayer()
      ?? stage;



    this.canvas = canvas;

    this.ctx = ctx;

    this.gameRenderer = new GameRenderer(canvas);
    disableCanvasImageSmoothing(this.ctx);

    this.mapManager = mapManager;

    this.worldSocket = worldSocket;

    this.camera = new Camera(
      DESIGN_CONFIG.VIEWPORT.WIDTH,
      DESIGN_CONFIG.VIEWPORT.HEIGHT,
      mapManager.pixelWidth,
      mapManager.pixelHeight,
    );
    this.cameraManager = new CameraManager({
      camera: this.camera,
      scene: resolveSceneConfigForMapId(mapManager.currentMapId),
    });

    this.player = new Player(worldSocket, {

      x: mapManager.pixelWidth / 2,

      y: mapManager.pixelHeight / 2,

      facing: 'south',

      mapId: mapManager.currentMapId,

    });

    this.offWorldPositionSync = getMutableDataStore().subscribeWorldPosition((snapshot) => {
      if (this.disposed) return;
      this.player.applyWorldPositionFromStore(snapshot, {
        mapData: this.mapManager.mapDataSnapshot as number[][],
      });
    });

    this.offCapacitySync = uiEvents.on(UIEventType.CAPACITY_UPDATED, () => {
      this.player.syncEncumberedState();
    });
    this.offEquipmentSync = uiEvents.on(UIEventType.PLAYER_ITEMS_UPDATED, () => {
      if (this.disposed) return;
      if (this.equipmentStatsFrame !== null) return;
      this.equipmentStatsFrame = scheduleNextFrame(() => {
        this.equipmentStatsFrame = null;
        if (this.disposed) return;
        this.player.calculateStats();
      });
    });
    this.offProfileSync = uiEvents.on(UIEventType.PLAYER_PROFILE_UPDATED, ({ profile }) => {
      this.player.setDisplayName(profile.displayName);
      this.player.setLevel(profile.level);
    });
    this.offCharacterLevelSync = getMutableDataStore().subscribeCharacterLevel((snapshot, meta) => {
      if (this.disposed) return;
      this.player.setLevel(snapshot.level);
      refreshCharacterLevelProgressHud();
      if (meta.levelsGained > 0) {
        triggerLevelUpFeedback({
          previousLevel: meta.previousLevel,
          newLevel: snapshot.level,
          levelsGained: meta.levelsGained,
          source: meta.source,
        });
      }
    });
    refreshCharacterLevelProgressHud();
    this.offSkinSync = uiEvents.on(UIEventType.PLAYER_SKIN_UPDATED, ({ skin }) => {
      this.player.setSkin(skin);
    });
    this.petFollow.setPetSnapshot(getPlayerPetStore().getSnapshot());
    this.petFollow.snapBehindPlayer(
      { x: this.player.renderX, y: this.player.renderY },
      this.player.facing,
    );
    this.offPetSync = getPlayerPetStore().subscribe((pet) => {
      this.petFollow.setPetSnapshot(pet);
      if (pet) {
        this.petFollow.snapBehindPlayer(
          { x: this.player.renderX, y: this.player.renderY },
          this.player.facing,
        );
      }
    });
    this.player.setSkin(getPlayerSkinStore().getSkin());
    this.player.syncEncumberedState();
    this.player.calculateStats();

    this.npcManager = new NPCManager(mapManager.currentMapId);

    this.worldMap = new WorldMap({
      onStartBattle: (monsterId) => this.onRequestCombat?.(monsterId),
      getPlayerLevel: () => this.player.level,
      getPortals: () => this.mapManager.portals,
      onZoneAccessDenied: (message) => postGameChatMessage(message),
    });
    ensureWorldMonsterInstances();
    this.worldMap.loadMap(mapManager.currentMapId);

    setWorldCreatureSyncListener((mapId) => {
      if (mapId !== this.mapManager.currentMapId) return;
      this.worldMap.loadMap(mapId);
      this.pointClickController.refreshInteractables();
    });

    this.offBattleFinished = uiEvents.on(UIEventType.BATTLE_FINISHED, (payload) => {
      if (!payload.victory) return;
      this.worldMap.removeMonster(payload.encounter.monsterId);
      this.pointClickController.refreshInteractables();
    });

    this.pointClickController = new PointClickController({

      camera: this.camera,

      mapManager: this.mapManager,

      npcManager: this.npcManager,

      player: this.player,

      worldSocket: this.worldSocket,

      promptHost: worldOverlayHost,

      getMapTilesWide: () => this.mapManager.mapDataSnapshot[0]?.length ?? 0,

      getMapTilesHigh: () => this.mapManager.mapDataSnapshot.length,

      onRequestCombat: (monsterId) => this.onRequestCombat?.(monsterId),

      canOpenPortal: (portalId) => this.worldMap.canOpenPortal(portalId),

      onNavigationDestination: (destination) => {
        this.navigationDestination = destination;
      },
    });

    this.interactionCardController = new InteractionCardController({
      host: worldOverlayHost,
      npcManager: this.npcManager,
      player: this.player,
    });
    bindInteractionCardController(this.interactionCardController);
    bindNpcModalController({ getPlayer: () => this.player });

    registerMinimapNavigateHandler((target) => {
      this.pointClickController.navigateToWorldPixel(target.worldX, target.worldY);
    });

    this.offRestoreWorldPosition = uiEvents.on(UIEventType.RESTORE_WORLD_PLAYER_POSITION, (snapshot) => {
      InputHandler.emergencyStop(this.player, this.playerAvatar);
      this.pointClickController.cancelNavigation();
      this.player.forceAuthoritativePosition(snapshot);
      this.playerAvatar.setFacing(snapshot.facing);
    });



    this.worldMapRenderer = new WorldMapRenderer({

      canvas: this.canvas,

      camera: this.camera,

      onCanvasClick: (screenX, screenY, options) => {
        this.pointClickController.handleCanvasClick(screenX, screenY, options);
      },

    });



    mapManager.attachScene({

      worldMapRenderer: this.worldMapRenderer,

      camera: this.camera,

      setPlayerPosition: (payload) => this.applyPlayerPosition(payload),

    });

    registerZoneMapPreloader(this.zonePreloader);
    this.zonePreloader.warmSessionMaps();



    mapManager.loadMap(mapManager.currentMapId, {

      x: this.player.x,

      y: this.player.y,

      facing: this.player.facing,

    });



    this.offPhaserCanvasFallback = subscribePhaserCanvasProceduralFallback((mapId) => {
      if (this.disposed || this.mapManager.currentMapId !== mapId) return;
      this.refreshCanvasLayoutForPhaserFallback(mapId);
    });

    void preloadPlayerSprites();
    void import('../entities/pet/PetSpriteLoader.js').then((mod) => mod.preloadPetSprites());
    void import('../loaders/npcAssetImageLoader.js').then((mod) => mod.preloadAllNpcDefinitionAssets());



    this.offPlayerUpdate = this.worldSocket.on('player-update', (position) => {
      if (this.disposed) return;

      const authority = getWorldMovementAuthority();
      if (!isAuthoritativeMovementOnline()) {
        this.player.applyServerUpdate(position);
      } else if (
        position.facing
        && !InputHandler.hasMovementInput()
        && !authority.shouldDeferServerFacing(position.facing)
      ) {
        this.player.facing = position.facing;
      }

      if (
        !InputHandler.hasMovementInput()
        && position.facing
        && !authority.shouldDeferServerFacing(position.facing)
      ) {
        this.playerAvatar.setFacing(this.player.facing);
      }

      evaluatePortalProximityForPlayer(
        this.player.x,
        this.player.y,
        this.player.tileX,
        this.player.tileY,
      );
    });

    this.offPortalAccessDenied = this.worldSocket.on('portal-access-denied', ({ reason }) => {
      if (this.disposed) return;
      postGameChatMessage(reason);
    });

    initZoneTransitionController({
      mapManager: this.mapManager,
      npcManager: this.npcManager,
      pointClickController: this.pointClickController,
      worldMap: this.worldMap,
      preloader: this.zonePreloader,
      getSyncBundle: () => this.buildPortalSyncBundle(),
      applyPlayerPosition: (payload) => this.applyPlayerPosition(payload),
      flushPositionToServer: () => this.flushPositionBeforePortal(),
      setExplorationPaused: (paused) => this.setPaused(paused),
      onTransitionSettled: () => {
        this.pointClickController.refreshInteractables();
        this.pointClickController.cancelNavigation();
        getPortalConfirmationController()?.notifyLeftPortalZone();
      },
    });
    this.zoneTransitionCleanup = () => {
      destroyZoneTransitionController();
      unregisterZoneMapPreloader(this.zonePreloader);
    };

    initPortalConfirmationController({
      worldSocket: this.worldSocket,
      mapManager: this.mapManager,
      getPlayerLevel: () => this.player.level,
      canOpenPortal: (portalId) => this.worldMap.canOpenPortal(portalId),
    });
    this.portalConfirmationCleanup = () => destroyPortalConfirmationController();



    InputHandler.init({
      canvas: this.canvas,
      onMovementInputStart: (direction) => {
        if (!direction || !isAuthoritativeMovementOnline()) return;
        const facing = moveDirectionToFacing(direction);
        this.player.facing = facing;
        this.playerAvatar.setFacing(facing);
        getWorldMovementAuthority().lockPredictionFromInput({
          facing,
          x: this.player.renderX,
          y: this.player.renderY,
        });
      },
    });
    this.teardownVisualDebugHotkey = initVisualDebugModeHotkey();

    this.syncSceneCamera(this.mapManager.currentMapId);
    this.cameraManager.snapToPlayer({ x: this.player.renderX, y: this.player.renderY });

    this.applyFixedViewport();
    this.disconnectViewportObserver = initGameStageScale(() => {
      invalidateDomNametagLayoutCache();
      this.cameraManager.snapToPlayer({ x: this.player.renderX, y: this.player.renderY });
    });
  }



  setPlayerLevel(level: number): void {
    this.player.setLevel(level);
    getMutableDataStore().applyCharacterLevelState(level, 0, 'server_sync');
    if ('setPlayerLevel' in this.worldSocket && typeof this.worldSocket.setPlayerLevel === 'function') {
      this.worldSocket.setPlayerLevel(level);
    }
  }

  setPlayerDisplayName(name: string): void {
    this.player.setDisplayName(name);
    getPlayerProfileStore().setDisplayName(name);
  }

  setWorldIdentity(playerId: string, characterId: number): void {
    this.worldPlayerId = playerId;
    this.worldCharacterId = characterId;
  }

  setPlayerSkin(skin: PlayerSkin): void {
    this.player.setSkin(skin);
    getPlayerSkinStore().loadSkin(skin);
  }

  setCombatJoinHandler(handler: (monsterId: string) => void): void {
    this.onRequestCombat = handler;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.pointClickController.cancelNavigation();
      this.pointClickController.dismissPrompt();
      InputHandler.emergencyStop(this.player, this.playerAvatar);
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  captureExplorationSnapshot(): ExplorationSnapshot {
    return {
      mapId: this.mapManager.currentMapId,
      x: this.player.renderX,
      y: this.player.renderY,
      facing: this.player.facing,
    };
  }

  restoreExplorationSnapshot(snapshot: ExplorationSnapshot): void {
    recoverStuckZoneTransition();
    resetPortalConfirmationSession();
    this.setPaused(false);

    this.syncMockWorldAuthority(snapshot);
    this.player.forceAuthoritativePosition({
      x: snapshot.x,
      y: snapshot.y,
      facing: snapshot.facing,
      mapId: snapshot.mapId,
    });
    this.playerAvatar.setFacing(this.player.facing);
    this.petFollow.snapBehindPlayer(
      { x: snapshot.x, y: snapshot.y },
      snapshot.facing,
    );
    this.pointClickController.refreshInteractables();
    this.worldMap.loadMap(snapshot.mapId);
    this.syncSceneCamera(snapshot.mapId);
    this.cameraManager.snapToPlayer({ x: snapshot.x, y: snapshot.y });
    evaluatePortalProximityForPlayer(
      this.player.x,
      this.player.y,
      this.player.tileX,
      this.player.tileY,
    );
  }

  /** Posiciona o jogador com spawn autoritativo do servidor após world-login. */
  applyServerWorldSpawn(payload: WorldLoginResult): void {
    const mapId = payload.currentMapId as MapId;
    const spawn = {
      x: payload.lastPosition.x,
      y: payload.lastPosition.y,
      facing: payload.facing,
      mapId: payload.currentMapId,
    };

    if (this.mapManager.currentMapId !== mapId) {
      this.mapManager.loadMap(mapId, spawn);
      this.npcManager.setMapId(mapId);
      this.pointClickController.setMapId(mapId);
      this.worldMap.loadMap(mapId);
    } else {
      this.syncMockWorldAuthority(spawn);
      this.player.forceAuthoritativePosition(spawn);
      this.playerAvatar.setFacing(payload.facing);
    }
    this.petFollow.snapBehindPlayer(
      { x: payload.lastPosition.x, y: payload.lastPosition.y },
      payload.facing,
    );
    this.pointClickController.refreshInteractables();
    this.syncSceneCamera(mapId);
    this.cameraManager.snapToPlayer({
      x: payload.lastPosition.x,
      y: payload.lastPosition.y,
    });

    applyPhaserMapInstanceSwap({
      mapId: payload.currentMapId,
      x: payload.lastPosition.x,
      y: payload.lastPosition.y,
      facing: payload.facing,
    });
  }

  private syncMockWorldAuthority(snapshot: {
    readonly x: number;
    readonly y: number;
    readonly facing: ExplorationSnapshot['facing'];
    readonly mapId: string;
  }): void {
    const mockSocket = this.worldSocket as MockWorldSocket;
    if (typeof mockSocket.applyServerWorldState !== 'function') return;

    mockSocket.applyServerWorldState(
      {
        currentMapId: snapshot.mapId,
        lastPosition: { x: snapshot.x, y: snapshot.y },
        facing: snapshot.facing,
      },
      { silent: true },
    );
  }



  private syncSceneCamera(mapId: string): void {
    this.cameraManager.applyScene(resolveSceneConfigForMapId(mapId));
    this.camera.setMapDimensions(this.mapManager.pixelWidth, this.mapManager.pixelHeight);
    setActiveMapTileSize(mapId);
    this.lastMinimapPublishKey = '';
    this.applyFixedViewport();
  }

  /** Canvas não rouba cliques enquanto HUD de NPC (ex.: Cael) está aberta. */
  private syncWorldPointerGate(): void {
    const hudLocked = isWorldHudInteractionLocked();
    this.canvas.classList.toggle('game-canvas--input-blocked', hudLocked);
  }

  public update(deltaMs = 16.67): void {
    this.syncWorldPointerGate();

    if (
      this.paused
      || isPauseMenuOpen()
      || !isWorldSessionReady()
      || getPortalConfirmationController()?.getIsTransitioning()
    ) {
      InputHandler.emergencyStop(this.player, this.playerAvatar);
      return;
    }

    if (isWorldHudInteractionLocked()) {
      const session = getWorldHudInteractionSession();
      this.player.isLocked = true;
      if (session) {
        const pose = resolveWorldHudInteractionPose(session);
        InputHandler.emergencyStop(this.player, this.playerAvatar);
        this.pointClickController.cancelNavigation();
        this.player.forceAuthoritativePosition(pose);
        this.playerAvatar.setFacing(pose.facing);
        this.petFollow.snapBehindPlayer({ x: pose.x, y: pose.y }, pose.facing);
      }
    } else {
      this.player.isLocked = false;
    }

    const mapData = this.mapManager.mapDataSnapshot as number[][];
    const frameMs = Math.min(Math.max(deltaMs, 0), 48);

    if (InputHandler.hasMovementInput()) {
      this.pointClickController.cancelNavigation();
      this.pointClickController.dismissPrompt();
    }

    InputHandler.processPlayerInput(this.player, this.playerAvatar, { deltaMs: frameMs, mapData });

    if (!InputHandler.hasMovementInput() && !isWorldHudInteractionLocked()) {
      this.pointClickController.updateNavigation(this.player, this.playerAvatar, frameMs, mapData);
    }



    this.npcManager.checkInteraction(this.player);
    InputHandler.setNpcInteractInRange(this.npcManager.getNearestInteractable() !== null);

    this.worldMap.updateProximity(this.player.x, this.player.y, deltaMs);

    if (InputHandler.consumeInteractRequest()) {
      const target = this.npcManager.getNearestInteractable();
      if (target) {
        InputHandler.emergencyStop(this.player, this.playerAvatar);
        this.pointClickController.cancelNavigation();
        this.npcManager.executeAction(target, this.player);
      } else if (this.worldMap.tryInteractAdjacent()) {
        this.pointClickController.dismissPrompt();
      } else {
        this.pointClickController.acceptPendingInteraction();
      }
    }

    this.petFollow.update(
      { x: this.player.renderX, y: this.player.renderY },
      this.player.facing,
      mapData,
      this.mapManager.pixelWidth,
      this.mapManager.pixelHeight,
      frameMs,
    );
    getPlayerPetStore().tickExplorationAffinity(frameMs);

    if (!getPortalConfirmationController()?.getIsTransitioning()) {
      this.zonePreloader.tick(this.player.x, this.player.y, this.mapManager.portals);
    }

    this.player.syncLocalizedHeightFromWorldPosition();

    evaluatePortalProximityForPlayer(
      this.player.x,
      this.player.y,
      this.player.tileX,
      this.player.tileY,
    );

    this.tickSpeechBubbles();
  }

  private tickSpeechBubbles(): void {
    const manager = getSpeechBubbleManager();
    manager.purgeExpired();

    if (this.worldPlayerId === null || this.worldCharacterId === null) return;

    const tile = worldPixelToTile(this.player.renderX, this.player.renderY);
    const tileKey = `${this.mapManager.currentMapId}:${tile.tileX}:${tile.tileY}`;
    if (tileKey === this.lastSpeechBubbleTileKey) return;
    this.lastSpeechBubbleTileKey = tileKey;

    manager.updateLocalEntity({
      playerId: this.worldPlayerId,
      characterId: this.worldCharacterId,
      worldX: this.player.renderX,
      worldY: this.player.renderY,
      mapId: this.mapManager.currentMapId,
    });
  }



  /** Buffer fixo 640×360; escala só via updateScale() → transform no container. */
  public applyFixedViewport(): void {
    enforceFixedGameStagePixels();
    updateScale();
    invalidateDomNametagLayoutCache();
    this.cameraManager.snapToPlayer({ x: this.player.renderX, y: this.player.renderY });
  }

  /** @deprecated Use applyFixedViewport — mantido para chamadas legadas. */
  public resize(): void {
    this.applyFixedViewport();
  }



  public configurePortalTransitionRemote(
    submitRemote?: (request: import('../../shared/world/zoneTransition.js').PortalTransitionRequestPayload) => void,
  ): void {
    const existing = getZoneTransitionController();
    if (existing) {
      existing.setSubmitRemote(submitRemote);
      return;
    }

    initZoneTransitionController({
      mapManager: this.mapManager,
      npcManager: this.npcManager,
      pointClickController: this.pointClickController,
      worldMap: this.worldMap,
      preloader: this.zonePreloader,
      getSyncBundle: () => this.buildPortalSyncBundle(),
      applyPlayerPosition: (payload) => this.applyPlayerPosition(payload),
      flushPositionToServer: () => this.flushPositionBeforePortal(),
      setExplorationPaused: (paused) => this.setPaused(paused),
      submitRemote,
      onTransitionSettled: () => {
        this.pointClickController.refreshInteractables();
        this.pointClickController.cancelNavigation();
        getPortalConfirmationController()?.notifyLeftPortalZone();
      },
    });
  }

  private buildPortalSyncBundle(): import('../world/zoneTransitionController.js').ZoneTransitionSyncBundle | null {
    const characterId = this.worldCharacterId ?? 1;

    const vitals = getGlobalPlayerStore().getWorldVitals();
    const pet = getPlayerPetStore().getSnapshot();

    return {
      characterId,
      currentMapId: this.mapManager.currentMapId,
      lastPosition: { x: this.player.x, y: this.player.y },
      facing: this.player.facing,
      playerLevel: this.player.level,
      sessionSync: {
        worldVitals: vitals,
        activeMovesets: [...getGlobalPlayerStore().getConfirmedLoadout()],
        pet,
      },
    };
  }

  private positionFlushBeforePortal: (() => void) | undefined;

  public setPositionFlushBeforePortal(handler: () => void): void {
    this.positionFlushBeforePortal = handler;
  }

  private flushPositionBeforePortal(): void {
    this.positionFlushBeforePortal?.();
  }

  private applyPlayerPosition(payload: MapTransitionPayload): void {

    this.syncMockWorldAuthority({
      x: payload.x,
      y: payload.y,
      facing: payload.facing ?? this.player.facing,
      mapId: payload.mapId,
    });
    this.player.forceAuthoritativePosition(payload);

    this.playerAvatar.setFacing(this.player.facing);

    this.petFollow.snapBehindPlayer(
      { x: payload.x, y: payload.y },
      payload.facing ?? this.player.facing,
    );

    this.syncSceneCamera(payload.mapId);
    this.cameraManager.snapToPlayer({ x: payload.x, y: payload.y });
  }



  /** Canvas procedural enquanto Phaser monta ou após fallback do mapa Tiled. */
  public refreshCanvasLayoutForPhaserFallback(mapId: MapId): void {
    if (this.mapManager.currentMapId !== mapId) return;
    this.worldMapRenderer.setMapId(mapId);
    this.prepareFrame(0);
    this.renderWorld(performance.now());
  }

  public prepareFrame(deltaMs = 16.67): void {
    const drawPosition = { x: this.player.renderX, y: this.player.renderY };

    this.cameraManager.updateCamera(drawPosition, deltaMs);

    this.npcManager.refreshActiveZone(this.camera);

    this.publishMinimapState();

    const phaserSnap = getRenderLayerBridge().snapshot();
    const shouldSyncPhaser =
      phaserSnap.renderEngine === 'phaser'
      && (phaserSnap.phaserBooted || isPhaserRenderPipelineReady());

    if (shouldSyncPhaser) {
      const timestampMs = performance.now();
      publishExplorationRenderFrame({
        mapId: this.mapManager.currentMapId,
        playerX: this.player.renderX,
        playerY: this.player.renderY,
        cameraX: this.camera.x,
        cameraY: this.camera.y,
        facing: this.player.facing,
        timestampMs,
        playerSprite: this.playerAvatar.getAnimationSnapshot(),
        worldActors: sortWorldActorsByDepth([
          ...this.worldMap.collectCreatureRenderSnapshots(),
          ...this.npcManager.collectNpcRenderSnapshots(timestampMs),
        ]),
        terrainTiles: isTiledMapEnabled(this.mapManager.currentMapId)
          ? []
          : this.worldMapRenderer.collectGroundTileSnapshots(),
        worldStructures: isTiledMapEnabled(this.mapManager.currentMapId)
          ? []
          : this.worldMapRenderer.collectStructureSnapshots({
              x: this.player.renderX,
              y: this.player.renderY,
            }),
        pet: this.petFollow.toRenderSnapshot(),
        navigationDestination: this.navigationDestination,
        debugOverlay: buildExplorationDebugOverlaySnapshot({
          mapId: this.mapManager.currentMapId,
          mapData: this.mapManager.mapDataSnapshot,
          portals: this.mapManager.portals,
          playerX: this.player.renderX,
          playerY: this.player.renderY,
          cameraX: this.camera.x,
          cameraY: this.camera.y,
          viewWidth: this.camera.visibleWorldWidth,
          viewHeight: this.camera.visibleWorldHeight,
          creatureSnapshots: this.worldMap.getAuthoritativeSnapshotsForDebug(),
        }),
      });
    }
  }

  private publishMinimapState(): void {
    const mapId = this.mapManager.currentMapId;
    const mapData = this.mapManager.mapDataSnapshot;
    const tilesWide = mapData[0]?.length ?? 0;
    const tilesHigh = mapData.length;
    if (tilesWide <= 0 || tilesHigh <= 0) return;

    const playerTile = worldPixelToTile(this.player.renderX, this.player.renderY);
    const viewportMin = worldPixelToTile(this.camera.x, this.camera.y);
    const viewportMax = worldPixelToTile(
      this.camera.x + this.camera.visibleWorldWidth,
      this.camera.y + this.camera.visibleWorldHeight,
    );

    const dest = this.navigationDestination;
    const publishKey = [
      mapId,
      playerTile.tileX,
      playerTile.tileY,
      viewportMin.tileX,
      viewportMin.tileY,
      viewportMax.tileX,
      viewportMax.tileY,
      dest?.tileX ?? -1,
      dest?.tileY ?? -1,
    ].join(':');
    if (publishKey === this.lastMinimapPublishKey) return;
    this.lastMinimapPublishKey = publishKey;

    const npcMarkers = collectMinimapNpcMarkers(this.npcManager.collectMinimapMarkers());
    const monsterMarkers = collectMinimapMonsterMarkers(this.worldMap.collectMinimapMarkers());

    publishMinimapSnapshot({
      mapId: mapId as MapId,
      tilesWide,
      tilesHigh,
      playerTileX: playerTile.tileX,
      playerTileY: playerTile.tileY,
      markers: [...npcMarkers, ...monsterMarkers],
      viewport: {
        minTileX: viewportMin.tileX,
        minTileY: viewportMin.tileY,
        maxTileX: viewportMax.tileX,
        maxTileY: viewportMax.tileY,
      },
      ...(this.navigationDestination
        ? {
            destination: {
              tileX: this.navigationDestination.tileX,
              tileY: this.navigationDestination.tileY,
            },
          }
        : {}),
    });

  }



  /** Sincroniza nametags/balões DOM quando Phaser substitui o render canvas. */
  public syncWorldDomOverlay(timestampMs = performance.now()): void {
    const state = this.buildRenderState(timestampMs);
    state.syncDomOverlay?.();
  }

  /** Único ponto de renderização canvas — delega ao GameRenderer. */
  public renderWorld(timestampMs = performance.now()): void {
    this.gameRenderer.render(this.ctx, this.buildRenderState(timestampMs));
  }

  private buildRenderState(timestampMs: number) {
    const playerSnapshot = this.player.toRenderSnapshot();
    const petSnapshot = this.petFollow.toRenderSnapshot();

    return buildExplorationRenderState({
      mapId: this.mapManager.currentMapId,
      mapData: this.mapManager.mapDataSnapshot,
      portals: this.mapManager.portals,
      camera: this.camera,
      worldMapRenderer: this.worldMapRenderer,
      worldMap: this.worldMap,
      npcManager: this.npcManager,
      playerSnapshot,
      petSnapshot,
      navigationDestination: this.navigationDestination,
      timestampMs,
      speechBubbleEntries: getSpeechBubbleManager().getActiveBubbleEntries(timestampMs),
      domNametagEntries: [
        ...this.npcManager.buildDomNametagEntries(playerSnapshot, petSnapshot),
        ...this.worldMapRenderer.collectDomLabelEntries(),
      ],
      phaserMapActive: isPhaserRenderPipelineReady(),
    });
  }

  /** Libera listeners, sockets e referências — obrigatório antes de descartar a cena. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.setPaused(true);
    InputHandler.emergencyStop(this.player, this.playerAvatar);
    InputHandler.detach();
    InputHandler.resetKeys();

    this.offCapacitySync?.();
    this.offEquipmentSync?.();
    cancelScheduledFrame(this.equipmentStatsFrame);
    this.equipmentStatsFrame = null;
    this.offProfileSync?.();
    this.offCharacterLevelSync?.();
    this.offSkinSync?.();
    this.offPetSync?.();
    this.offBattleFinished?.();
    this.offRestoreWorldPosition?.();
    this.offWorldPositionSync?.();
    this.offCapacitySync = null;
    this.offEquipmentSync = null;
    this.offProfileSync = null;
    this.offCharacterLevelSync = null;
    this.offSkinSync = null;
    this.offPetSync = null;
    this.offBattleFinished = null;
    this.offRestoreWorldPosition = null;
    this.offWorldPositionSync = null;

    if (isAuthoritativeWorldSocket(this.worldSocket)) {
      this.worldSocket.removeAllListeners();
    } else {
      this.offPlayerUpdate?.();
      this.offPortalAccessDenied?.();
    }
    this.offPlayerUpdate = null;
    this.offPortalAccessDenied = null;
    this.offPhaserCanvasFallback?.();
    this.offPhaserCanvasFallback = null;

    this.zoneTransitionCleanup?.();
    this.zoneTransitionCleanup = null;
    this.portalConfirmationCleanup?.();
    this.portalConfirmationCleanup = null;

    this.teardownVisualDebugHotkey?.();
    this.teardownVisualDebugHotkey = null;
    this.disconnectViewportObserver?.();
    this.disconnectViewportObserver = null;

    setWorldCreatureSyncListener(null);
    registerMinimapNavigateHandler(null);
    resetInteractionCardController();
    resetNpcModalController();

    this.interactionCardController.dispose();
    this.pointClickController.dispose();
    this.worldMapRenderer.dispose();
    this.mapManager.detachScene();

    this.onRequestCombat = null;
    this.navigationDestination = null;

    getGameRenderLoop().stop();
  }

}


