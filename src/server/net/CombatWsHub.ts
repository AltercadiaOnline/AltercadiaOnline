import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import {
  activateBook,
  collectBattleLoot,
  consumeChargedEquipmentBattleParticipation,
  debitBattleSurrenderPenalty,
  depositBankCurrency,
  depositBankItem,
  dismissBattleLoot,
  exchangeAlterCoinsForVolts,
  stageBattleLoot,
  withdrawBankCurrency,
  withdrawBankItem,
} from '../../Economy/economyGateway.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import { seedAuthoritativePlayerEconomyIfEmpty } from '../economy/seedAuthoritativePlayerEconomy.js';
import { isOriginAllowed } from '../config/cors.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { buildCombatUiHints, withTurnTimerConfig } from '../../shared/combatWire.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { BATTLE_TURN_TIMER_SEC } from '../../shared/combat/battleScreenConstants.js';
import { BATTLE_SESSION_LEASE_SWEEP_MS } from '../../shared/combat/battleSessionLeaseConstants.js';
import { combatReactionStaggerDelay } from '../../shared/combat/combatReactionDelay.js';
import {
  shouldStaggerMonsterReaction,
  splitDispatchForMonsterStagger,
} from '../../shared/combat/combatDispatchStagger.js';
import { estimateCombatPlaybackMs } from '../../shared/combat/combatPlaybackBudget.js';
import {
  matchesCombatChoiceWindow,
  resolveCombatChoiceWindowKey,
  type CombatChoiceWindowKey,
} from '../../shared/combat/playerTurnChoice.js';
import type { EconomyEvent } from '../../shared/economy/events.js';
import { EconomyEventType } from '../../shared/economy/events.js';
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
import { grantPlayerHonor } from '../combat/playerHonorStore.js';
import { resolveAuthoritativeCombatLoadout } from '../persistence/authoritativeCombatLoadout.js';
import { MovementIntentHandler } from '../handlers/world/MovementIntentHandler.js';
import { getTimeManager } from '../TimeManager.js';
import { sendIntentFailure } from '../network/intentOrchestrator.js';
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
import { applyAuthoritativeBattleProgression } from '../combat/applyAuthoritativeBattleProgression.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';
import { normalizeSpeechBubbleText } from '../../shared/world/speechBubbleText.js';
import { validateGlobalChatOnServer } from '../chat/globalChatModeratorServer.js';
import { getRefractionBoothService } from '../city/RefractionBoothService.js';
import { validateBankNpcAccess } from '../../shared/bank/bankAccessPolicy.js';
import { validateBankCurrencyRequest } from '../../shared/bank/bankCurrencyRules.js';
import { WORLD_TICK_MS } from '../../shared/sync/syncProtocol.js';
import type { StateSyncBody } from '../../shared/sync/syncProtocol.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import { buildWorldCreaturesForMap } from '../../shared/world/worldCreatureSync.js';
import { ServerSyncAuthority } from '../sync/ServerSyncAuthority.js';
import { WorldTickScheduler } from '../world/WorldTickScheduler.js';
import {
  buildAuthoritativeSnapshotForCharacter,
  hydrateCharacterSession,
  isFilePersistenceEnabled,
  persistCharacterSession,
  persistPendingLootSnapshot,
} from '../persistence/PersistenceGateway.js';
import { patchAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';

type LiveSocket = WebSocket & { readonly sessionId?: string };

type WorldConnectionState = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly authUserId: string;
  /** JWT Supabase — revalidado antes de cada player-intent (memória, nunca logado). */
  readonly accessToken: string | null;
};

const WORLD_AUTH_REQUIRED_MESSAGES = new Set<string>([
  'request-full-state',
  'player-intent',
  'position-sync',
  'portal-transition-request',
  'chat-global-send',
  'activate-book',
  'economy-exchange-alter',
  'economy-bank-transaction',
  'refraction-booth-quote',
  'refraction-booth-start',
  'refraction-booth-complete',
  'world-chronicles-request',
  'combat-join',
  'combat-action',
  'combat-forfeit',
  'combat-collect-loot',
  'combat-confirm-loot',
  'combat-dismiss-loot',
  'player-honor-given',
]);

export type CombatWsHubOptions = {
  readonly corsOrigins: readonly string[];
};

export class CombatWsHub {
  private readonly wss: WebSocketServer;
  private readonly sessions = new Map<string, CombatSession>();
  private readonly socketsByPlayerId = new Map<string, WebSocket>();
  private readonly socketsByConnectionId = new Map<string, WebSocket>();
  private readonly turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly choiceWindows = new Map<string, CombatChoiceWindowKey & {
    readonly deadlineMs: number;
    readonly playbackGraceMs: number;
  }>();
  private readonly stagedLootBattleIds = new Set<string>();
  private readonly pendingCollectLootByConnection = new Map<string, { readonly battleId: string; readonly lootId: string }>();
  private readonly persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly corsOrigins: readonly string[];
  private readonly worldConnections = new Map<string, WorldConnectionState>();
  private readonly positionGateway: PositionGateway;
  private readonly movementIntentHandler = new MovementIntentHandler();
  private readonly portalTransitionGateway = new PortalTransitionGateway();
  private readonly worldLoreLog = getWorldLoreLog();
  private readonly syncAuthority = new ServerSyncAuthority();
  private readonly timeManager = getTimeManager();
  private readonly worldTickScheduler = new WorldTickScheduler(WORLD_TICK_MS, () => {
    this.onWorldTick();
  });
  private lastBattleLeaseSweepMs = 0;

  constructor(server: import('node:http').Server, options: CombatWsHubOptions) {
    this.positionGateway = new PositionGateway(this);
    this.corsOrigins = options.corsOrigins;
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
    this.bindEconomyEventForwarding();
    this.worldTickScheduler.start();
    console.log('[WS] CombatWsHub ativo — path=/ws');
  }

  getPlayer(playerId: string, characterId: number): Player | null {
    return getOrCreatePlayerSession(playerId, characterId);
  }

  public close(): Promise<void> {
    this.worldTickScheduler.stop();
    for (const client of this.wss.clients) {
      client.close(1001, 'server_shutdown');
    }
    for (const timer of this.turnTimers.values()) {
      clearTimeout(timer);
    }
    this.turnTimers.clear();
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
      this.clearTurnTimer(connectionId);
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
        if (isFilePersistenceEnabled()) {
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

    if (message.type === 'combat-join') {
      const world = this.worldConnections.get(connectionId);
      this.handleJoin(
        ws,
        connectionId,
        message.payload?.monsterInstanceId,
        world?.characterId ?? 1,
        world?.playerId,
      );
      return;
    }

    if (message.type === 'world-login') {
      await this.handleWorldLogin(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'request-full-state') {
      this.handleRequestFullState(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'player-intent') {
      await this.handlePlayerIntent(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'world-chronicles-request') {
      this.handleWorldChroniclesRequest(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'position-sync') {
      this.handlePositionSync(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'portal-transition-request') {
      this.handlePortalTransitionRequest(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'chat-global-send') {
      this.handleChatGlobalSend(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'activate-book') {
      await this.handleActivateBook(ws, connectionId, message.payload.bookId);
      return;
    }

    if (message.type === 'economy-exchange-alter') {
      await this.handleExchangeAlter(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'economy-bank-transaction') {
      await this.handleBankTransaction(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'refraction-booth-quote') {
      this.handleRefractionBoothQuote(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'refraction-booth-start') {
      await this.handleRefractionBoothStart(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'refraction-booth-complete') {
      await this.handleRefractionBoothComplete(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'player-honor-given') {
      this.handlePlayerHonorGiven(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'combat-forfeit') {
      const session = this.sessions.get(connectionId);
      if (!session) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
        return;
      }
      const state = session.getState();
      if (message.payload.battleId !== state.battleId) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'INVALID_BATTLE' } });
        return;
      }
      this.clearTurnTimer(connectionId);
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
      return;
    }

    if (message.type === 'combat-collect-loot' || message.type === 'combat-confirm-loot') {
      await this.handleCollectLoot(ws, connectionId, message.payload);
      return;
    }

    if (message.type === 'combat-dismiss-loot') {
      dismissBattleLoot(message.payload.lootId);
      void persistPendingLootSnapshot();
      return;
    }

    if (message.type === 'combat-action') {
      const session = this.sessions.get(connectionId);
      if (!session) {
        this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
        return;
      }
      const gate = this.validateTurnChoiceWindow(connectionId, session, message.payload);
      if (!gate.ok) {
        this.send(ws, { type: 'combat-error', payload: { reason: gate.reason } });
        return;
      }
      this.clearTurnTimer(connectionId);
      this.choiceWindows.delete(connectionId);
      const result = await session.dispatchPlayerAction(message.payload);
      if (!result.ok) {
        this.send(ws, { type: 'combat-error', payload: { reason: result.reason } });
        return;
      }
      await this.deliverCombatPayloadWithMonsterStagger(ws, connectionId, session, result.payload);
    }
  }

  private bindEconomyEventForwarding(): void {
    const forward = (event: EconomyEvent) => {
      const playerId = 'playerId' in event.payload ? event.payload.playerId : null;
      if (!playerId) return;
      const ws = this.socketsByPlayerId.get(playerId);
      if (ws) {
        this.sendStateSync(ws, this.syncAuthority.nextEnvelope('delta'), { mode: 'economy', event });
        this.send(ws, { type: 'economy-event', payload: event });
      }
      this.schedulePersistFromEconomyEvent(playerId, event);
    };

    globalEventBus.on(EconomyEventType.LootGranted, forward);
    globalEventBus.on(EconomyEventType.WalletUpdated, forward);
    globalEventBus.on(EconomyEventType.AlterExchangeCompleted, forward);
    globalEventBus.on(EconomyEventType.InventoryUpdated, forward);
    globalEventBus.on(EconomyEventType.UpdateBankSuccess, forward);
    globalEventBus.on(EconomyEventType.WorldVitalsUpdated, forward);
    globalEventBus.on(EconomyEventType.PetAffinityUpdated, forward);
    globalEventBus.on(EconomyEventType.PetRosterUpdated, forward);
    globalEventBus.on(EconomyEventType.TransactionFailed, forward);
  }

  private enrichPayloadWithTurnTimer(
    connectionId: string,
    session: CombatSession,
    payload: CombatDispatchPayload,
  ): CombatDispatchPayload {
    const playerActorId = session.getPlayerActorId();
    const hints = buildCombatUiHints(payload.state, playerActorId);
    if (!hints.actionsEnabled) {
      this.clearTurnTimer(connectionId);
      this.choiceWindows.delete(connectionId);
      return { ...payload, ui: hints };
    }

    const windowKey = resolveCombatChoiceWindowKey(payload.state, playerActorId);
    if (!windowKey) {
      this.clearTurnTimer(connectionId);
      this.choiceWindows.delete(connectionId);
      return { ...payload, ui: hints };
    }

    const existingWindow = this.choiceWindows.get(connectionId);
    if (
      existingWindow
      && existingWindow.turn === windowKey.turn
      && existingWindow.allianceSlot === windowKey.allianceSlot
      && Date.now() < existingWindow.deadlineMs
    ) {
      return {
        ...payload,
        ui: withTurnTimerConfig(hints, {
          turnDeadlineMs: existingWindow.deadlineMs,
          turnPlaybackGraceMs: existingWindow.playbackGraceMs,
          turnChoiceBudgetMs: BATTLE_TURN_TIMER_SEC * 1000,
        }),
      };
    }

    const playbackGraceMs = estimateCombatPlaybackMs(payload.events, playerActorId);
    const choiceBudgetMs = BATTLE_TURN_TIMER_SEC * 1000;
    const turnDeadlineMs = Date.now() + playbackGraceMs + choiceBudgetMs;

    this.choiceWindows.set(connectionId, {
      ...windowKey,
      deadlineMs: turnDeadlineMs,
      playbackGraceMs,
    });
    this.scheduleTurnTimer(connectionId, session, playbackGraceMs + choiceBudgetMs);

    return {
      ...payload,
      ui: withTurnTimerConfig(hints, {
        turnDeadlineMs,
        turnPlaybackGraceMs: playbackGraceMs,
        turnChoiceBudgetMs: choiceBudgetMs,
      }),
    };
  }

  private validateTurnChoiceWindow(
    connectionId: string,
    session: CombatSession,
    action: import('../../shared/events.js').ActionRequest,
  ): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
    const window = this.choiceWindows.get(connectionId);
    if (!window) {
      return { ok: false, reason: 'TURN_CHOICE_NOT_OPEN' };
    }
    if (Date.now() > window.deadlineMs) {
      return { ok: false, reason: 'TURN_CHOICE_EXPIRED' };
    }
    if (action.actorId !== session.getPlayerActorId()) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (!matchesCombatChoiceWindow(action.turn, window)) {
      return { ok: false, reason: 'STALE_TURN' };
    }
    const liveKey = resolveCombatChoiceWindowKey(session.getState(), session.getPlayerActorId());
    if (!liveKey || liveKey.turn !== window.turn || liveKey.allianceSlot !== window.allianceSlot) {
      return { ok: false, reason: 'TURN_CHOICE_NOT_OPEN' };
    }
    return { ok: true };
  }

  private scheduleTurnTimer(
    connectionId: string,
    session: CombatSession,
    durationMs: number,
  ): void {
    this.clearTurnTimer(connectionId);
    const ws = this.socketsByConnectionId.get(connectionId);
    if (!ws) return;

    const timer = setTimeout(() => {
      void this.onTurnTimerExpired(connectionId, session, ws);
    }, durationMs);
    this.turnTimers.set(connectionId, timer);
  }

  private clearTurnTimer(connectionId: string): void {
    const timer = this.turnTimers.get(connectionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.turnTimers.delete(connectionId);
    }
  }

  private async onTurnTimerExpired(
    connectionId: string,
    session: CombatSession,
    ws: WebSocket,
  ): Promise<void> {
    this.turnTimers.delete(connectionId);
    this.choiceWindows.delete(connectionId);
    const state = session.getState();
    const playerActorId = session.getPlayerActorId();
    const windowKey = resolveCombatChoiceWindowKey(state, playerActorId);
    if (!windowKey) {
      return;
    }

    const result = await session.dispatchPlayerAction({
      battleId: state.battleId,
      actorId: session.getPlayerActorId(),
      turn: state.turn,
      skillId: null,
      requestId: `timeout-${Date.now()}`,
    });
    if (!result.ok) return;
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
    const timerEnriched = this.enrichPayloadWithTurnTimer(connectionId, session, payload);
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
      this.clearTurnTimer(connectionId);
      const victory = didPlayerWinBattle(enriched.state, session.getPlayerActorId());
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

  private touchBattleSessionActivity(connectionId: string): void {
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
        this.clearTurnTimer(lease.connectionId);
        this.choiceWindows.delete(lease.connectionId);
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

  private handlePlayerHonorGiven(
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

  private async handleCollectLoot(
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

  private scheduleCharacterPersist(playerId: string, characterId: number): void {
    if (!isFilePersistenceEnabled()) return;
    const key = `${playerId}:${characterId}`;
    const existing = this.persistTimers.get(key);
    if (existing) clearTimeout(existing);
    this.persistTimers.set(
      key,
      setTimeout(() => {
        this.persistTimers.delete(key);
        void persistCharacterSession(playerId, characterId).catch((error) => {
          console.error('[persistence] Falha ao salvar personagem:', error);
        });
      }, 400),
    );
  }

  private schedulePersistFromEconomyEvent(playerId: string, event: EconomyEvent): void {
    if (!isFilePersistenceEnabled()) return;
    let characterId: number | undefined;
    if ('characterId' in event.payload && typeof event.payload.characterId === 'number') {
      characterId = event.payload.characterId;
    } else {
      for (const world of this.worldConnections.values()) {
        if (world.playerId === playerId) {
          characterId = world.characterId;
          break;
        }
      }
    }
    if (characterId !== undefined) {
      this.scheduleCharacterPersist(playerId, characterId);
    }
    if (event.type === EconomyEventType.LootGranted) {
      void persistPendingLootSnapshot();
    }
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
      ? buildWorldCreaturesForMap(profile.currentMapId)
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
    this.expireStaleBattleSessionLeases();

    const tick = this.syncAuthority.advanceTick();
    const envelope = this.syncAuthority.nextEnvelope('delta');
    const timeAnchor = this.timeManager.advance(WORLD_TICK_MS, envelope.serverTimeMs);
    const deltaBase = {
      tick,
      serverTimeMs: envelope.serverTimeMs,
      gameTime: timeAnchor.gameTime,
    };

    for (const [connectionId, ws] of this.socketsByConnectionId) {
      const world = this.worldConnections.get(connectionId);
      if (!world) continue;

      const player = this.getPlayer(world.playerId, world.characterId);
      if (!player || !player.isExploring()) {
        this.sendStateSync(ws, envelope, { mode: 'tick', delta: deltaBase });
        continue;
      }

      const moveResult = this.movementIntentHandler.processNext(
        connectionId,
        world.playerId,
        world.characterId,
      );

      const profile = moveResult
        ? (moveResult.ok ? moveResult.profile : getWorldProfile(world.playerId, world.characterId))
        : getWorldProfile(world.playerId, world.characterId);

      const position: import('../../shared/world/movementIntent.js').AuthoritativePositionDelta = {
        mapId: profile.currentMapId,
        x: profile.lastPosition.x,
        y: profile.lastPosition.y,
        facing: profile.facing,
        ...(moveResult ? { moveSeq: moveResult.seq } : {}),
      };

      const creatures = isMapId(profile.currentMapId)
        ? buildWorldCreaturesForMap(profile.currentMapId)
        : [];

      this.sendStateSync(ws, envelope, {
        mode: 'tick',
        delta: {
          ...deltaBase,
          position,
          creatures,
        },
      });
    }
  }

  private handleRequestFullState(
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

  private async ensureConnectionJwtValid(
    ws: LiveSocket,
    world: WorldConnectionState,
    intentId: string,
  ): Promise<boolean> {
    const authGateway = getSessionAuthGateway();
    if (!authGateway.isAuthRequired()) return true;

    const token = world.accessToken?.trim() ?? '';
    if (!token) {
      sendIntentFailure(
        (message) => this.send(ws, message),
        intentId,
        'Sessão não autenticada.',
        'AUTH_REQUIRED',
      );
      return false;
    }

    const verified = await authGateway.verifyAccessToken(token);
    if (!verified || verified.userId !== world.playerId) {
      sendIntentFailure(
        (message) => this.send(ws, message),
        intentId,
        'Token inválido ou expirado.',
        'AUTH_INVALID',
      );
      return false;
    }

    return true;
  }

  private async handlePlayerIntent(
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

    if (!(await this.ensureConnectionJwtValid(ws, world, intentId))) {
      return;
    }

    const { playerId, characterId } = world;
    const sendIntentWs: import('../network/intentOrchestrator.js').IntentWsSender = (message) => {
      this.send(ws, message);
    };

    const acceptance = acceptClientIntent(playerId, characterId, payload);
    if (!acceptance.ok) {
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

  private async handleWorldLogin(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly displayName?: string;
      readonly clientMapId?: string;
      readonly clientPosition?: { readonly x: number; readonly y: number };
      readonly accessToken?: string;
    },
  ): Promise<void> {
    try {
      const authGateway = getSessionAuthGateway();
      let authUserId = payload.playerId;

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

      const hadPersistedSave = await hydrateCharacterSession(authUserId, payload.characterId);
      const bootstrap = await ensureServerPlayerBootstrap(authUserId, payload.characterId);

      if (bootstrap.supabaseConfigured && !bootstrap.profileReady) {
        this.send(ws, {
          type: 'combat-error',
          payload: { reason: 'PROFILE_NOT_READY' },
        });
        return;
      }

      if (payload.displayName?.trim()) {
        patchAuthoritativeProgression(authUserId, payload.characterId, {
          characterProfile: { displayName: payload.displayName.trim() },
        });
      }
      const result = this.positionGateway.handleWorldLogin(loginRequest);

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
      this.socketsByPlayerId.set(authUserId, ws);

      if (!hadPersistedSave && bootstrap.profileReady) {
        seedAuthoritativePlayerEconomyIfEmpty(authUserId, payload.characterId);
      }

      this.send(ws, {
        type: 'world-login-result',
        payload: {
          ok: true,
          currentMapId: result.currentMapId,
          lastPosition: result.lastPosition,
          facing: result.facing,
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

  private handlePortalTransitionRequest(
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

  private handleWorldChroniclesRequest(
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

  private handleChatGlobalSend(
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

  private handlePositionSync(
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
      this.scheduleCharacterPersist(world.playerId, world.characterId);
    }
  }

  private handleJoin(
    ws: LiveSocket,
    connectionId: string,
    monsterInstanceId?: string,
    characterId = 1,
    worldPlayerId?: string,
  ): void {
    void this.bootstrapJoinBattle(
      ws,
      connectionId,
      monsterInstanceId,
      characterId,
      worldPlayerId,
    );
  }

  private async bootstrapJoinBattle(
    ws: LiveSocket,
    connectionId: string,
    monsterInstanceId?: string,
    characterId = 1,
    worldPlayerId?: string,
  ): Promise<void> {
    try {
      const playerId = worldPlayerId ?? `player_${connectionId.slice(0, 8)}`;
      seedAuthoritativePlayerEconomyIfEmpty(playerId, characterId, { dollarVolt: 500, alterCoins: 25 });

      await consumeChargedEquipmentBattleParticipation(playerId, characterId);

      const loadout = resolveAuthoritativeCombatLoadout(playerId, characterId);

      const bootstrap = createPveBattleBootstrap(loadout, monsterInstanceId);
      const session = new CombatSession(playerId, bootstrap.state, {
        characterId,
        ruleManifest: bootstrap.ruleManifest,
        loadout: bootstrap.loadout,
        ...(monsterInstanceId !== undefined ? { monsterInstanceId } : {}),
      });
      this.sessions.set(connectionId, session);
      this.socketsByPlayerId.set(playerId, ws);
      this.movementIntentHandler.clearConnection(connectionId);
      setPlayerInBattle(playerId, characterId, true);
      registerBattleSessionLease(connectionId, playerId, characterId);
      const payload = session.start();
      console.log('[WS] Batalha iniciada', {
        connectionId,
        playerId,
        battleId: payload.state.battleId,
        monsterInstanceId: monsterInstanceId ?? null,
      });
      this.send(ws, { type: 'START_COMBAT', payload: { battleId: payload.state.battleId } });
      void this.deliverCombatPayload(ws, connectionId, session, payload);
    } catch (error) {
      console.error('[WS] bootstrapJoinBattle falhou', {
        connectionId,
        characterId,
        worldPlayerId: worldPlayerId ?? null,
        monsterInstanceId: monsterInstanceId ?? null,
        error,
      });
      this.send(ws, { type: 'combat-error', payload: { reason: 'JOIN_BATTLE_FAILED' } });
    }
  }

  private async handleActivateBook(ws: LiveSocket, connectionId: string, bookId: string): Promise<void> {
    const session = this.sessions.get(connectionId);
    if (!session) {
      this.send(ws, { type: 'combat-error', payload: { reason: 'NO_SESSION' } });
      return;
    }

    const result = await activateBook({
      playerId: session.getPlayerActorId(),
      characterId: session.getCharacterId(),
      bookId,
    });

    if (!result.ok) {
      this.send(ws, { type: 'combat-error', payload: { reason: result.message } });
      return;
    }

    this.send(ws, {
      type: 'book-activated',
      payload: { bookId, expiresAt: result.expiresAt },
    });
  }

  private async handleBankTransaction(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly intentId: string;
      readonly characterId: number;
      readonly operation: 'deposit-item' | 'withdraw-item' | 'deposit-currency' | 'withdraw-currency';
      readonly itemId?: string;
      readonly quantity?: number;
      readonly currency?: 'volts' | 'alter';
      readonly amount?: number;
      readonly clientReportedX?: number;
      readonly clientReportedY?: number;
    },
  ): Promise<void> {
    const world = this.worldConnections.get(connectionId);
    const intentId = payload.intentId;

    if (!world) {
      this.send(ws, {
        type: 'economy-bank-result',
        payload: { ok: false, message: 'Faça login no mundo antes de usar o banco.', intentId },
      });
      return;
    }

    if (world.characterId !== payload.characterId) {
      this.send(ws, {
        type: 'economy-bank-result',
        payload: { ok: false, message: 'Personagem inválido para esta sessão.', intentId },
      });
      return;
    }

    const profile = getWorldProfile(world.playerId, world.characterId);
    if (!validateBankNpcAccess({
      mapId: profile.currentMapId,
      serverX: profile.lastPosition.x,
      serverY: profile.lastPosition.y,
      ...(payload.clientReportedX !== undefined ? { clientReportedX: payload.clientReportedX } : {}),
      ...(payload.clientReportedY !== undefined ? { clientReportedY: payload.clientReportedY } : {}),
    })) {
      this.send(ws, {
        type: 'economy-bank-result',
        payload: { ok: false, message: 'Aproxime-se do Banqueiro para usar o cofre.', intentId },
      });
      return;
    }

    const playerId = world.playerId;
    const characterId = world.characterId;

    let result: { ok: true } | { ok: false; message: string };

    switch (payload.operation) {
      case 'deposit-item':
        result = await depositBankItem({
          playerId,
          characterId,
          itemId: payload.itemId!,
          ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
          intentId,
        });
        break;
      case 'withdraw-item':
        result = await withdrawBankItem({
          playerId,
          characterId,
          itemId: payload.itemId!,
          ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
          intentId,
        });
        break;
      case 'deposit-currency':
      case 'withdraw-currency': {
        const currencyCheck = validateBankCurrencyRequest(
          payload.currency,
          payload.amount ?? Number.NaN,
        );
        if (!currencyCheck.ok) {
          result = { ok: false, message: currencyCheck.reason };
          break;
        }
        const currencyRequest = {
          playerId,
          characterId,
          currency: currencyCheck.currency,
          amount: currencyCheck.amount,
          intentId,
        };
        result = payload.operation === 'deposit-currency'
          ? await depositBankCurrency(currencyRequest)
          : await withdrawBankCurrency(currencyRequest);
        break;
      }
      default:
        result = { ok: false, message: 'Operação bancária inválida.' };
    }

    if (!result.ok) {
      this.send(ws, {
        type: 'economy-bank-result',
        payload: { ok: false, message: result.message, intentId },
      });
      return;
    }

    this.send(ws, {
      type: 'economy-bank-result',
      payload: { ok: true, intentId },
    });
  }

  private async handleExchangeAlter(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly alterAmount: number; readonly characterId?: number },
  ): Promise<void> {
    const session = this.sessions.get(connectionId);
    const playerId = session?.getPlayerActorId() ?? `player_${connectionId.slice(0, 8)}`;
    const characterId = payload.characterId ?? session?.getCharacterId() ?? 1;

    const result = await exchangeAlterCoinsForVolts({
      playerId,
      characterId,
      alterAmount: payload.alterAmount,
    });

    this.send(ws, {
      type: 'economy-exchange-result',
      payload: result.ok ? { ok: true } : { ok: false, message: result.message },
    });
  }

  private resolveRefractionWorldActor(
    connectionId: string,
    payload: { readonly playerId: string; readonly characterId: number },
  ): { readonly playerId: string; readonly characterId: number } | null {
    const world = this.worldConnections.get(connectionId);
    if (!world) return null;
    if (world.playerId !== payload.playerId || world.characterId !== payload.characterId) {
      return null;
    }
    return { playerId: world.playerId, characterId: world.characterId };
  }

  private handleRefractionBoothQuote(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly playerId: string; readonly characterId: number },
  ): void {
    const actor = this.resolveRefractionWorldActor(connectionId, payload);
    if (!actor) {
      this.send(ws, {
        type: 'refraction-booth-quote-result',
        payload: { ok: false, reason: 'Sessão de mundo inválida.' },
      });
      return;
    }

    const result = getRefractionBoothService().getQuote(actor);
    this.send(ws, { type: 'refraction-booth-quote-result', payload: result });
  }

  private async handleRefractionBoothStart(
    ws: LiveSocket,
    connectionId: string,
    payload: { readonly playerId: string; readonly characterId: number; readonly displayName: string },
  ): Promise<void> {
    const actor = this.resolveRefractionWorldActor(connectionId, payload);
    if (!actor) {
      this.send(ws, {
        type: 'refraction-booth-started',
        payload: { ok: false, reason: 'Sessão de mundo inválida.' },
      });
      return;
    }

    const result = await getRefractionBoothService().startSession({
      playerId: actor.playerId,
      characterId: actor.characterId,
      displayName: payload.displayName,
    });

    this.send(ws, { type: 'refraction-booth-started', payload: result });
  }

  private async handleRefractionBoothComplete(
    ws: LiveSocket,
    connectionId: string,
    payload: {
      readonly playerId: string;
      readonly characterId: number;
      readonly sessionId: string;
      readonly hits: number;
      readonly misses: number;
      readonly durationMs: number;
      readonly hitTimings?: readonly number[];
    },
  ): Promise<void> {
    const actor = this.resolveRefractionWorldActor(connectionId, payload);
    if (!actor) {
      this.send(ws, {
        type: 'refraction-booth-complete-result',
        payload: { ok: false, reason: 'Sessão de mundo inválida.' },
      });
      return;
    }

    const result = await getRefractionBoothService().completeSession({
      playerId: actor.playerId,
      characterId: actor.characterId,
      payload: {
        sessionId: payload.sessionId,
        hits: payload.hits,
        misses: payload.misses,
        durationMs: payload.durationMs,
        ...(payload.hitTimings ? { hitTimings: payload.hitTimings } : {}),
      },
    });

    this.send(ws, { type: 'refraction-booth-complete-result', payload: result });
  }

  private sendCombatEvent(ws: WebSocket, payload: CombatDispatchPayload): void {
    this.send(ws, { type: 'combat-event', payload });
  }

  private send(ws: WebSocket, message: WsOutboundMessage): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(serializeWsOutbound(message));
    }
  }
}
