import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import {
  collectBattleLoot,
  consumeChargedEquipmentBattleParticipation,
  debitBattleSurrenderPenalty,
  dismissBattleLoot,
  stageBattleLoot,
  sweepExpiredInventoryLocks,
} from '../../Economy/economyGateway.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { isOriginAllowed } from '../config/cors.js';
import type { ActionRequest } from '../../shared/events.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { BATTLE_SESSION_LEASE_SWEEP_MS } from '../../shared/combat/battleSessionLeaseConstants.js';
import { combatReactionStaggerDelay } from '../../shared/combat/combatReactionDelay.js';
import {
  shouldStaggerMonsterReaction,
  splitDispatchForMonsterStagger,
} from '../../shared/combat/combatDispatchStagger.js';
import {
  didPlayerWinBattle,
  resolveBattleCreatureId,
} from '../../shared/items/combatCreatureRegistry.js';
import { parseWsInbound, serializeWsOutbound, type WsOutboundMessage } from '../../shared/wsProtocol.js';
import { CombatSession } from '../combat/CombatSession.js';
import {
  clearBattleSessionLease,
  listExpiredBattleSessionLeases,
  registerBattleSessionLease,
  touchBattleSessionLease,
  getBattleSessionLease,
} from '../combat/battleSessionLease.js';
import { createPveBattleBootstrap } from '../combat/buildPveBattle.js';
import { applyCombatJoinSessionSync, type CombatJoinSessionSyncInput } from '../combat/applyCombatJoinSessionSync.js';
import { grantPlayerHonor } from '../combat/playerHonorStore.js';
import { resolveAuthoritativeCombatLoadout } from '../persistence/authoritativeCombatLoadout.js';
import { MovementIntentHandler } from '../handlers/world/MovementIntentHandler.js';
import { getTimeManager } from '../TimeManager.js';
import { sendIntentFailure } from '../network/intentOrchestrator.js';
import {
  buildIntentValidationContext,
  logRejectedPlayerIntent,
} from '../network/intentValidationLogger.js';
import type { ClientIntent } from '../../shared/intent/clientIntent.js';
import {
  acceptClientIntent,
  clearIntentReplaySession,
} from '../network/intentReplayGuard.js';
import { getActionDispatcher } from '../network/ActionDispatcher.js';
import type { Player } from '../models/Player.js';
import { getOrCreatePlayerSession, isPlayerInBattle } from '../models/playerSessionRegistry.js';
import { PositionGateway } from '../world/PositionGateway.js';
import {
  clearPlayerSessionFlags,
  setPlayerInBattle,
  setPlayerLoggingOut,
} from '../world/worldExplorationSessionFlags.js';
import { PortalTransitionGateway } from '../world/PortalTransitionGateway.js';
import { getWorldProfile } from '../world/worldProfileStore.js';
import { getWorldLoreLog } from '../world/WorldLoreLog.js';
import { recordPlayerLastSeen } from '../world/playerPresenceStore.js';
import type { StagedBattleLootResult } from '../../Economy/economyGateway.js';
import type { BattleLootPreview } from '../../shared/loot/lootTypes.js';
import { resolveDefeatedCreatureLevel } from '../../shared/combat/battleXpRewards.js';
import { finalizeAuthoritativeBattleEnd } from '../combat/finalizeAuthoritativeBattleEnd.js';
import { finalizeAuthoritativeRankedPvpEnd } from '../combat/finalizeAuthoritativeRankedPvpEnd.js';
import {
  getPvpRankedQueueManager,
  type PvpRankedMatchPair,
} from '../combat/pvp/PvpRankedQueueManager.js';
import { createPvpRankedBattleBootstrap } from '../combat/pvp/buildPvpRankedBattle.js';
import { RankedPvpCombatSession } from '../combat/pvp/RankedPvpCombatSession.js';
import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  isValidPlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../shared/character/playerSkinBundle.js';
import { PVP_RANKED_STATION_ID } from '../../shared/combat/pvp/pvpRankedQueueConfig.js';
import type { PvpRankedQueueSnapshot } from '../../shared/combat/pvp/pvpRankedQueueProtocol.js';
import {
  getAuthoritativeProgression,
  patchAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';
import { repairTrailStarterIfNeeded } from '../../Economy/progressionGateway.js';
import { buildCriticalCharacterDataFromRuntime } from '../supabase/buildCriticalCharacterData.js';
import { getInventoryPersistenceBridge } from '../supabase/inventoryPersistenceBridge.js';
import { getPersistenceManager } from '../supabase/persistenceManagerRegistry.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import { validateGlobalChatOnServer } from '../chat/globalChatModeratorServer.js';
import {
  bindChatGlobalBroadcaster,
  bindChatGlobalDisplayNameResolver,
  broadcastChatGlobalPayload,
  unbindChatGlobalBroadcast,
} from '../chat/chatGlobalBroadcast.js';
import { WORLD_TICK_MS } from '../../shared/sync/syncProtocol.js';
import type { StateSyncBody } from '../../shared/sync/syncProtocol.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { getMonsterRegistryEntry, type MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import { tickCreatureWanderAi } from '../world/creatureAiTick.js';
import {
  abandonPveEncounterOnDisconnect,
  acceptPveEncounter,
  clearForceJoinInFlight,
  consumeForceBattleNextEncounter,
  consumePveCombatGrant,
  releasePveMonsterClaim,
  requestPveEncounterOffer,
  tickPveEncounterOffers,
  tryFleePveEncounter,
  type PveEncounterOutbound,
} from '../world/pveEncounterManager.js';
import {
  scheduleWorldMonsterRespawn,
  tickWorldMonsterRespawns,
} from '../world/monsterRespawnScheduler.js';
import { CREATURE_RESPAWN_MS } from '../../shared/world/creatureWanderConfig.js';
import { buildServerScopedWorldCreaturesNearObserver, normalizeProfileForServerInstance } from '../instance/serverWorldScope.js';
import { getZoneLoadGateway } from '../world/ZoneLoadGateway.js';
import { clearCreatureSyncConnection } from '../world/creatureSyncDirty.js';
import { assertPlayerBoundToServerInstance } from '../instance/playerInstanceBinding.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';
import type { ServerEnv } from '../config/env.js';
import { ServerSyncAuthority } from '../sync/ServerSyncAuthority.js';
import { WorldTickScheduler } from '../world/WorldTickScheduler.js';
import { GameLoop } from '../world/GameLoop.js';
import { getWorldGameState } from '../world/WorldGameState.js';
import { WorldBroadcastHub } from '../world/WorldBroadcastHub.js';
import { WorldPersistenceScheduler } from '../world/WorldPersistenceScheduler.js';
import {
  buildAuthoritativeSnapshotForCharacter,
  hydrateCharacterSession,
  isDurablePersistence,
  persistCharacterSession,
  persistPendingLootSnapshot,
  touchCharacterPersistenceDirty,
} from '../persistence/PersistenceGateway.js';
import { reconcileAuthoritativeCharacterClassLink } from '../progression/reconcileCharacterClassLink.js';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import { resolveMinorAccountNotice, buildAvisoMenor } from '../../shared/auth/accountAgePolicy.js';
import { SecurityGuard } from '../middleware/securityGuard.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';
import {
  persistAuthoritativeLoginSnapshot,
  resolveLoginSnapshotScope,
} from '../supabase/persistAuthoritativeLoginSnapshot.js';
import { CombatTurnController } from './ws/combatTurnController.js';
import { EconomyEventForwarder } from './ws/economyEventForwarder.js';
import { routeWsInboundMessage } from './ws/registerWsInboundRoutes.js';
import type { CombatWsRouteHost } from './ws/wsInboundRouter.js';
import {
  type LiveSocket,
  type WorldConnectionState,
  WORLD_AUTH_REQUIRED_MESSAGES,
  WS_JWT_REVALIDATED_WRITE_MESSAGES,
} from './ws/wsConnectionTypes.js';
import {
  revalidateWorldWriteAccess,
  shouldRevalidateWorldWriteJwt,
} from './ws/wsWriteAuthGate.js';

export type { LiveSocket, WorldConnectionState } from './ws/wsConnectionTypes.js';

export type CombatWsHubOptions = {
  readonly corsOrigins: readonly string[];
  readonly serverEnv: ServerEnv;
};


/** Limite de payload WS — protege parse/memória sob carga (100+ players). */
const MAX_WS_INBOUND_BYTES = 65_536;
const MAX_COMBAT_JOIN_TILE_DISTANCE = 1;

type PveMonsterJoinAuthorization =
  | { readonly ok: true; readonly monster: MonsterRegistryEntry }
  | {
      readonly ok: false;
      readonly reason:
        | 'MISSING_MONSTER_INSTANCE'
        | 'MONSTER_NOT_ACTIVE'
        | 'MONSTER_MAP_MISMATCH'
        | 'PLAYER_NOT_EXPLORING'
        | 'MONSTER_TOO_FAR'
        | 'ENCOUNTER_REQUIRED';
    };

export class CombatWsHub implements CombatWsRouteHost {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<string, CombatSession>();
  /** Duelos PVP rankeados — battleId → sessão dual. */
  private readonly rankedSessionsByBattleId = new Map<string, RankedPvpCombatSession>();
  private readonly rankedBattleByConnectionId = new Map<string, string>();
  private rankedMatchBootstrapInFlight = false;
  private readonly socketsByPlayerId = new Map<string, WebSocket>();
  private readonly socketsByConnectionId = new Map<string, WebSocket>();
  private readonly combatTurnController: CombatTurnController;
  private readonly economyEventForwarder = new EconomyEventForwarder();
  private readonly stagedLootBattleIds = new Set<string>();
  private readonly pendingCollectLootByConnection = new Map<string, { readonly battleId: string; readonly lootId: string }>();
  private readonly persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly corsOrigins: readonly string[];
  private readonly serverEnv: ServerEnv;
  readonly worldConnections = new Map<string, WorldConnectionState>();
  private readonly positionGateway: PositionGateway;
  private readonly movementIntentHandler = new MovementIntentHandler();
  private readonly portalTransitionGateway = new PortalTransitionGateway();
  private readonly worldLoreLog = getWorldLoreLog();
  private readonly syncAuthority = new ServerSyncAuthority();
  private readonly timeManager = getTimeManager();
  private readonly worldTickScheduler = new WorldTickScheduler(WORLD_TICK_MS, () => {
    this.onWorldTick();
  });
  private readonly gameState = getWorldGameState();
  private readonly gameLoop = new GameLoop();
  private readonly broadcastHub = new WorldBroadcastHub((connectionId, payload) => {
    const ws = this.socketsByConnectionId.get(connectionId);
    if (!ws) return;
    this.send(ws, { type: 'world-peers', payload });
  });
  private readonly persistenceScheduler: WorldPersistenceScheduler;
  private lastBattleLeaseSweepMs = 0;

  constructor(server: import('node:http').Server, options: CombatWsHubOptions) {
    this.combatTurnController = new CombatTurnController({
      getSocket: (connectionId) => this.socketsByConnectionId.get(connectionId),
      onTurnTimeout: async (connectionId, session, ws, payload) => {
        await this.deliverCombatPayloadWithMonsterStagger(ws, connectionId, session, payload);
      },
    });
    this.positionGateway = new PositionGateway(this);
    this.corsOrigins = options.corsOrigins;
    this.serverEnv = options.serverEnv;
    this.persistenceScheduler = new WorldPersistenceScheduler(this.serverEnv, this.gameState);
    getInventoryPersistenceBridge()?.setCharacterIdResolver((playerId) => {
      for (const world of this.worldConnections.values()) {
        if (world.playerId === playerId) return world.characterId;
      }
      return undefined;
    });
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        const origin = info.origin;
        const requestHost = info.req.headers.host;
        if (isOriginAllowed(origin, this.corsOrigins, requestHost)) {
          callback(true);
          return;
        }
        console.warn('[WS] Origin bloqueado:', origin, 'host:', requestHost);
        callback(false, 403, 'Origin not allowed');
      },
    });
    this.wss.on('connection', (ws) => this.onConnection(ws as LiveSocket));
    this.economyEventForwarder.bind({
      getSocketByPlayerId: (playerId) => this.socketsByPlayerId.get(playerId),
      syncAuthority: this.syncAuthority,
      sendStateSync: (socket, envelope, body) => this.sendStateSync(socket as LiveSocket, envelope, body),
      send: (socket, message) => this.send(socket, message),
      worldConnections: this.worldConnections,
      scheduleCharacterPersist: (playerId, characterId, options) => {
        this.scheduleCharacterPersist(playerId, characterId, options);
      },
    });
    this.worldTickScheduler.start();
    this.persistenceScheduler.start();
    bindChatGlobalBroadcaster((payload) => {
      this.broadcastChatGlobal(payload);
    });
    bindChatGlobalDisplayNameResolver((playerId, characterId) => {
      for (const world of this.worldConnections.values()) {
        if (world.playerId === playerId && world.characterId === characterId) {
          return world.displayName;
        }
      }
      return null;
    });
    const rankedQueue = getPvpRankedQueueManager();
    rankedQueue.subscribe((snapshot) => {
      this.broadcastPvpRankedQueueSnapshot(snapshot);
    });
    rankedQueue.onMatchReady((match) => {
      void this.bootstrapRankedPvpMatch(match);
    });
    console.log('[WS] CombatWsHub ativo — path=/ws (tick 20Hz)');
  }

  getPlayer(playerId: string, characterId: number): Player | null {
    return getOrCreatePlayerSession(playerId, characterId);
  }

  public close(): Promise<void> {
    unbindChatGlobalBroadcast();
    this.worldTickScheduler.stop();
    this.persistenceScheduler.stop();
    void this.persistenceScheduler.flushAllActive('shutdown');
    this.economyEventForwarder.unbind();
    for (const client of this.wss.clients) {
      client.close(1001, 'server_shutdown');
    }
    this.combatTurnController.clearAll();
    return new Promise((resolve, reject) => {
      this.wss.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private onConnection(ws: LiveSocket): void {
    const connectionId = randomUUID();
    console.log('[WS] Conexão', connectionId);
    this.socketsByConnectionId.set(connectionId, ws);

    ws.on('message', (raw) => {
      const text = typeof raw === 'string' ? raw : raw.toString('utf8');
      void this.onMessage(ws, connectionId, text);
    });

    ws.on('close', () => {
      this.combatTurnController.clearTurnTimer(connectionId);
      this.socketsByConnectionId.delete(connectionId);
      void this.handleRankedDisconnect(connectionId);
      getPvpRankedQueueManager().onDisconnect(connectionId);
      const session = this.sessions.get(connectionId);
      if (session) {
        clearBattleSessionLease(session.getPlayerActorId(), session.getCharacterId());
        setPlayerInBattle(session.getPlayerActorId(), session.getCharacterId(), false);
        this.socketsByPlayerId.delete(session.getPlayerActorId());
      }
      this.sessions.delete(connectionId);
      const worldState = this.worldConnections.get(connectionId);
      if (worldState) {
        setPlayerLoggingOut(worldState.playerId, worldState.characterId, true);
        this.worldLoreLog.onPlayerDisconnect(worldState.playerId, worldState.characterId);
        const removed = this.gameState.unregisterConnection(connectionId);
        this.broadcastHub.clearConnection(connectionId);
        if (removed) {
          void (async () => {
            const manager = getPersistenceManager();
            if (manager?.isEnabled()) {
              const scope = manager.resolveScope(
                removed.playerId,
                removed.characterId,
                getServerInstanceContext().id,
              );
              await manager.onDisconnect(scope);
            }
            await this.persistenceScheduler.flushPlayer(
              removed.playerId,
              removed.characterId,
              'disconnect',
            );
          })();
        } else if (worldState && getPersistenceManager()?.isEnabled()) {
          void getPersistenceManager()!.onDisconnect(
            getPersistenceManager()!.resolveScope(
              worldState.playerId,
              worldState.characterId,
              getServerInstanceContext().id,
            ),
          );
        } else if (isDurablePersistence()) {
          void persistCharacterSession(worldState.playerId, worldState.characterId, {
            force: true,
            reason: 'disconnect',
          });
          void persistPendingLootSnapshot();
        }
        clearPlayerSessionFlags(worldState.playerId, worldState.characterId);
        clearIntentReplaySession(worldState.playerId, worldState.characterId);
        abandonPveEncounterOnDisconnect(worldState.playerId, worldState.characterId);
      }
      this.worldConnections.delete(connectionId);
      this.movementIntentHandler.clearConnection(connectionId);
      clearCreatureSyncConnection(connectionId);
      console.log('[WS] Desconectado', connectionId);
    });
  }

  private async onMessage(ws: LiveSocket, connectionId: string, raw: string): Promise<void> {
    try {
      await this.dispatchInboundMessage(ws, connectionId, raw);
    } catch (error) {
      console.error('[WS] Erro ao processar mensagem', { connectionId, error });
      this.send(ws, { type: 'combat-error', payload: { reason: 'SERVER_ERROR' } });
    }
  }

  private async dispatchInboundMessage(ws: LiveSocket, connectionId: string, raw: string): Promise<void> {
    if (raw.length > MAX_WS_INBOUND_BYTES) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'PAYLOAD_TOO_LARGE' } });
      return;
    }

    this.touchBattleSessionActivity(connectionId);

    const message = parseWsInbound(raw);
    if (!message) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_MESSAGE' } });
      return;
    }

    if (
      message.type !== 'world-login'
      && getSessionAuthGateway().isAuthRequired()
      && WORLD_AUTH_REQUIRED_MESSAGES.has(message.type)
      && !this.worldConnections.has(connectionId)
    ) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'AUTH_REQUIRED' } });
      return;
    }

    if (
      getSessionAuthGateway().isAuthRequired()
      && WS_JWT_REVALIDATED_WRITE_MESSAGES.has(message.type)
      && shouldRevalidateWorldWriteJwt(message.type)
    ) {
      const world = this.worldConnections.get(connectionId);
      if (world && !(await this.ensureWorldWriteAuthorized(ws, connectionId, world, message.type))) {
        return;
      }
    }

    const handled = await routeWsInboundMessage(this, ws, connectionId, message);
    if (!handled) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_MESSAGE' } });
    }
  }

  getCombatSession(connectionId: string): CombatSession | undefined {
    return this.sessions.get(connectionId);
  }

  routeCombatDismissLoot(payload: { readonly lootId: string }): void {
    dismissBattleLoot(payload.lootId);
    void persistPendingLootSnapshot();
  }

  async routeCombatForfeit(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly battleId: string },
  ): Promise<void> {
    const rankedBattleId = this.rankedBattleByConnectionId.get(connectionId);
    if (rankedBattleId) {
      await this.routeRankedCombatForfeit(ws, connectionId, payload.battleId);
      return;
    }
    const session = this.sessions.get(connectionId);
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    const state = session.getState();
    if (payload.battleId !== state.battleId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_BATTLE' } });
      return;
    }
    this.combatTurnController.clearTurnTimer(connectionId);
    const result = await session.forfeitPlayer();
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    const penalty = await debitBattleSurrenderPenalty(
      session.getPlayerActorId(),
      session.getCharacterId(),
    );
    const surrenderVoltPenalty = penalty.ok ? penalty.debited : 0;
    await this.deliverCombatPayload(
      ws,
      connectionId,
      session,
      result.payload,
      'FORFEIT',
      surrenderVoltPenalty,
    );
  }

  async routeCombatAction(
    ws: LiveSocket,
    connectionId: string,
    payload: ActionRequest,
  ): Promise<void> {
    const rankedBattleId = this.rankedBattleByConnectionId.get(connectionId);
    if (rankedBattleId) {
      await this.routeRankedCombatAction(ws, connectionId, payload);
      return;
    }
    const session = this.sessions.get(connectionId);
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    const gate = this.combatTurnController.validateTurnChoiceWindow(connectionId, session, payload);
    if (!gate.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: gate.reason } });
      return;
    }
    this.combatTurnController.clearTurnTimer(connectionId);
    const result = await session.dispatchPlayerAction(payload);
    if (!result.ok) {
      this.combatTurnController.rescheduleActiveTurnTimer(connectionId, session);
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    this.combatTurnController.clearChoiceWindow(connectionId);
    await this.deliverCombatPayloadWithMonsterStagger(ws, connectionId, session, result.payload);
  }

  async routeMirrorCombatAction(
    ws: LiveSocket,
    connectionId: string,
    payload: ActionRequest,
  ): Promise<void> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    const result = await session.dispatchMirrorAction(payload);
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    await this.deliverCombatPayloadWithMonsterStagger(ws, connectionId, session, result.payload);
  }

  async routeDevSpawnMirrorPlayer(ws: LiveSocket, connectionId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      this.send(ws, { type: 'combat-error', payload: { reason: 'DEV_ONLY' } });
      return;
    }
    const session = this.sessions.get(connectionId);
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    const result = session.injectMirrorPlayer();
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    await this.deliverCombatPayloadWithMonsterStagger(ws, connectionId, session, result.payload);
  }

  /**
   * Entrega PvE em duas fases quando há contra-ataque inimigo — respiro assíncrono
   * entre dano do jogador e reação do monstro (Action Stagger).
   */
  private async deliverCombatPayloadWithMonsterStagger(
    ws: WebSocket,
    connectionId: string,
    session: CombatSession,
    payload: CombatDispatchPayload,
    forcedEndReason?: BattleEndReason,
    surrenderVoltPenalty?: number,
  ): Promise<void> {
    if (!shouldStaggerMonsterReaction(payload) || payload.state.phase === 'ENDED') {
      await this.deliverCombatPayload(ws, connectionId, session, payload, forcedEndReason, surrenderVoltPenalty);
      return;
    }

    const split = splitDispatchForMonsterStagger(payload);
    if (!split) {
      await this.deliverCombatPayload(ws, connectionId, session, payload, forcedEndReason, surrenderVoltPenalty);
      return;
    }

    await this.deliverCombatPayload(ws, connectionId, session, split.playerPhase);
    await combatReactionStaggerDelay();
    await this.deliverCombatPayload(
      ws,
      connectionId,
      session,
      split.monsterPhase,
      forcedEndReason,
      surrenderVoltPenalty,
    );
  }

  private async deliverCombatPayload(
    ws: WebSocket,
    connectionId: string,
    session: CombatSession,
    payload: CombatDispatchPayload,
    forcedEndReason?: BattleEndReason,
    surrenderVoltPenalty?: number,
  ): Promise<void> {
    const timerEnriched = this.combatTurnController.enrichPayloadWithTurnTimer(connectionId, session, payload);

    if (timerEnriched.state.phase !== 'ENDED') {
      this.sendCombatEvent(ws, timerEnriched);
      return;
    }

    const finalized = finalizeAuthoritativeBattleEnd(
      session,
      timerEnriched,
      forcedEndReason,
      surrenderVoltPenalty,
    );
    this.sendCombatEvent(ws, finalized.enriched);
    this.combatTurnController.clearTurnTimer(connectionId);

    const monsterInstanceId = session.getMonsterInstanceId();
    if (finalized.victory) {
      this.markPveMonsterDefeated(session);
    } else if (monsterInstanceId) {
      releasePveMonsterClaim(monsterInstanceId);
    }

    this.send(ws, { type: 'BATTLE_ENDED', payload: finalized.battleEnded });
    if (finalized.mayHaveLoot) {
      this.deferVictoryLootPackage(ws, connectionId, session, finalized.enriched);
    }
    // Progressão / marcos / death penalty / vitals — flush curto (mesmo debounce do economy).
    this.scheduleCharacterPersist(
      session.getPlayerActorId(),
      session.getCharacterId(),
    );
    this.cleanupBattleSession(connectionId, session);
  }

  /** Libera a sessão de combate; loot pendente permanece no economyGateway até coleta. */
  private cleanupBattleSession(connectionId: string, session: CombatSession): void {
    clearBattleSessionLease(session.getPlayerActorId(), session.getCharacterId());
    setPlayerInBattle(session.getPlayerActorId(), session.getCharacterId(), false);
    this.sessions.delete(connectionId);
  }

  private markPveMonsterDefeated(session: CombatSession): void {
    const monsterInstanceId = session.getMonsterInstanceId();
    if (!monsterInstanceId) return;

    scheduleWorldMonsterRespawn(monsterInstanceId);
    console.log('[WS] Monstro PVE derrotado — respawn agendado', {
      playerId: session.getPlayerActorId(),
      characterId: session.getCharacterId(),
      monsterInstanceId,
      respawnMs: CREATURE_RESPAWN_MS,
    });
  }

  touchBattleSessionActivity(connectionId: string): void {
    const session = this.sessions.get(connectionId);
    if (session) {
      touchBattleSessionLease(session.getPlayerActorId(), session.getCharacterId());
      return;
    }
    const rankedBattleId = this.rankedBattleByConnectionId.get(connectionId);
    const ranked = rankedBattleId
      ? this.rankedSessionsByBattleId.get(rankedBattleId)
      : undefined;
    if (!ranked) return;
    const peer = ranked.getPeerByConnection(connectionId);
    if (!peer) return;
    touchBattleSessionLease(peer.playerId, peer.characterId);
  }

  private expireStaleBattleSessionLeases(): void {
    const nowMs = Date.now();
    if (nowMs - this.lastBattleLeaseSweepMs < BATTLE_SESSION_LEASE_SWEEP_MS) return;
    this.lastBattleLeaseSweepMs = nowMs;

    for (const { lease, reason } of listExpiredBattleSessionLeases(nowMs)) {
      console.warn('[WS] Battle session lease expirado — liberando flag BATTLE', {
        reason,
        playerId: lease.playerId,
        characterId: lease.characterId,
        connectionId: lease.connectionId,
        idleMs: nowMs - lease.lastActivityMs,
        ageMs: nowMs - lease.startedAtMs,
      });

      const rankedBattleId = this.rankedBattleByConnectionId.get(lease.connectionId);
      const ranked = rankedBattleId
        ? this.rankedSessionsByBattleId.get(rankedBattleId)
        : undefined;
      if (ranked) {
        void this.handleRankedDisconnect(lease.connectionId);
        continue;
      }

      const session = this.sessions.get(lease.connectionId);
      if (session) {
        this.combatTurnController.clearTurnTimer(lease.connectionId);
        this.combatTurnController.clearChoiceWindow(lease.connectionId);
        this.cleanupBattleSession(lease.connectionId, session);
        const ws = this.socketsByConnectionId.get(lease.connectionId);
        if (ws) {
          this.send(ws, {
            type: 'combat-error',
            payload: { reason: 'BATTLE_SESSION_EXPIRED' },
          });
        }
      } else {
        clearBattleSessionLease(lease.playerId, lease.characterId);
        setPlayerInBattle(lease.playerId, lease.characterId, false);
      }
    }
  }

  private releaseOrphanBattleFlag(playerId: string, characterId: number): void {
    if (!isPlayerInBattle(playerId, characterId)) return;

    const lease = getBattleSessionLease(playerId, characterId);
    const hasLivePve = lease !== undefined && this.sessions.has(lease.connectionId);
    const hasLiveRanked = lease !== undefined
      && this.rankedBattleByConnectionId.has(lease.connectionId);
    if (hasLivePve || hasLiveRanked) return;

    console.warn('[WS] Flag BATTLE órfã liberada', { playerId, characterId });
    clearBattleSessionLease(playerId, characterId);
    setPlayerInBattle(playerId, characterId, false);
  }

  handlePlayerHonorGiven(
    ws: LiveSocket,
    connectionId: string,
    payload: import('../../shared/combat/playerHonorTypes.js').PlayerHonorGivenPayload,
  ): void {
    if (!this.requireVerifiedWorldSession(ws, connectionId)) return;

    const honorCount = grantPlayerHonor(payload.recipientActorId);
    this.send(ws, {
      type: 'player-honor-result',
      payload: {
        ok: true,
        battleId: payload.battleId,
        recipientActorId: payload.recipientActorId,
        honorCount,
      },
    });
  }

  handlePveEncounterAccept(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly monsterInstanceId: string;
      readonly activeMovesets?: readonly string[];
    },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;

    const accepted = acceptPveEncounter(
      world.playerId,
      world.characterId,
      payload.monsterInstanceId,
    );
    if (!accepted.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: accepted.reason } });
      return;
    }

    this.send(ws, {
      type: 'pve-encounter-clear',
      payload: { monsterInstanceId: accepted.monsterInstanceId, reason: 'accepted' },
    });

    // Espelha o loadout confirmado no join (mesma ordem da HUD) antes do bootstrap.
    this.handleJoin(
      ws,
      connectionId,
      {
        monsterInstanceId: accepted.monsterInstanceId,
        ...(payload.activeMovesets?.length
          ? { activeMovesets: payload.activeMovesets }
          : {}),
      },
      world.characterId,
      world.playerId,
    );
  }

  handlePveEncounterRequest(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly monsterInstanceId: string },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;

    const player = this.getPlayer(world.playerId, world.characterId);
    if (!player?.isExploring()) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'PLAYER_NOT_EXPLORING' } });
      return;
    }

    const profile = getWorldProfile(world.playerId, world.characterId);
    const result = requestPveEncounterOffer(
      {
        connectionId,
        playerId: world.playerId,
        characterId: world.characterId,
        mapId: profile.currentMapId,
        worldX: profile.lastPosition.x,
        worldY: profile.lastPosition.y,
      },
      payload.monsterInstanceId,
      Date.now(),
    );

    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }

    if (result.kind === 'force_battle') {
      this.handleJoin(
        ws,
        connectionId,
        { monsterInstanceId: result.monsterInstanceId },
        world.characterId,
        world.playerId,
      );
      return;
    }

    for (const message of result.outbound) {
      this.dispatchPveEncounterOutbound(message);
    }
  }

  handlePveEncounterFlee(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly monsterInstanceId: string },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;

    const result = tryFleePveEncounter(
      world.playerId,
      world.characterId,
      payload.monsterInstanceId,
      Date.now(),
    );
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }

    for (const message of result.outbound) {
      this.dispatchPveEncounterOutbound(message);
    }

    if (!result.fled) {
      this.handleJoin(
        ws,
        connectionId,
        { monsterInstanceId: payload.monsterInstanceId },
        world.characterId,
        world.playerId,
      );
    }
  }

  handlePvpRankedJoin(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly stationId: string;
      readonly displayName?: string;
      readonly skinBundleId?: string;
    },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;

    if (this.sessions.has(connectionId) || this.rankedBattleByConnectionId.has(connectionId)) {
      this.send(ws, { type: 'pvp-ranked-queue-error', payload: { reason: 'PLAYER_BUSY' } });
      return;
    }

    const progression = getAuthoritativeProgression(world.playerId, world.characterId);
    const skinRaw = payload.skinBundleId ?? progression.characterProfile.skinBundleId;
    const skinBundleId: PlayerSkinBundleId = isValidPlayerSkinBundleId(skinRaw ?? '')
      ? skinRaw as PlayerSkinBundleId
      : DEFAULT_PLAYER_SKIN_BUNDLE_ID;
    const displayName =
      payload.displayName?.trim()
      || progression.characterProfile.displayName?.trim()
      || world.displayName
      || 'Jogador';

    const queue = getPvpRankedQueueManager();
    queue.addViewer(connectionId);
    const result = queue.join(
      {
        connectionId,
        playerId: world.playerId,
        characterId: world.characterId,
        displayName,
        skinBundleId,
      },
      payload.stationId || PVP_RANKED_STATION_ID,
    );
    if (!result.ok) {
      this.send(ws, { type: 'pvp-ranked-queue-error', payload: { reason: result.reason } });
      this.send(ws, { type: 'pvp-ranked-queue-snapshot', payload: queue.getSnapshot() });
      return;
    }
    this.broadcastPvpRankedQueueSnapshot(result.snapshot);
  }

  handlePvpRankedLeave(
    ws: LiveSocket,
    connectionId: string,
    _payload: { readonly stationId: string },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;
    const queue = getPvpRankedQueueManager();
    const result = queue.leave(connectionId);
    if (!result.ok) {
      this.send(ws, { type: 'pvp-ranked-queue-error', payload: { reason: result.reason } });
      return;
    }
    this.broadcastPvpRankedQueueSnapshot(result.snapshot);
  }

  handlePvpRankedReady(
    ws: LiveSocket,
    connectionId: string,
    _payload: { readonly stationId: string },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;
    const result = getPvpRankedQueueManager().setReady(connectionId, true);
    if (!result.ok) {
      this.send(ws, { type: 'pvp-ranked-queue-error', payload: { reason: result.reason } });
      return;
    }
    this.broadcastPvpRankedQueueSnapshot(result.snapshot);
  }

  handlePvpRankedUnready(
    ws: LiveSocket,
    connectionId: string,
    _payload: { readonly stationId: string },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId);
    if (!world) return;
    const result = getPvpRankedQueueManager().setReady(connectionId, false);
    if (!result.ok) {
      this.send(ws, { type: 'pvp-ranked-queue-error', payload: { reason: result.reason } });
      return;
    }
    this.broadcastPvpRankedQueueSnapshot(result.snapshot);
  }

  private broadcastPvpRankedQueueSnapshot(snapshot: PvpRankedQueueSnapshot): void {
    const queue = getPvpRankedQueueManager();
    for (const connectionId of queue.listBroadcastConnectionIds()) {
      const peerWs = this.socketsByConnectionId.get(connectionId);
      if (!peerWs) continue;
      this.send(peerWs, { type: 'pvp-ranked-queue-snapshot', payload: snapshot });
    }
  }

  private async bootstrapRankedPvpMatch(match: PvpRankedMatchPair): Promise<void> {
    if (this.rankedMatchBootstrapInFlight) {
      console.warn('[WS] bootstrapRankedPvpMatch ignorado — já em andamento', {
        matchId: match.matchId,
      });
      this.failRankedMatchStart(match, 'MATCH_START_FAILED');
      return;
    }
    this.rankedMatchBootstrapInFlight = true;
    const queue = getPvpRankedQueueManager();
    try {
      const [memberA, memberB] = match.peers;
      for (const member of match.peers) {
        if (this.sessions.has(member.connectionId) || isPlayerInBattle(member.playerId, member.characterId)) {
          this.failRankedMatchStart(match, 'PLAYER_BUSY');
          return;
        }
      }

      await consumeChargedEquipmentBattleParticipation(memberA.playerId, memberA.characterId);
      await consumeChargedEquipmentBattleParticipation(memberB.playerId, memberB.characterId);

      const loadoutA = resolveAuthoritativeCombatLoadout(memberA.playerId, memberA.characterId);
      const loadoutB = resolveAuthoritativeCombatLoadout(memberB.playerId, memberB.characterId);
      const bootstrap = createPvpRankedBattleBootstrap(loadoutA, loadoutB, match.matchId);

      const session = new RankedPvpCombatSession(bootstrap.state, {
        matchId: match.matchId,
        firstActorId: bootstrap.firstActorId,
        ruleManifest: bootstrap.ruleManifest,
        peerA: {
          connectionId: memberA.connectionId,
          playerId: memberA.playerId,
          characterId: memberA.characterId,
          actorId: bootstrap.actorAId,
          loadout: loadoutA,
        },
        peerB: {
          connectionId: memberB.connectionId,
          playerId: memberB.playerId,
          characterId: memberB.characterId,
          actorId: bootstrap.actorBId,
          loadout: loadoutB,
        },
      });

      const battleId = session.getBattleId();
      this.rankedSessionsByBattleId.set(battleId, session);
      for (const peer of session.listPeers()) {
        this.rankedBattleByConnectionId.set(peer.connectionId, battleId);
        this.movementIntentHandler.clearConnection(peer.connectionId);
        setPlayerInBattle(peer.playerId, peer.characterId, true);
        this.gameState.setStatus(peer.connectionId, 'battle');
        registerBattleSessionLease(peer.connectionId, peer.playerId, peer.characterId);
        const peerWs = this.socketsByConnectionId.get(peer.connectionId);
        if (peerWs) this.socketsByPlayerId.set(peer.playerId, peerWs);
      }

      queue.markInBattle(match.matchId);
      const startPayloads = session.start();

      for (const peer of session.listPeers()) {
        const peerWs = this.socketsByConnectionId.get(peer.connectionId);
        if (!peerWs) continue;
        this.send(peerWs, {
          type: 'START_COMBAT',
          payload: {
            battleId,
            matchId: match.matchId,
            battleType: 'PVP',
          },
        });
        const payload = startPayloads.get(peer.connectionId);
        if (payload) {
          this.send(peerWs, { type: 'combat-event', payload });
        }
      }

      console.log('[WS] PVP rankeado iniciado', {
        matchId: match.matchId,
        battleId,
        a: memberA.playerId,
        b: memberB.playerId,
      });
    } catch (error) {
      console.error('[WS] bootstrapRankedPvpMatch falhou', { matchId: match.matchId, error });
      this.failRankedMatchStart(match, 'MATCH_START_FAILED');
    } finally {
      this.rankedMatchBootstrapInFlight = false;
    }
  }

  private failRankedMatchStart(
    match: PvpRankedMatchPair,
    reason: 'PLAYER_BUSY' | 'MATCH_START_FAILED',
  ): void {
    const queue = getPvpRankedQueueManager();
    queue.clearAfterBattle();
    for (const member of match.peers) {
      const peerWs = this.socketsByConnectionId.get(member.connectionId);
      if (!peerWs) continue;
      this.send(peerWs, { type: 'pvp-ranked-queue-error', payload: { reason } });
      this.send(peerWs, { type: 'pvp-ranked-queue-snapshot', payload: queue.getSnapshot() });
    }
  }

  private async routeRankedCombatAction(
    ws: LiveSocket,
    connectionId: string,
    payload: ActionRequest,
  ): Promise<void> {
    const battleId = this.rankedBattleByConnectionId.get(connectionId);
    const session = battleId ? this.rankedSessionsByBattleId.get(battleId) : undefined;
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    const result = await session.dispatchAction(connectionId, payload);
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    await this.deliverRankedCombatPayloads(session, result.payloads);
  }

  private async routeRankedCombatForfeit(
    ws: LiveSocket,
    connectionId: string,
    battleId: string,
  ): Promise<void> {
    const mapped = this.rankedBattleByConnectionId.get(connectionId);
    const session = mapped ? this.rankedSessionsByBattleId.get(mapped) : undefined;
    if (!session || session.getBattleId() !== battleId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_BATTLE' } });
      return;
    }
    const result = await session.forfeit(connectionId);
    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
      return;
    }
    await this.deliverRankedCombatPayloads(session, result.payloads, {
      forfeitingConnectionId: connectionId,
    });
  }

  private async handleRankedDisconnect(connectionId: string): Promise<void> {
    const battleId = this.rankedBattleByConnectionId.get(connectionId);
    if (!battleId) return;
    const session = this.rankedSessionsByBattleId.get(battleId);
    if (!session) {
      this.rankedBattleByConnectionId.delete(connectionId);
      return;
    }
    if (session.getState().phase === 'ENDED') {
      this.cleanupRankedBattle(session);
      return;
    }
    const result = await session.forfeit(connectionId);
    if (!result.ok) {
      this.cleanupRankedBattle(session);
      return;
    }
    await this.deliverRankedCombatPayloads(session, result.payloads, {
      forfeitingConnectionId: connectionId,
    });
  }

  private async deliverRankedCombatPayloads(
    session: RankedPvpCombatSession,
    payloads: ReadonlyMap<string, import('../../shared/combatWire.js').CombatDispatchPayload>,
    endOptions?: { readonly forfeitingConnectionId?: string },
  ): Promise<void> {
    const sample = payloads.values().next().value;
    if (!sample) return;

    if (sample.state.phase !== 'ENDED' && !endOptions?.forfeitingConnectionId) {
      for (const [connectionId, payload] of payloads) {
        const peerWs = this.socketsByConnectionId.get(connectionId);
        if (!peerWs) continue;
        this.send(peerWs, { type: 'combat-event', payload });
      }
      return;
    }

    const finalized = finalizeAuthoritativeRankedPvpEnd(session, payloads, endOptions);
    for (const peerResult of finalized.peers) {
      const peerWs = this.socketsByConnectionId.get(peerResult.peer.connectionId);
      if (peerWs) {
        this.send(peerWs, { type: 'combat-event', payload: peerResult.enriched });
        this.send(peerWs, { type: 'BATTLE_ENDED', payload: peerResult.battleEnded });
      }
      this.scheduleCharacterPersist(peerResult.peer.playerId, peerResult.peer.characterId);
    }
    this.cleanupRankedBattle(session);
  }

  private cleanupRankedBattle(session: RankedPvpCombatSession): void {
    const battleId = session.getBattleId();
    for (const peer of session.listPeers()) {
      this.rankedBattleByConnectionId.delete(peer.connectionId);
      clearBattleSessionLease(peer.playerId, peer.characterId);
      setPlayerInBattle(peer.playerId, peer.characterId, false);
      this.combatTurnController.clearTurnTimer(peer.connectionId);
      this.combatTurnController.clearChoiceWindow(peer.connectionId);
    }
    this.rankedSessionsByBattleId.delete(battleId);
    getPvpRankedQueueManager().clearAfterBattle();
  }

  private dispatchPveEncounterOutbound(message: PveEncounterOutbound): void {
    const ws = this.socketsByConnectionId.get(message.connectionKey);
    if (!ws) return;
    if (message.type === 'pve-encounter-offer') {
      this.send(ws, { type: 'pve-encounter-offer', payload: message.payload });
      return;
    }
    if (message.type === 'pve-encounter-clear') {
      this.send(ws, { type: 'pve-encounter-clear', payload: message.payload });
      return;
    }
    this.send(ws, { type: 'pve-encounter-flee-result', payload: message.payload });
  }

  /** Gera loot fora do hot path do combate — pacote chega em BATTLE_LOOT_PACKAGE. */
  private deferVictoryLootPackage(
    ws: WebSocket,
    connectionId: string,
    session: CombatSession,
    payload: CombatDispatchPayload,
  ): void {
    const playerActorId = session.getPlayerActorId();
    const characterId = session.getCharacterId();
    const battleId = payload.state.battleId;

    queueMicrotask(() => {
      try {
        const staged = this.stageVictoryLootForBattle(
          payload.state,
          playerActorId,
          characterId,
        );
        if (!staged) return;

        this.pendingCollectLootByConnection.set(connectionId, {
          battleId,
          lootId: staged.preview.lootId,
        });

        this.send(ws, {
          type: 'BATTLE_LOOT_PACKAGE',
          payload: {
            battleId,
            lootId: staged.preview.lootId,
            lootReveal: staged.lootReveal,
            lootPreview: staged.preview,
          },
        });
        void persistPendingLootSnapshot();
      } catch (error) {
        console.error('[WS] Falha ao gerar pacote de loot:', error);
      }
    });
  }

  private stageVictoryLootForBattle(
    state: import('../../shared/types.js').CombatState,
    playerActorId: string,
    characterId: number,
  ): StagedBattleLootResult | null {
    if (this.stagedLootBattleIds.has(state.battleId)) return null;
    if (!didPlayerWinBattle(state, playerActorId)) return null;

    const creatureId = resolveBattleCreatureId(state.combatants, playerActorId);
    if (!creatureId) return null;

    this.stagedLootBattleIds.add(state.battleId);
    return stageBattleLoot({
      sourceId: creatureId,
      winnerId: playerActorId,
      characterId,
      defeatedLevel: resolveDefeatedCreatureLevel(creatureId),
    });
  }

  async handleCollectLoot(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly lootId: string; readonly battleId: string },
  ): Promise<void> {
    const session = this.sessions.get(connectionId);
    const world = this.worldConnections.get(connectionId);
    const winnerId = session?.getPlayerActorId() ?? world?.playerId;
    const characterId = session?.getCharacterId() ?? world?.characterId;

    if (!winnerId || characterId === undefined) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }

    if (session) {
      const state = session.getState();
      if (payload.battleId !== state.battleId) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_BATTLE' } });
        return;
      }
    } else {
      const pending = this.pendingCollectLootByConnection.get(connectionId);
      if (pending && (pending.battleId !== payload.battleId || pending.lootId !== payload.lootId)) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_BATTLE' } });
        return;
      }
    }

    const result = await collectBattleLoot({
      lootId: payload.lootId,
      winnerId,
      characterId,
    });

    if (result.ok) {
      this.pendingCollectLootByConnection.delete(connectionId);
      this.scheduleCharacterPersist(winnerId, characterId);
      void persistPendingLootSnapshot();
    }

    this.send(ws, {
      type: 'loot-collect-result',
      payload: result.ok
        ? {
            ok: true,
            lootId: payload.lootId,
            battleId: payload.battleId,
            ...(result.discardedQuantity !== undefined && result.discardedQuantity > 0
              ? { partial: true, discardedQuantity: result.discardedQuantity }
              : {}),
          }
        : { ok: false, lootId: payload.lootId, battleId: payload.battleId, reason: result.message },
    });
  }

  private scheduleCharacterPersist(
    playerId: string,
    characterId: number,
    options?: { readonly skipSupabase?: boolean },
  ): void {
    touchCharacterPersistenceDirty(playerId, characterId, 'economy');

    const key = `${playerId}:${characterId}`;
    const existing = this.persistTimers.get(key);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      key,
      setTimeout(() => {
        this.persistTimers.delete(key);
        void (async () => {
          if (isDurablePersistence()) {
            await persistCharacterSession(playerId, characterId, { reason: 'economy' }).catch((error) => {
              console.error('[persistence] Falha ao salvar personagem (file):', error);
            });
          }

          if (options?.skipSupabase) return;

          const manager = getPersistenceManager();
          if (!manager?.isEnabled()) return;

          const scope = manager.resolveScope(
            playerId,
            characterId,
            getServerInstanceContext().id,
          );
          await manager.saveCritical(scope, buildCriticalCharacterDataFromRuntime(playerId, characterId));
        })();
      }, 400),
    );
  }

  private sendFullStateSync(ws: LiveSocket, playerId: string, characterId: number, force = false): void {
    const snapshot = buildAuthoritativeSnapshotForCharacter(playerId, characterId);
    const envelope = this.syncAuthority.nextEnvelope('full', force ? { force: true } : {});
    this.sendStateSync(ws, envelope, { mode: 'full', snapshot });
    this.send(ws, {
      type: 'full-state-sync',
      payload: snapshot,
    });
  }

  private sendStateSync(ws: LiveSocket, envelope: import('../../shared/sync/syncProtocol.js').SyncEnvelope, body: StateSyncBody): void {
    this.send(ws, {
      type: 'state-sync',
      payload: { ...envelope, body },
    });
  }

  /** Corrige cliente para a posição oficial do servidor (anti-teleporte / sync legado). */
  private sendForceWorldPosition(
    ws: LiveSocket,
    profile: {
      readonly currentMapId: string;
      readonly lastPosition: { readonly x: number; readonly y: number };
      readonly facing: PlayerFacing;
    },
  ): void {
    const envelope = this.syncAuthority.nextEnvelope('delta', { force: true });
    const creatures = isMapId(profile.currentMapId)
      ? buildServerScopedWorldCreaturesNearObserver(
        profile.currentMapId,
        profile.lastPosition.x,
        profile.lastPosition.y,
      )
      : [];

    this.sendStateSync(ws, envelope, {
      mode: 'tick',
      delta: {
        tick: this.syncAuthority.getCurrentTick(),
        serverTimeMs: envelope.serverTimeMs,
        gameTime: this.timeManager.getAnchor(envelope.serverTimeMs).gameTime,
        position: {
          mapId: profile.currentMapId,
          x: profile.lastPosition.x,
          y: profile.lastPosition.y,
          facing: profile.facing,
        },
        creatures,
      },
    });
  }

  private onWorldTick(): void {
    this.gameLoop.tick({
      movementIntentHandler: this.movementIntentHandler,
      syncAuthority: this.syncAuthority,
      timeManager: this.timeManager,
      gameState: this.gameState,
      getWorldSession: (connectionId) => {
        const world = this.worldConnections.get(connectionId);
        if (!world) return null;
        return {
          connectionId,
          playerId: world.playerId,
          characterId: world.characterId,
        };
      },
      getPlayer: (playerId, characterId) => this.getPlayer(playerId, characterId),
      sendStateSync: (connectionId, envelope, body) => {
        const ws = this.socketsByConnectionId.get(connectionId);
        if (!ws) return;
        this.sendStateSync(ws, envelope, body);
      },
      buildCreaturesNearObserver: (mapId, worldX, worldY) =>
        isMapId(mapId)
          ? buildServerScopedWorldCreaturesNearObserver(mapId, worldX, worldY)
          : [],
      onTickStart: () => {
        this.expireStaleBattleSessionLeases();
        sweepExpiredInventoryLocks();
        this.tickPveCreaturesAndEncounters();
      },
    });
  }

  private tickPveCreaturesAndEncounters(): void {
    const nowMs = Date.now();
    const probes = [];
    for (const [connectionId, world] of this.worldConnections) {
      const player = this.getPlayer(world.playerId, world.characterId);
      if (!player?.isExploring()) continue;
      const profile = getWorldProfile(world.playerId, world.characterId);
      probes.push({
        connectionId,
        playerId: world.playerId,
        characterId: world.characterId,
        mapId: profile.currentMapId,
        worldX: profile.lastPosition.x,
        worldY: profile.lastPosition.y,
      });
    }

    tickWorldMonsterRespawns(nowMs);
    tickCreatureWanderAi(nowMs, probes);
    const { outbound, forceBattles } = tickPveEncounterOffers(nowMs, probes);
    for (const message of outbound) {
      this.dispatchPveEncounterOutbound(message);
    }
    for (const force of forceBattles) {
      const ws = this.socketsByConnectionId.get(force.connectionId);
      if (!ws) continue;
      this.handleJoin(
        ws,
        force.connectionId,
        { monsterInstanceId: force.monsterInstanceId },
        force.characterId,
        force.playerId,
      );
    }
  }

  handleRequestFullState(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly characterId: number },
  ): void {
    const world = this.worldConnections.get(connectionId);
    if (!world || world.characterId !== payload.characterId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }
    this.sendFullStateSync(ws, world.playerId, world.characterId, true);
  }

  private requireVerifiedWorldSession(
    ws: LiveSocket,
    connectionId: string,
    options?: { readonly characterId?: number; readonly playerId?: string },
  ): WorldConnectionState | null {
    const world = this.worldConnections.get(connectionId);
    if (!world) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return null;
    }

    if (options?.characterId !== undefined && world.characterId !== options.characterId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_CHARACTER' } });
      return null;
    }

    if (options?.playerId !== undefined && world.playerId !== options.playerId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'AUTH_MISMATCH' } });
      return null;
    }

    return world;
  }

  private invalidateWorldConnection(connectionId: string, world: WorldConnectionState): void {
    const abandoned = abandonPveEncounterOnDisconnect(world.playerId, world.characterId);
    if (abandoned) {
      // Socket já vai morrer — não precisa enviar clear; claim já liberado + force-next marcado.
      void abandoned;
    }
    clearForceJoinInFlight(world.playerId, world.characterId);
    this.worldConnections.delete(connectionId);
    clearCreatureSyncConnection(connectionId);
    clearPlayerSessionFlags(world.playerId, world.characterId);
    clearIntentReplaySession(world.playerId, world.characterId);
    this.movementIntentHandler.clearConnection(connectionId);
  }

  /**
   * C.2 — revalida JWT + shard antes de canais WS de escrita (exceto player-intent).
   */
  private async ensureWorldWriteAuthorized(
    ws: LiveSocket,
    connectionId: string,
    world: WorldConnectionState,
    messageType: string,
  ): Promise<boolean> {
    const ctx = await revalidateWorldWriteAccess(
      this.serverEnv,
      {
        ws,
        sendCombatError: (code, _message) => {
          this.send(ws, { type: 'combat-error', payload: { reason: code } });
        },
        invalidateSession: () => this.invalidateWorldConnection(connectionId, world),
        logContext: {
          messageType,
          sessionPlayerId: world.playerId,
          sessionCharacterId: world.characterId,
          serverId: getServerInstanceContext().id,
        },
      },
      world,
    );
    return ctx !== null;
  }

  /**
   * Server-Authoritative — player-intent: JWT + serverId do payload + anti-replay.
   */
  private async ensurePlayerActionAuthorized(
    ws: LiveSocket,
    connectionId: string,
    world: WorldConnectionState,
    intent: Pick<ClientIntent, 'intentId' | 'correlationId' | 'type' | 'payload' | 'timestamp' | 'serverId'>,
  ): Promise<boolean> {
    const intentId = intent.correlationId ?? intent.intentId;
    const serverId = getServerInstanceContext().id;
    const validationContext = buildIntentValidationContext(connectionId, world, serverId, intent);

    const ctx = await SecurityGuard.enforceWs(
      this.serverEnv,
      {
        ws,
        sendSystemError: (code, message) => {
          logRejectedPlayerIntent(code, message, validationContext, {
            disconnect: code === 'AUTH_MISMATCH',
          });
          sendIntentFailure(
            (outbound) => this.send(ws, outbound),
            intentId,
            message,
            code,
          );
        },
        onViolatorDisconnect: () => {
          this.invalidateWorldConnection(connectionId, world);
        },
        logContext: {
          intentId,
          intentType: intent.type,
          intentPayload: validationContext.intentPayload,
          sessionPlayerId: world.playerId,
          sessionCharacterId: world.characterId,
          serverId,
        },
      },
      {
        accessToken: world.accessToken,
        claimedUserId: world.playerId,
        characterId: world.characterId,
        ...(intent.serverId ? { clientServerId: intent.serverId } : {}),
      },
    );

    return ctx !== null;
  }

  async handlePlayerIntent(
    ws: LiveSocket,
    connectionId: string,
    payload: ClientIntent,
  ): Promise<void> {
    const world = this.worldConnections.get(connectionId);
    if (!world) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }

    const intentId = payload.correlationId ?? payload.intentId;
    if (!intentId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_INTENT' } });
      return;
    }

    if (!(await this.ensurePlayerActionAuthorized(ws, connectionId, world, payload))) {
      return;
    }

    const { playerId, characterId } = world;
    const sendIntentWs: import('../network/intentOrchestrator.js').IntentWsSender = (message) => {
      this.send(ws, message);
    };

    const acceptance = acceptClientIntent(playerId, characterId, payload);
    if (!acceptance.ok) {
      logRejectedPlayerIntent(
        acceptance.code,
        acceptance.message,
        buildIntentValidationContext(
          connectionId,
          world,
          getServerInstanceContext().id,
          payload,
        ),
      );
      sendIntentFailure(sendIntentWs, intentId, acceptance.message, acceptance.code);
      return;
    }

    await getActionDispatcher().dispatch({
      connectionId,
      playerId,
      characterId,
      sendIntent: sendIntentWs,
      schedulePersist: () => this.scheduleCharacterPersist(playerId, characterId),
      movementIntentHandler: this.movementIntentHandler,
      getPlayer: (id, charId) => this.getPlayer(id, charId),
    }, payload);
  }

  async handleWorldLogin(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly serverId: string;
      readonly displayName?: string;
      readonly clientMapId?: string;
      readonly clientPosition?: { readonly x: number; readonly y: number };
      readonly accessToken?: string;
    },
  ): Promise<void> {
    try {
      const authGateway = getSessionAuthGateway();
      let authUserId = payload.playerId;
      let avisoMenor: string | undefined;

      if (authGateway.isAuthRequired()) {
        const token = payload.accessToken?.trim() ?? '';
        if (!token) {
          this.send(ws, { type: 'combat-error', payload: { reason: 'AUTH_REQUIRED' } });
          return;
        }

        const verified = await authGateway.verifyAccessToken(token);
        if (!verified) {
          this.send(ws, { type: 'combat-error', payload: { reason: 'AUTH_INVALID' } });
          return;
        }

        if (payload.playerId !== verified.userId) {
          console.warn('[WS] world-login: playerId não corresponde ao JWT', {
            connectionId,
            characterId: payload.characterId,
          });
          this.send(ws, { type: 'combat-error', payload: { reason: 'AUTH_MISMATCH' } });
          return;
        }

        authUserId = verified.userId;
        avisoMenor = buildAvisoMenor(verified.userMetadata) ?? undefined;
        if (avisoMenor) {
          const notice = resolveMinorAccountNotice(verified.userMetadata);
          console.log('[WS] world-login: aviso_menor preparado', {
            connectionId,
            characterId: payload.characterId,
            ageYears: notice?.ageYears ?? null,
            consentimentoResponsavel: notice?.consentimentoResponsavel ?? false,
          });
        }
      }

      let reportedServerId: string;
      try {
        reportedServerId = requireServerId(payload.serverId);
      } catch {
        this.send(ws, { type: 'combat-error', payload: { reason: 'WRONG_SERVER' } });
        return;
      }

      if (reportedServerId !== getServerInstanceContext().id) {
        console.warn('[WS] world-login: SERVER_ID do cliente não coincide com o deploy', {
          connectionId,
          reportedServerId,
          deployServerId: getServerInstanceContext().id,
        });
        this.send(ws, { type: 'combat-error', payload: { reason: 'WRONG_SERVER' } });
        return;
      }

      if (payload.clientMapId !== undefined || payload.clientPosition !== undefined) {
        console.log('[WS] world-login: posição do cliente descartada', {
          connectionId,
          clientMapId: payload.clientMapId ?? null,
        });
      }

      const loginRequest = {
        playerId: authUserId,
        characterId: payload.characterId,
        ...(payload.displayName !== undefined ? { displayName: payload.displayName } : {}),
        ...(payload.clientMapId !== undefined ? { clientMapId: payload.clientMapId } : {}),
        ...(payload.clientPosition !== undefined ? { clientPosition: payload.clientPosition } : {}),
      };

      const bootstrap = await ensureServerPlayerBootstrap(authUserId, payload.characterId);

      if (!bootstrap.profileReady) {
        this.send(ws, {
          type: 'combat-error',
          payload: { reason: 'PROFILE_NOT_READY' },
        });
        return;
      }

      const instanceBinding = await assertPlayerBoundToServerInstance(
        this.serverEnv,
        authUserId,
        payload.characterId,
        payload.serverId,
      );
      if (!instanceBinding.ok) {
        this.send(ws, {
          type: 'combat-error',
          payload: { reason: instanceBinding.code },
        });
        return;
      }

      const hadPersistedSave = await hydrateCharacterSession(authUserId, payload.characterId);
      reconcileAuthoritativeCharacterClassLink(authUserId, payload.characterId);
      // Save legado: trilha travada sem starter — repara antes do full-state-sync.
      repairTrailStarterIfNeeded(authUserId, payload.characterId);

      await persistAuthoritativeLoginSnapshot(
        this.serverEnv,
        resolveLoginSnapshotScope(authUserId, reportedServerId, payload.characterId),
      );

      if (payload.displayName?.trim()) {
        patchAuthoritativeProgression(authUserId, payload.characterId, {
          characterProfile: { displayName: payload.displayName.trim() },
        });
      }
      this.positionGateway.handleWorldLogin(loginRequest);
      normalizeProfileForServerInstance(authUserId, payload.characterId);
      const authoritativeProfile = getWorldProfile(authUserId, payload.characterId);
      // Garante seed/AI da zona atual (farm se login já no beco; cidade = no-op de monstros).
      if (isMapId(authoritativeProfile.currentMapId)) {
        getZoneLoadGateway().ensure(authoritativeProfile.currentMapId);
      }

      this.worldLoreLog.onPlayerLogin(authUserId, payload.characterId);

      getOrCreatePlayerSession(authUserId, payload.characterId).enterExploration();
      this.releaseOrphanBattleFlag(authUserId, payload.characterId);

      this.evictDuplicateWorldSession(authUserId, payload.characterId, connectionId);

      this.worldConnections.set(connectionId, {
        playerId: authUserId,
        characterId: payload.characterId,
        displayName: payload.displayName?.trim() || 'Jogador',
        authUserId,
        accessToken: authGateway.isAuthRequired() ? (payload.accessToken?.trim() ?? null) : null,
      });
      this.gameState.registerPlayer({
        connectionId,
        playerId: authUserId,
        characterId: payload.characterId,
        displayName: payload.displayName?.trim() || 'Jogador',
        profile: authoritativeProfile,
        status: 'exploring',
      });
      this.socketsByPlayerId.set(authUserId, ws);

      // Personagem sem save: perfil vazio (sem DEMO / VOLTS de teste).
      if (!hadPersistedSave && bootstrap.profileReady) {
        seedAuthoritativePlayerEconomyIfEmpty(authUserId, payload.characterId);
      }

      this.send(ws, {
        type: 'world-login-result',
        payload: {
          ok: true,
          currentMapId: authoritativeProfile.currentMapId,
          lastPosition: authoritativeProfile.lastPosition,
          facing: authoritativeProfile.facing,
          ...(avisoMenor ? { aviso_menor: avisoMenor } : {}),
        },
      });

      if (!hadPersistedSave) {
        await persistCharacterSession(authUserId, payload.characterId, {
          force: true,
          reason: 'login',
        });
      }

      this.sendFullStateSync(ws, authUserId, payload.characterId, true);
    } catch (error) {
      console.error('[WS] world-login falhou', {
        connectionId,
        characterId: payload.characterId,
        error,
      });
      this.send(ws, { type: 'combat-error', payload: { reason: 'WORLD_LOGIN_FAILED' } });
    }
  }

  handlePortalTransitionRequest(
    ws: LiveSocket,
    connectionId: string,
    payload: import('../../shared/world/zoneTransition.js').PortalTransitionRequestPayload,
  ): void {
    const world = this.worldConnections.get(connectionId);
    if (!world) {
      this.send(ws, {
        type: 'portal-transition-failed',
        payload: {
          requestId: payload.requestId,
          reason: 'Sessão de mundo não iniciada.',
          code: 'SERVER_ERROR',
        },
      });
      return;
    }

    if (world.characterId !== payload.characterId) {
      this.send(ws, {
        type: 'portal-transition-failed',
        payload: {
          requestId: payload.requestId,
          reason: 'Personagem inválido.',
          code: 'SERVER_ERROR',
        },
      });
      return;
    }

    const player = this.getPlayer(world.playerId, world.characterId);
    if (!player || !player.isExploring()) {
      this.send(ws, {
        type: 'portal-transition-failed',
        payload: {
          requestId: payload.requestId,
          reason: 'Personagem não está em exploração.',
          code: 'SERVER_ERROR',
        },
      });
      return;
    }

    const result = this.portalTransitionGateway.handleRequest(world.playerId, payload);
    if (!result.ok) {
      this.send(ws, { type: 'portal-transition-failed', payload: result.failed });
      return;
    }

    this.send(ws, { type: 'portal-transition-ready', payload: result.ready });
  }

  handleWorldChroniclesRequest(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly prioritizeAbsence?: boolean;
    },
  ): void {
    const world = this.requireVerifiedWorldSession(ws, connectionId, {
      playerId: payload.playerId,
      characterId: payload.characterId,
    });
    if (!world) return;

    const snapshot = this.worldLoreLog.getChronicles({
      playerId: world.playerId,
      characterId: world.characterId,
      ...(payload.prioritizeAbsence !== undefined
        ? { prioritizeAbsence: payload.prioritizeAbsence }
        : {}),
    });

    this.send(ws, {
      type: 'world-chronicles-result',
      payload: snapshot,
    });
  }

  handleChatGlobalSend(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly text: string;
    },
  ): void {
    const world = this.worldConnections.get(connectionId);
    if (!world) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_WORLD_SESSION' } });
      return;
    }

    if (world.playerId !== payload.playerId || world.characterId !== payload.characterId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_CHAT_SENDER' } });
      return;
    }

    const text = normalizeSpeechBubbleText(payload.text);
    if (!text) return;

    const moderation = validateGlobalChatOnServer(text);
    if (!moderation.ok) {
      this.send(ws, { type: 'chat-global-rejected', payload: { reason: moderation.reason } });
      return;
    }

    const profile = getWorldProfile(world.playerId, world.characterId);
    const chatPayload: ChatGlobalPayload = {
      origin: 'PLAYER',
      playerId: world.playerId,
      characterId: world.characterId,
      displayName: world.displayName,
      text,
      mapId: profile.currentMapId,
      x: profile.lastPosition.x,
      y: profile.lastPosition.y,
      sentAt: Date.now(),
    };

    broadcastChatGlobalPayload(chatPayload);
  }

  /** Chat global — todas as sessões de mundo (zonas diferentes incluídas). */
  private broadcastChatGlobal(payload: ChatGlobalPayload): void {
    for (const [connectionId, socket] of this.socketsByConnectionId) {
      if (!this.worldConnections.has(connectionId)) continue;
      this.send(socket, { type: 'chat-global', payload });
    }
  }

  handlePositionSync(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly characterId: number;
      readonly currentMapId: string;
      readonly lastPosition: { readonly x: number; readonly y: number };
      readonly facing?: string;
      readonly reason?: 'heartbeat' | 'logout' | 'battle';
    },
  ): void {
    const world = this.worldConnections.get(connectionId);
    if (!world || world.characterId !== payload.characterId) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_WORLD_SESSION' } });
      return;
    }

    const syncPayload = {
      characterId: payload.characterId,
      currentMapId: payload.currentMapId,
      lastPosition: payload.lastPosition,
      ...(payload.facing !== undefined ? { facing: payload.facing as PlayerFacing } : {}),
      ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
    };

    const result = this.positionGateway.handlePositionSync(world.playerId, syncPayload);
    if (!result) {
      return;
    }

    if (!result.ok || result.forceCorrection) {
      this.sendForceWorldPosition(ws, result.profile);
      if (!result.ok) return;
    }

    if (payload.reason === 'logout') {
      recordPlayerLastSeen(world.playerId, world.characterId);
      void this.persistenceScheduler.flushPlayer(world.playerId, world.characterId, 'logout');
    }
  }

  handleJoin(
    ws: LiveSocket,
    connectionId: string,
    joinPayload?: CombatJoinSessionSyncInput & { readonly monsterInstanceId?: string },
    characterId = 1,
    worldPlayerId?: string,
  ): void {
    void this.bootstrapJoinBattle(
      ws,
      connectionId,
      joinPayload,
      characterId,
      worldPlayerId,
    );
  }

  private authorizePveMonsterJoin(
    playerId: string,
    characterId: number,
    monsterInstanceId: string | undefined,
  ): PveMonsterJoinAuthorization {
    const monsterId = monsterInstanceId?.trim();
    if (!monsterId) {
      return { ok: false, reason: 'MISSING_MONSTER_INSTANCE' };
    }

    const monster = getMonsterRegistryEntry(monsterId);
    if (!monster) {
      return { ok: false, reason: 'MONSTER_NOT_ACTIVE' };
    }

    const profile = getWorldProfile(playerId, characterId);
    if (profile.currentMapId !== monster.mapId) {
      return { ok: false, reason: 'MONSTER_MAP_MISMATCH' };
    }

    const player = this.getPlayer(playerId, characterId);
    if (!player || !player.isExploring()) {
      return { ok: false, reason: 'PLAYER_NOT_EXPLORING' };
    }

    const playerTile = worldPixelToTile(profile.lastPosition.x, profile.lastPosition.y);
    const tileDistance = Math.max(
      Math.abs(playerTile.tileX - monster.tileX),
      Math.abs(playerTile.tileY - monster.tileY),
    );

    if (tileDistance > MAX_COMBAT_JOIN_TILE_DISTANCE) {
      return { ok: false, reason: 'MONSTER_TOO_FAR' };
    }

    if (!consumePveCombatGrant(playerId, characterId, monsterId, Date.now())) {
      return { ok: false, reason: 'ENCOUNTER_REQUIRED' };
    }

    return { ok: true, monster };
  }

  private async bootstrapJoinBattle(
    ws: LiveSocket,
    connectionId: string,
    joinPayload?: CombatJoinSessionSyncInput & { readonly monsterInstanceId?: string },
    characterId = 1,
    worldPlayerId?: string,
  ): Promise<void> {
    try {
      const playerId = worldPlayerId ?? `player_${connectionId.slice(0, 8)}`;
      const monsterAuthorization = this.authorizePveMonsterJoin(
        playerId,
        characterId,
        joinPayload?.monsterInstanceId,
      );
      if (!monsterAuthorization.ok) {
        clearForceJoinInFlight(playerId, characterId);
        console.warn('[WS] combat-join PVE rejeitado', {
          connectionId,
          playerId,
          characterId,
          monsterInstanceId: joinPayload?.monsterInstanceId ?? null,
          reason: monsterAuthorization.reason,
        });
        this.send(ws, { type: 'combat-error', payload: { reason: monsterAuthorization.reason } });
        return;
      }
      const monsterInstanceId = monsterAuthorization.monster.id;
      // Join autorizado — limpa obrigatório + in-flight do force-join.
      consumeForceBattleNextEncounter(playerId, characterId);
      clearForceJoinInFlight(playerId, characterId);

      await consumeChargedEquipmentBattleParticipation(playerId, characterId);

      if (joinPayload) {
        applyCombatJoinSessionSync(playerId, characterId, joinPayload);
      }

      const loadout = resolveAuthoritativeCombatLoadout(playerId, characterId);

      const bootstrap = createPveBattleBootstrap(loadout, monsterInstanceId);
      const session = new CombatSession(playerId, bootstrap.state, {
        characterId,
        ruleManifest: bootstrap.ruleManifest,
        loadout: bootstrap.loadout,
        monsterInstanceId,
      });
      this.sessions.set(connectionId, session);
      this.socketsByPlayerId.set(playerId, ws);
      this.movementIntentHandler.clearConnection(connectionId);
      setPlayerInBattle(playerId, characterId, true);
      this.gameState.setStatus(connectionId, 'battle');
      registerBattleSessionLease(connectionId, playerId, characterId);
      const payload = session.start();
      console.log('[WS] Batalha iniciada', {
        connectionId,
        playerId,
        battleId: payload.state.battleId,
        monsterInstanceId,
      });
      this.send(ws, {
        type: 'START_COMBAT',
        payload: { battleId: payload.state.battleId, monsterInstanceId },
      });
      void this.deliverCombatPayload(ws, connectionId, session, payload);
    } catch (error) {
      const playerId = worldPlayerId ?? `player_${connectionId.slice(0, 8)}`;
      clearForceJoinInFlight(playerId, characterId);
      console.error('[WS] bootstrapJoinBattle falhou', {
        connectionId,
        characterId,
        worldPlayerId: worldPlayerId ?? null,
        monsterInstanceId: joinPayload?.monsterInstanceId ?? null,
        error,
      });
      this.send(ws, { type: 'combat-error', payload: { reason: 'JOIN_BATTLE_FAILED' } });
    }
  }

  private sendCombatEvent(ws: WebSocket, payload: CombatDispatchPayload): void {
    this.send(ws, { type: 'combat-event', payload });
  }

  send(ws: WebSocket, message: WsOutboundMessage): void {
    if (ws.readyState !== ws.OPEN) return;
    try {
      ws.send(serializeWsOutbound(message));
    } catch (error) {
      console.warn('[WS] Falha ao enviar mensagem', error);
    }
  }

  /** Encerra sessão anterior do mesmo personagem (evita ghost connections em 100+ online). */
  private evictDuplicateWorldSession(
    playerId: string,
    characterId: number,
    keepConnectionId: string,
  ): void {
    const existing = this.gameState.getByPlayer(playerId, characterId);
    if (!existing || existing.connectionId === keepConnectionId) return;

    const staleWs = this.socketsByConnectionId.get(existing.connectionId);
    if (staleWs) {
      this.send(staleWs, { type: 'combat-error', payload: { reason: 'SESSION_REPLACED' } });
      staleWs.close();
    }
  }
}
