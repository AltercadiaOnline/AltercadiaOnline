import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import {
  collectBattleLoot,
  consumeChargedEquipmentBattleParticipation,
  debitBattleSurrenderPenalty,
  dismissBattleLoot,
  stageBattleLoot,
} from '../../Economy/economyGateway.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { isOriginAllowed } from '../config/cors.js';
import type { ActionRequest } from '../../shared/events.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { BattleType } from '../../shared/combat/battleType.js';
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
import { buildCombatFinishedEvent } from '../combat/buildCombatFinishedEvent.js';
import { persistWorldVitalsAfterCombat } from '../world/persistWorldVitalsAfterCombat.js';
import { applyAuthoritativeBattleProgression } from '../combat/applyAuthoritativeBattleProgression.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { buildCriticalCharacterDataFromRuntime } from '../supabase/buildCriticalCharacterData.js';
import { getInventoryPersistenceBridge } from '../supabase/inventoryPersistenceBridge.js';
import { getPersistenceManager } from '../supabase/persistenceManagerRegistry.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import { validateGlobalChatOnServer } from '../chat/globalChatModeratorServer.js';
import { WORLD_TICK_MS } from '../../shared/sync/syncProtocol.js';
import type { StateSyncBody } from '../../shared/sync/syncProtocol.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { buildServerScopedWorldCreaturesForMap, normalizeProfileForServerInstance } from '../instance/serverWorldScope.js';
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
} from '../persistence/PersistenceGateway.js';
import { patchAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
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

export class CombatWsHub implements CombatWsRouteHost {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<string, CombatSession>();
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
    console.log('[WS] CombatWsHub ativo — path=/ws (tick 20Hz)');
  }

  getPlayer(playerId: string, characterId: number): Player | null {
    return getOrCreatePlayerSession(playerId, characterId);
  }

  public close(): Promise<void> {
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
          void persistCharacterSession(worldState.playerId, worldState.characterId);
          void persistPendingLootSnapshot();
        }
        clearPlayerSessionFlags(worldState.playerId, worldState.characterId);
        clearIntentReplaySession(worldState.playerId, worldState.characterId);
      }
      this.worldConnections.delete(connectionId);
      this.movementIntentHandler.clearConnection(connectionId);
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
    const enriched = timerEnriched.state.phase === 'ENDED'
      ? (() => {
          const combatClassId = session.getCombatClassId();
          const progressionState = getAuthoritativeProgression(
            session.getPlayerActorId(),
            session.getCharacterId(),
          );
          const movesetMastery = ensureMovesetMasteryForClass(
            progressionState.progression.movesetMastery,
            combatClassId,
          );
          const finishedEvent = buildCombatFinishedEvent(
            timerEnriched.state,
            session.getPlayerActorId(),
            null,
            null,
            forcedEndReason,
            session.getMovesUsedInBattle(),
            {
              characterLevel: progressionState.characterProfile.level,
              movesetMastery,
            },
          );
          if (finishedEvent.payload.victory && finishedEvent.payload.progressionGrant) {
            applyAuthoritativeBattleProgression(
              session.getPlayerActorId(),
              session.getCharacterId(),
              finishedEvent.payload.progressionGrant,
              combatClassId,
            );
          }
          return {
            ...timerEnriched,
            events: [...timerEnriched.events, finishedEvent],
          };
        })()
      : timerEnriched;

    this.sendCombatEvent(ws, enriched);

    if (enriched.state.phase === 'ENDED') {
      this.combatTurnController.clearTurnTimer(connectionId);
      const playerActorId = session.getPlayerActorId();
      const playerCombatant = enriched.state.combatants[playerActorId];
      if (playerCombatant) {
        persistWorldVitalsAfterCombat(
          session.getPlayerActorId(),
          session.getCharacterId(),
          playerCombatant,
        );
      }
      const victory = didPlayerWinBattle(enriched.state, playerActorId);
      const mayHaveLoot = victory && Boolean(resolveBattleCreatureId(
        enriched.state.combatants,
        session.getPlayerActorId(),
      ));
      this.sendBattleEnded(ws, session, enriched, mayHaveLoot, forcedEndReason, surrenderVoltPenalty);
      if (mayHaveLoot) {
        this.deferVictoryLootPackage(ws, connectionId, session, enriched);
      }
      this.cleanupBattleSession(connectionId, session);
    }
  }

  /** Libera a sessão de combate; loot pendente permanece no economyGateway até coleta. */
  private cleanupBattleSession(connectionId: string, session: CombatSession): void {
    clearBattleSessionLease(session.getPlayerActorId(), session.getCharacterId());
    setPlayerInBattle(session.getPlayerActorId(), session.getCharacterId(), false);
    this.sessions.delete(connectionId);
  }

  touchBattleSessionActivity(connectionId: string): void {
    const session = this.sessions.get(connectionId);
    if (!session) return;
    touchBattleSessionLease(session.getPlayerActorId(), session.getCharacterId());
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
    const hasLiveSession = lease !== undefined && this.sessions.has(lease.connectionId);
    if (hasLiveSession) return;

    console.warn('[WS] Flag BATTLE órfã liberada', { playerId, characterId });
    clearBattleSessionLease(playerId, characterId);
    setPlayerInBattle(playerId, characterId, false);
  }

  private sendBattleEnded(
    ws: WebSocket,
    session: CombatSession,
    payload: CombatDispatchPayload,
    mayHaveLoot: boolean,
    forcedEndReason?: BattleEndReason,
    surrenderVoltPenalty?: number,
  ): void {
    const victory = didPlayerWinBattle(payload.state, session.getPlayerActorId());
    const endReason: BattleEndReason = forcedEndReason ?? (victory ? 'VICTORY' : 'DEFEAT');
    const finished = payload.events.find((e) => e.type === 'COMBAT_FINISHED');
    const xpGain = finished?.type === 'COMBAT_FINISHED' ? finished.payload.xpGain : 0;
    const finishedPayload = finished?.type === 'COMBAT_FINISHED' ? finished.payload : null;
    this.send(ws, {
      type: 'BATTLE_ENDED',
      payload: {
        battleId: payload.state.battleId,
        victory,
        monsterInstanceId: session.getMonsterInstanceId() ?? '',
        lootGranted: false,
        hasLoot: victory && mayHaveLoot,
        endReason,
        xpGain,
        battleType: payload.state.battleType ?? finishedPayload?.battleType ?? BattleType.PVE,
        ...(finishedPayload?.rankingResult !== undefined
          ? { rankingResult: finishedPayload.rankingResult }
          : {}),
        ...(endReason === 'FORFEIT' && surrenderVoltPenalty !== undefined && surrenderVoltPenalty > 0
          ? { surrenderVoltPenalty }
          : {}),
      },
    });
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
    const key = `${playerId}:${characterId}`;
    const existing = this.persistTimers.get(key);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      key,
      setTimeout(() => {
        this.persistTimers.delete(key);
        void (async () => {
          if (isDurablePersistence()) {
            await persistCharacterSession(playerId, characterId).catch((error) => {
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
      ? buildServerScopedWorldCreaturesForMap(profile.currentMapId)
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
      broadcastHub: this.broadcastHub,
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
      buildCreaturesForMap: (mapId) =>
        isMapId(mapId) ? buildServerScopedWorldCreaturesForMap(mapId) : [],
      onTickStart: () => this.expireStaleBattleSessionLeases(),
    });
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
    this.worldConnections.delete(connectionId);
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

      this.worldLoreLog.onPlayerLogin(authUserId, payload.characterId);

      getOrCreatePlayerSession(authUserId, payload.characterId).enterExploration();
      this.releaseOrphanBattleFlag(authUserId, payload.characterId);

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
        await persistCharacterSession(authUserId, payload.characterId);
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

    this.broadcastChatGlobal(chatPayload);
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

  private async bootstrapJoinBattle(
    ws: LiveSocket,
    connectionId: string,
    joinPayload?: CombatJoinSessionSyncInput & { readonly monsterInstanceId?: string },
    characterId = 1,
    worldPlayerId?: string,
  ): Promise<void> {
    try {
      const playerId = worldPlayerId ?? `player_${connectionId.slice(0, 8)}`;
      seedAuthoritativePlayerEconomyIfEmpty(playerId, characterId, { dollarVolt: 500, alterCoins: 25 });

      await consumeChargedEquipmentBattleParticipation(playerId, characterId);

      if (joinPayload) {
        applyCombatJoinSessionSync(playerId, characterId, joinPayload);
      }

      const loadout = resolveAuthoritativeCombatLoadout(playerId, characterId);

      const bootstrap = createPveBattleBootstrap(loadout, joinPayload?.monsterInstanceId);
      const session = new CombatSession(playerId, bootstrap.state, {
        characterId,
        ruleManifest: bootstrap.ruleManifest,
        loadout: bootstrap.loadout,
        ...(joinPayload?.monsterInstanceId !== undefined ? { monsterInstanceId: joinPayload.monsterInstanceId } : {}),
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
        monsterInstanceId: joinPayload?.monsterInstanceId ?? null,
      });
      this.send(ws, { type: 'START_COMBAT', payload: { battleId: payload.state.battleId } });
      void this.deliverCombatPayload(ws, connectionId, session, payload);
    } catch (error) {
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
    if (ws.readyState === ws.OPEN) {
      ws.send(serializeWsOutbound(message));
    }
  }
}
