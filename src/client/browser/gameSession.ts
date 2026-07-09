/**
 * Domínio [WORLD/GAME] — carregado dinamicamente após "Entrar no Mundo".
 * Não importar este módulo estaticamente em main.ts ou telas de login.
 */
import type { CombatState } from '../../shared/types.js';
import { createCombatSocketHandler } from '../combat/client/combatSocketHandler.js';
import { InputHandler } from '../inputHandler.js';
import { applyEconomyEventToHud, isEconomyEvent } from '../ui/economyHud.js';
import {
  registerCombatDevTransportResolver,
  refreshCombatDevBindings,
} from '../dev/combatDevBindings.js';
import { initDebugMenuIfAllowed } from '../dev/debugTools.js';
import { notifyMirrorPlayerDispatch } from '../combat/MirrorPlayerController.js';
import { configureCombatClient, GameClient, registerActiveBattleId } from '../combat/index.js';
import { getBattleStore } from '../combat/client/battleStore.js';
import { configureBattleLootClient } from '../game/battleLootClient.js';
import { resolveClientCombatEquipmentSnapshot } from '../combat/resolveClientCombatEquipment.js';
import { initCombatEquipmentBridge } from '../combat/combatEquipmentBridge.js';
import { registerPlayerHonorSender } from '../ui/battle/playerHonorClient.js';
import { applyPlayerHonorResult } from '../ui/battle/PlayerHonorCard.js';
import { setOpponentHonorCount } from '../ui/battle/postBattleHonorContext.js';
import { isPlayerHonorResultPayload } from '../../shared/combat/playerHonorTypes.js';
import { isBattleEndedPayload } from '../../shared/combat/battleEnded.js';
import { isBattleLootPackagePayload } from '../../shared/combat/battleLootPackage.js';
import { captureBattleLootPackage } from '../combat/client/battleLootPackageBuffer.js';
import { getPlayerPetStore, initPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { canPetEnterBattle } from '../../shared/pet/petModel.js';
import { initGlobalPlayerStore, getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { initPlayerHudHpMaxSync } from '../ui/equipment/playerHudHpMax.js';
import { bootstrapEmptyPlayerItems, bootstrapMvpPlayerItems } from '../game/PlayerItemSession.js';
import { prefetchItemCatalogExtra } from '../../shared/items/itemCatalog.js';
import { attachOnlineEconomyLayer, getDataStore } from '../economy/economyLayer.js';
import { requestReturnToExploration } from '../game/battleReturnToWorld.js';
import {
  initGameStateProvider,
  startBattle,
  enterBattleFromServer,
  getGameStateManager,
  resetGameStateManager,
} from '../game/GameStateProvider.js';
import { MapManager } from '../managers/mapManager.js';
import type { WorldSocket } from '../world/WorldSocket.js';
import {
  createAuthoritativeWorldSocket,
  isAuthoritativeWorldSocket,
} from '../world/authoritativeWorldSocket.js';
import { applyWorldPeersPayload } from '../world/worldPeersStore.js';
import { DEFAULT_MAP_ID } from '../../shared/world/mapRegistry.js';
import { getZoneTransitionController } from '../world/zoneTransitionController.js';
import { getGameRenderLoop, resetGameRenderLoop } from '../render/GameRenderLoop.js';
import { resetWorldMovementAuthority } from '../world/worldMovementAuthority.js';
import { ExplorationScene } from '../scenes/Exploration.js';
import { loadSelectedCharacterAppearance } from '../services/characterAppearancePersistence.js';
import { AppScreens } from './appScreens.js';
import { createBrowserCombatSocket, connectionPhaseLabel, type BrowserCombatSocket } from './createBrowserCombatSocket.js';
import { mountWorldMapScene, SceneManager, resetWorldMapSceneMount } from './sceneManager.js';
import { initGameRoot } from './GameRoot.js';
import {
  destroyUiLayer,
  getPlayerEquipmentStore,
  getPlayerProfileStore,
  initPlayerWalletStore,
  initUiLayer,
  removeLegacyTopLogOverlay,
} from '../ui/index.js';
import { handleInboundLogService, initLogServiceUi } from '../ui/logService.js';
import {
  bindRefractionBoothSocket,
  setRefractionBoothCredentials,
} from '../cityMinigames/refractionBoothClient.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { getMutableDataStore, initDataStore } from '../PlayerDataStore.js';
import {
  handleIntentFailedPayload,
  handleIntentResultPayload,
  handleIntentSuccessPayload,
} from '../intent/intentAckClient.js';
import { pendingIntentToWire } from '../../shared/intent/clientIntent.js';
import { resolveActiveServerId } from '../auth/resolveLoginServerId.js';
import { PositionGateway } from '../world/PositionGateway.js';
import { initGlobalChatController } from '../world/globalChatController.js';
import { resetSpeechBubbleManager } from '../world/speech/SpeechBubbleManager.js';
import {
  isWorldSessionReady,
  resetWorldSessionGate,
  setWorldSessionReady,
} from '../world/worldSessionGate.js';
import {
  clearWorldLoginRetry,
  scheduleWorldLoginRetry,
} from '../world/worldLoginCoordinator.js';
import { PHASER_MOUNT_ROOT_ID } from '../phaser/PhaserConfig.js';
import {
  beginWorldChroniclesSession,
  bindWorldLoreWsTransport,
  clearWorldLoreWsTransport,
  markWorldChroniclesSessionEnd,
} from '../services/worldLoreClient.js';
import type { WorldChroniclesRequest } from '../../shared/world/worldLoreTypes.js';
import type { WorldLoginResult } from '../../shared/world/playerWorldProfile.js';
import { hidePauseMenu, setWorldSessionActive } from '../components/pauseMenu.js';
import { getHudBridge } from '../app/bridge/hudBridge.js';
import { resolveGameWsUrl } from '../../shared/net/resolveWsUrl.js';
import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { subscribeAuthStateChange } from '../auth/supabaseAuth.js';
import { presentMinorAccountAviso } from '../world/minorAccountAviso.js';
import { bootOnlinePhaserExploration, enablePhaserForOnlineSession } from '../app/phaser/initPhaserReadyLayer.js';
import { registerMapLoadFatalHandler } from '../phaser/tiled/mapLoadFatalError.js';
import { resetExplorationRenderBridge } from '../app/bridge/explorationRenderBridge.js';
import { deactivateGameDomain } from '../domains/executionDomain.js';
import { resetServiceRegistry } from '../domains/ServiceRegistry.js';
import { warnIfStaleClientBuild } from './runtimeBuildIntegrity.js';

const DEV_DEBUG_ALLOWED_EMAILS: readonly string[] = ['juninhomc94@gmail.com'];

let mapManager: MapManager | null = null;
let worldSocket: WorldSocket | null = null;
let world: ExplorationScene | null = null;
let socket: BrowserCombatSocket | null = null;
let positionGateway: PositionGateway | null = null;
let teardownAccessTokenRefresh: (() => void) | null = null;
let teardownGlobalChat: (() => void) | null = null;
let worldStarted = false;
let gameLoopStarted = false;
let onWorldResize: (() => void) | null = null;
let teardownGameState: (() => void) | null = null;
let teardownGameRoot: (() => void) | null = null;
let teardownLightOverlay: (() => void) | null = null;

registerMapLoadFatalHandler(() => {
  worldStarted = false;
  getGameRenderLoop().stop();
});

export function isWorldSessionStarted(): boolean {
  return worldStarted;
}

function setStatus(text: string): void {
  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.textContent = text;
}

function bootstrapHpBars(_state: CombatState): void {
  /* HP renderizado pela BattleScreen (Fire Emblem HUD). */
}

function isWorldLoginResult(raw: unknown): raw is WorldLoginResult {
  if (!raw || typeof raw !== 'object') return false;
  const record = raw as Record<string, unknown>;
  if (record.ok !== true) return false;
  if (typeof record.currentMapId !== 'string') return false;
  const pos = record.lastPosition;
  if (!pos || typeof pos !== 'object') return false;
  const position = pos as Record<string, unknown>;
  if (typeof position.x !== 'number' || typeof position.y !== 'number') return false;
  return typeof record.facing === 'string';
}

function setExplorationOnlineMode(enabled: boolean): void {
  if (!isAuthoritativeWorldSocket(worldSocket)) return;
  if (enabled) {
    worldSocket.setOnlineMode(true, {
      onMove: (movePayload) => {
        getActionDispatcher().dispatchMoveIntent(movePayload);
      },
      onRotate: (rotatePayload) => {
        getActionDispatcher().dispatchRotateIntent(rotatePayload);
      },
    });
    return;
  }
  worldSocket.setOnlineMode(false);
}

function wirePortalTransitionBridge(): void {
  if (!world) return;

  world.setPositionFlushBeforePortal(() => {
    if (getGameStateManager().isExploration()) {
      positionGateway?.flush('heartbeat');
    }
  });

  const useRemote = socket !== null && socket.readyState === 1;
  world.configurePortalTransitionRemote(
    useRemote
      ? (request) => {
          socket?.send('portal-transition-request', request);
        }
      : undefined,
  );
}

function syncRefractionBoothCredentials(): void {
  const session = AppScreens.currentSession;
  const character = AppScreens.getSelectedCharacter();
  if (!session || !character) {
    setRefractionBoothCredentials(null);
    return;
  }
  setRefractionBoothCredentials({
    playerId: session.id,
    characterId: character.id,
    displayName: character.name,
  });
}

const WORLD_AUTH_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: 'Sessão expirada. Faça login novamente.',
  AUTH_INVALID: 'Sessão inválida. Faça login novamente.',
  AUTH_MISMATCH: 'Conta inconsistente. Faça login novamente.',
  WRONG_SERVER: 'Servidor incorreto. Escolha o shard correto na seleção de personagem.',
  PROFILE_NOT_READY: 'Personagem ainda não provisionado. Crie um personagem ou aguarde.',
  WORLD_LOGIN_FAILED: 'Falha ao sincronizar personagem — tentando novamente…',
};

function requestWorldLoginIfPossible(): void {
  if (!world || !positionGateway) return;
  void positionGateway.requestWorldLogin(world.captureExplorationSnapshot());
}

function beginWorldLoginHandshake(): void {
  resetWorldSessionGate();
  clearWorldLoginRetry();
  scheduleWorldLoginRetry(requestWorldLoginIfPossible);
}

function syncExplorationOnlineFromSocket(): void {
  if (socket?.readyState !== 1) return;
  attachOnlineEconomyLayer();
  setExplorationOnlineMode(true);
}

function focusGameRenderSurfaceForInput(): void {
  const surface = document.getElementById(PHASER_MOUNT_ROOT_ID);
  if (!(surface instanceof HTMLElement)) return;
  surface.tabIndex = -1;
  if (!surface.hasAttribute('role')) {
    surface.setAttribute('role', 'application');
  }
}

function handleWorldAuthError(reason: string): void {
  const msg = WORLD_AUTH_ERROR_MESSAGES[reason] ?? `Erro de conexão (${reason}).`;

  if (reason === 'AUTH_REQUIRED' || reason === 'AUTH_INVALID' || reason === 'AUTH_MISMATCH') {
    if (reason === 'AUTH_REQUIRED' && worldStarted && !isWorldSessionReady()) {
      setStatus('Sincronizando sessão…');
      requestWorldLoginIfPossible();
      return;
    }

    setStatus(msg);
    resetWorldSessionGate();
    setWorldSessionActive(false);
    clearWorldLoginRetry();
    AppScreens.returnToLogin();
    return;
  }

  if (reason === 'WRONG_SERVER' || reason === 'PROFILE_NOT_READY') {
    setStatus(msg);
    resetWorldSessionGate();
    setWorldSessionActive(false);
    clearWorldLoginRetry();
    void AppScreens.showCharSelect();
    AppScreens.renderCharacterHubError(msg);
    return;
  }

  if (reason === 'WORLD_LOGIN_FAILED') {
    setStatus(msg);
    requestWorldLoginIfPossible();
    return;
  }

  setStatus(msg);
}

function handleWorldLoginResult(raw: unknown): void {
  if (!isWorldLoginResult(raw)) {
    setStatus('Falha ao sincronizar posição do mundo — tentando novamente…');
    requestWorldLoginIfPossible();
    return;
  }

  clearWorldLoginRetry();
  initDataStore();
  getMutableDataStore().applyWorldSpawnFromServer({
    currentMapId: raw.currentMapId,
    lastPosition: raw.lastPosition,
    facing: raw.facing,
  });

  if (isAuthoritativeWorldSocket(worldSocket)) {
    worldSocket.seedPredictedPosition(raw.lastPosition);
    worldSocket.applyServerWorldState({
      currentMapId: raw.currentMapId,
      lastPosition: raw.lastPosition,
      facing: raw.facing,
    });
  }

  world?.applyServerWorldSpawn(raw);
  syncRefractionBoothCredentials();
  setWorldSessionReady(true);
  setWorldSessionActive(true);
  world?.setPaused(false);
  positionGateway?.startHeartbeat();
  syncExplorationOnlineFromSocket();
  getGlobalStateSynchronizer().requestFullState();
  setStatus('Conectado');

  presentMinorAccountAviso(raw.aviso_menor);
}

function connectSocket(): void {
  if (socket) {
    positionGateway?.bindSocket(socket);
    refreshCombatDevBindings();
    syncExplorationOnlineFromSocket();
    if (world && !isWorldSessionReady()) {
      void positionGateway?.requestWorldLogin(world.captureExplorationSnapshot());
    }
    return;
  }

  registerCombatDevTransportResolver(() => {
    if (!socket) return null;
    return (type, payload) => socket?.send(type, payload);
  });

  const synchronizer = getGlobalStateSynchronizer();

  socket = createBrowserCombatSocket(
    resolveGameWsUrl(window.location, getClientRuntimeConfig()?.gameWsUrl),
    {
      onReconnect: () => {
        synchronizer.onReconnect();
        if (world && positionGateway) {
          void positionGateway.requestWorldLogin(world.captureExplorationSnapshot());
        }
      },
      onSystemError: (reason) => {
        handleWorldAuthError(reason);
      },
    },
  );
  positionGateway?.bindSocket(socket);
  bindRefractionBoothSocket(socket);

  synchronizer.bindSocket(socket);
  synchronizer.setRequestTransport(() => {
    const selected = AppScreens.getSelectedCharacter();
    if (!selected) return;
    synchronizer.setCharacterId(selected.id);
    socket?.send('request-full-state', { characterId: selected.id });
  });

  socket.onPhaseChange((phase) => {
    if (phase === 'connected') {
      setStatus('Conectado — sincronizando…');
      return;
    }
    setStatus(connectionPhaseLabel(phase));
  });
  const dispatcher = getActionDispatcher();
  dispatcher.setIntentTransport((intent) => {
    socket?.send('player-intent', pendingIntentToWire(intent, resolveActiveServerId()));
  });

  configureCombatClient({
    emitAction: (action) => socket?.send('combat-action', action),
    emitForfeit: (battleId) => {
      socket?.send('combat-forfeit', { battleId });
    },
    onBattleEnded: () => {
      void requestReturnToExploration({ victory: false });
    },
  });
  refreshCombatDevBindings();
  configureBattleLootClient(socket);
  registerPlayerHonorSender((payload) => {
    socket?.send('player-honor-given', payload);
  });

  socket.on('player-honor-result', (raw) => {
    if (!isPlayerHonorResultPayload(raw) || !raw.ok) return;
    setOpponentHonorCount(raw.honorCount);
    applyPlayerHonorResult(raw.battleId, raw.recipientActorId, raw.honorCount);
  });

  socket.on('combat-event', createCombatSocketHandler({
    handleCombatDispatch: (payload) => {
      bootstrapHpBars(payload.state);
      GameClient.handleCombatDispatch(payload);
      notifyMirrorPlayerDispatch(payload);
    },
  }));

  socket.on('BATTLE_ENDED', (raw) => {
    InputHandler.resetKeys();
    if (isBattleEndedPayload(raw)) {
      GameClient.handleBattleEnded(raw);
    }
  });

  socket.on('BATTLE_LOOT_PACKAGE', (raw) => {
    if (isBattleLootPackagePayload(raw)) {
      captureBattleLootPackage(raw);
    }
  });

  socket.on('log-service', (raw) => {
    handleInboundLogService(raw);
  });

  socket.on('START_COMBAT', (raw) => {
    if (raw && typeof raw === 'object' && typeof (raw as { battleId?: unknown }).battleId === 'string') {
      registerActiveBattleId((raw as { battleId: string }).battleId);
    }
    positionGateway?.stopHeartbeat();
    InputHandler.resetKeys();
    void enterBattleFromServer().then(() => setStatus('Combate iniciado…'));
  });

  socket.on('world-login-result', handleWorldLoginResult);

  socket.on('portal-transition-ready', (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const payload = raw as import('../../shared/world/zoneTransition.js').PortalTransitionReadyPayload;
    if (typeof payload.requestId !== 'string' || typeof payload.mapId !== 'string') return;
    getZoneTransitionController()?.handleServerReady(payload);
  });

  socket.on('portal-transition-failed', (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const payload = raw as import('../../shared/world/zoneTransition.js').PortalTransitionFailedPayload;
    if (typeof payload.requestId !== 'string') return;
    getZoneTransitionController()?.handleServerFailed(payload);
  });

  socket.on('world-chronicles-result', (raw) => {
    if (raw && typeof raw === 'object') {
      window.dispatchEvent(new CustomEvent('altercadia:world-chronicles-result', { detail: raw }));
    }
  });

  bindWorldLoreWsTransport(
    (request: WorldChroniclesRequest) => {
      socket?.send('world-chronicles-request', request);
    },
    (handler) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail && typeof detail === 'object') {
          handler(detail as import('../../shared/world/worldLoreTypes.js').WorldChroniclesSnapshot);
        }
      };
      window.addEventListener('altercadia:world-chronicles-result', listener);
      return () => window.removeEventListener('altercadia:world-chronicles-result', listener);
    },
  );

  socket.on('economy-event', (raw) => {
    if (isEconomyEvent(raw)) {
      applyEconomyEventToHud(raw);
    }
  });

  socket.on('intent-result', handleIntentResultPayload);
  socket.on('intent-failed', handleIntentFailedPayload);
  socket.on('intent-success', handleIntentSuccessPayload);

  socket.on('state-sync', (raw) => {
    const result = synchronizer.applyStateSync(raw);
    if (result === 'discard_stale') {
      console.debug('[Sync] Pacote SYNC descartado (atrasado).');
    }
  });

  socket.on('full-state-sync', (raw) => {
    synchronizer.applyLegacyFullState(raw);
  });

  socket.on('world-peers', (raw) => {
    applyWorldPeersPayload(raw);
  });

  socket.onOpen(() => {
    attachOnlineEconomyLayer();
    setExplorationOnlineMode(true);
    setStatus('Sincronizando personagem… (WASD após conectar)');
    if (!world) return;
    world.setCombatJoinHandler((monsterId) => {
      void startBattle(monsterId);
    });
    wirePortalTransitionBridge();
    requestWorldLoginIfPossible();
  });

  socket.onError((message) => {
    if (socket?.getConnectionPhase() === 'reconnecting') {
      setStatus('Reconectando…');
      return;
    }
    setExplorationOnlineMode(false);
    setStatus(message);
  });
  socket.onClose((message) => {
    if (socket?.getConnectionPhase() === 'reconnecting') {
      setStatus('Reconectando…');
      return;
    }
    setExplorationOnlineMode(false);
    setStatus(message);
    SceneManager.showExploration();
    wirePortalTransitionBridge();
  });

  setStatus('Conectando…');
}

export function enterWorldAfterHudReady(): void {
  if (worldStarted) return;

  void warnIfStaleClientBuild('enter-world').then((integrity) => {
    if (integrity.stale) {
      setStatus(
        `Versão antiga no cache (carregado ${integrity.loaded}, produção ${integrity.expected}). `
        + 'Recarregue com Ctrl+Shift+R.',
      );
    }
  });

  beginWorldLoginHandshake();
  mountWorldMapScene();
  AppScreens.showGameWorld();

  try {
    initUiLayer(document);
    teardownLightOverlay?.();
    void import('../ui/ambient/AmbientOverlay.js')
      .then(({ mountAmbientOverlay }) => {
        teardownLightOverlay = mountAmbientOverlay().destroy;
      })
      .catch((error) => {
        console.warn('[Ambient] Overlay indisponível — mundo segue sem atmosfera dinâmica.', error);
      });
    removeLegacyTopLogOverlay();
    initLogServiceUi();
    initGlobalPlayerStore();
    initPlayerWalletStore();
    initPlayerPetStore();

    const selected = AppScreens.getSelectedCharacter();
    const equipmentStore = getPlayerEquipmentStore();
    const profileStore = getPlayerProfileStore();
    if (selected) {
      profileStore.setProfile(selected.name, selected.level);
      equipmentStore.setPlayerInfo(selected.name, selected.level, {
        resetVitals: true,
        classId: selected.class,
      });
      loadSelectedCharacterAppearance();
    } else {
      profileStore.setProfile('Operative', 1);
      equipmentStore.setPlayerInfo('Operative', 1, { resetVitals: true });
    }
    if (AppScreens.currentSession) {
      bootstrapEmptyPlayerItems();
    } else {
      bootstrapMvpPlayerItems();
    }
    void prefetchItemCatalogExtra();
    getGlobalPlayerStore().applyClassMoveset(equipmentStore.getSnapshot().classId);
    getBattleStore().resyncLoadout();
    initPlayerHudHpMaxSync();
    initCombatEquipmentBridge();

    mapManager = new MapManager(DEFAULT_MAP_ID);
    worldSocket = createAuthoritativeWorldSocket(DEFAULT_MAP_ID);
    world = new ExplorationScene(mapManager, worldSocket);
    const activeWorld = world;
    activeWorld.resize();
    if (selected) {
      activeWorld.setPlayerDisplayName(selected.name);
      activeWorld.setPlayerLevel(selected.level);
      activeWorld.setWorldIdentity(
        AppScreens.currentSession?.id ?? 'local-player',
        selected.id,
      );
    } else {
      activeWorld.setWorldIdentity('local-player', 1);
    }
    syncRefractionBoothCredentials();

    teardownGlobalChat?.();
    teardownGlobalChat = initGlobalChatController({
      getSocket: () => socket,
      getCredentials: () => {
        const session = AppScreens.currentSession;
        const character = AppScreens.getSelectedCharacter();
        if (!session || !character) return null;
        return {
          playerId: session.id,
          characterId: character.id,
          displayName: character.name,
        };
      },
      getWorld: () => activeWorld,
    });

    positionGateway = new PositionGateway({
      socket: null,
      getCredentials: () => {
        const session = AppScreens.currentSession;
        const character = AppScreens.getSelectedCharacter();
        if (!session || !character) return null;
        return {
          playerId: session.id,
          characterId: character.id,
          displayName: character.name,
        };
      },
      captureSnapshot: () => activeWorld.captureExplorationSnapshot(),
      isExploration: () => getGameStateManager().isExploration(),
      onWorldLoginBlocked: handleWorldAuthError,
    });

    teardownAccessTokenRefresh?.();
    teardownAccessTokenRefresh = subscribeAuthStateChange((event) => {
      if (event !== 'TOKEN_REFRESHED') return;
      if (!isWorldSessionReady()) return;
      void positionGateway?.refreshServerAccessToken();
    });

    teardownGameState?.();
    teardownGameState = initGameStateProvider({
      onPauseExploration: () => {
        positionGateway?.stopHeartbeat();
        activeWorld.setPaused(true);
      },
      onResumeExploration: (snapshot) => {
        if (snapshot) {
          activeWorld.restoreExplorationSnapshot(snapshot);
        }
        activeWorld.setPaused(false);
      },
      onEnterExplorationVisual: () => {
        activeWorld?.setPaused(false);
      },
      captureExplorationSnapshot: () => activeWorld.captureExplorationSnapshot(),
      requestCombatJoin: (encounter) => {
        const selectedCharacter = AppScreens.getSelectedCharacter();
        const vitals = getGlobalPlayerStore().getWorldVitals();
        const marcos = getDataStore().getMarcosState();
        const pet = getPlayerPetStore().getSnapshot();
        const equipmentSnapshot = resolveClientCombatEquipmentSnapshot();
        socket?.send('combat-join', {
          displayName: selectedCharacter?.name,
          classId: selectedCharacter?.class ?? getPlayerEquipmentStore().getSnapshot().classId,
          activeMovesets: [...getGlobalPlayerStore().getConfirmedLoadout()],
          monsterInstanceId: encounter.monsterId,
          worldVitals: vitals,
          equipmentSnapshot: { ...equipmentSnapshot },
          marcoDominance: {
            activeMarcos: [...marcos.activeMarcos],
            nodeProgression: marcos.nodeProgression,
          },
          ...(pet && canPetEnterBattle(pet) ? { pet } : {}),
        });
      },
    });

    teardownGameRoot?.();
    teardownGameRoot = initGameRoot(document.getElementById('game-container') ?? document);

    onWorldResize = () => activeWorld.applyFixedViewport();
    window.addEventListener('resize', onWorldResize);

    if (!gameLoopStarted) {
      gameLoopStarted = true;
      getGameRenderLoop().start({
        shouldRun: () => worldStarted && world !== null && getGameStateManager().isExploration(),
        onUpdate: (deltaMs) => {
          world?.update(deltaMs);
        },
        onPrepare: (deltaMs) => {
          world?.prepareFrame(deltaMs);
        },
        onRender: (timestampMs) => {
          world?.syncWorldDomOverlay(timestampMs);
        },
      });
    }

    connectSocket();
    wirePortalTransitionBridge();
    focusGameRenderSurfaceForInput();

    enablePhaserForOnlineSession();

    activeWorld.prepareFrame(0);
    activeWorld.syncWorldDomOverlay(performance.now());

    worldStarted = true;
    initDebugMenuIfAllowed({
      currentUserEmail: AppScreens.currentSession?.email ?? null,
      allowedEmails: DEV_DEBUG_ALLOWED_EMAILS,
      onLevelChanged: (level) => activeWorld.setPlayerLevel(level),
    });

    void bootOnlinePhaserExploration().then((phaserBooted) => {
      if (!phaserBooted || !world) {
        return;
      }
      world.prepareFrame(0);
      world.syncWorldDomOverlay(performance.now());
      console.debug('[Altercadia] Runtime Phaser iniciado — montagem do mapa Tiled em andamento.');
    });

    console.log('[Altercadia] Entrou no mundo', {
      userId: AppScreens.currentSession?.id,
      character: selected,
    });

    if (selected) {
      setStatus(`Sincronizando ${selected.name}… clique no mapa ou use WASD quando conectar.`);
    }

    const loreCreds = AppScreens.currentSession && selected
      ? { playerId: AppScreens.currentSession.id, characterId: selected.id }
      : { playerId: 'local-player', characterId: 1 };
    beginWorldChroniclesSession(loreCreds.playerId, loreCreds.characterId);
  } catch (error) {
    console.error('[Altercadia] Falha ao entrar no mundo:', error);
    setStatus('Erro ao carregar o mundo — recarregue a página (F5).');
    teardownGameRoot?.();
    teardownGameRoot = null;
    teardownGameState?.();
    teardownGameState = null;
    teardownGlobalChat?.();
    teardownGlobalChat = null;
    destroyUiLayer();
    world = null;
    worldSocket = null;
    mapManager = null;
    worldStarted = false;
    setWorldSessionActive(false);
    hidePauseMenu();
    mountWorldMapScene();
    SceneManager.showExploration();
  }
}

export function clearGameState(): void {
  hidePauseMenu();
  getHudBridge().resetSession();

  teardownGlobalChat?.();
  teardownGlobalChat = null;
  resetSpeechBubbleManager();

  setExplorationOnlineMode(false);
  teardownAccessTokenRefresh?.();
  teardownAccessTokenRefresh = null;
  positionGateway?.stopHeartbeat();
  positionGateway?.destroy();
  positionGateway = null;
  clearWorldLoreWsTransport();

  const session = AppScreens.currentSession;
  const character = AppScreens.getSelectedCharacter();
  if (session && character) {
    markWorldChroniclesSessionEnd(session.id, character.id);
  }

  resetWorldSessionGate();
  clearWorldLoginRetry();

  if (socket) {
    socket.removeAllListeners();
    socket.close(1000, 'player_exit');
    socket = null;
  }
  refreshCombatDevBindings();

  teardownGameRoot?.();
  teardownGameRoot = null;
  teardownGameState?.();
  teardownGameState = null;
  resetGameStateManager();
  resetWorldMapSceneMount();
  configureCombatClient({});

  if (onWorldResize) {
    window.removeEventListener('resize', onWorldResize);
    onWorldResize = null;
  }

  InputHandler.detach();
  InputHandler.resetKeys();

  world?.dispose();
  world = null;
  resetExplorationRenderBridge();

  if (worldSocket && isAuthoritativeWorldSocket(worldSocket)) {
    worldSocket.removeAllListeners();
  }
  worldSocket = null;
  mapManager = null;

  resetWorldMovementAuthority();
  resetGameRenderLoop();
  gameLoopStarted = false;
  worldStarted = false;
  setWorldSessionActive(false);
  hidePauseMenu();
  destroyUiLayer();
  AppScreens.selectedCharacterId = null;
  SceneManager.showExploration();
  setStatus('Sessão encerrada.');

  deactivateGameDomain();
  resetServiceRegistry();
}
