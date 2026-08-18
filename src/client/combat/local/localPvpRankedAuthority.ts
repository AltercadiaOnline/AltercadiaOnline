/**
 * Autoridade local da fila/duelo PvP rankeado — mesmo contrato WS do CombatWsHub.
 * Cliente só envia join/ready/leave; esta camada aprova e emite snapshots / START_COMBAT.
 *
 * Local 1 jogador: autoridade injeta duelista de prática (bot) — nunca o HUD.
 */

import type { ActionRequest } from '../../../shared/events.js';
import type { CombatDispatchPayload } from '../../../shared/combatWire.js';
import type { PlayerCombatLoadout } from '../../../shared/character/equipmentState.js';
import {
  DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  isValidPlayerSkinBundleId,
  type PlayerSkinBundleId,
} from '../../../shared/character/playerSkinBundle.js';
import { PVP_RANKED_STATION_ID } from '../../../shared/combat/pvp/pvpRankedQueueConfig.js';
import {
  parsePvpRankedStakeVolts,
  PVP_RANKED_PRACTICE_BOT_PLAYER_ID,
} from '../../../shared/combat/pvp/pvpRankedDuelStake.js';
import type { PvpRankedQueueSnapshot } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';
import { PVP_DUELIST_REGISTRY } from '../../../shared/world/pvpDuelistRegistry.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import { CombatEventType } from '../../../shared/events.js';
import { buildEmptyLootRevealSlots } from '../../../shared/loot/lootRevealSlots.js';
import type { CombatFinishedPayload } from '../../../shared/combat/combatFinished.js';
import { didPlayerWinBattle } from '../../../shared/items/combatCreatureRegistry.js';
import {
  enrichCombatDispatchTurnTimerUi,
  type CombatTurnWindowState,
} from '../../../shared/combat/enrichCombatTurnTimerUi.js';
import {
  getPvpRankedQueueManager,
  resetPvpRankedQueueManagerForTests,
  type PvpRankedMatchPair,
} from '../../../server/combat/pvp/PvpRankedQueueManager.js';
import { createPvpArenaBattleBootstrap } from '../../../server/combat/pvp/buildPvpArenaBattle.js';
import { PvpCombatSession } from '../../../server/combat/pvp/PvpCombatSession.js';
import { applyPvpRankedRatingDelta } from '../../../server/combat/pvp/pvpRankedRating.js';
import {
  lockQueuedPvpRankedStake,
  refundPvpRankedStakeMembers,
  settleQueuedPvpRankedPot,
} from '../../../server/combat/pvp/pvpRankedDuelStakeService.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getGameStore } from '../../state/GameStore.js';

const LOCAL_CONN = 'local-pvp-human';
const LOCAL_BOT_CONN = 'local-pvp-practice-bot';
const LOCAL_BOT_PLAYER_ID = PVP_RANKED_PRACTICE_BOT_PLAYER_ID;
const pvpTurnWindows = new Map<string, CombatTurnWindowState>();
let pvpTurnTimer: ReturnType<typeof setTimeout> | null = null;
let pvpTurnTimerToken = 0;

function clearPvpTurnTimer(): void {
  if (pvpTurnTimer !== null) {
    clearTimeout(pvpTurnTimer);
    pvpTurnTimer = null;
  }
  pvpTurnTimerToken += 1;
}

function schedulePvpTurnTimeout(enriched: CombatDispatchPayload): void {
  clearPvpTurnTimer();
  if (!practiceSession || !enriched.ui.actionsEnabled || enriched.ui.turnDeadlineMs === undefined) {
    return;
  }
  const delayMs = Math.max(0, enriched.ui.turnDeadlineMs - Date.now());
  const battleId = enriched.state.battleId;
  const turn = enriched.state.turn;
  const token = pvpTurnTimerToken;
  pvpTurnTimer = setTimeout(() => {
    pvpTurnTimer = null;
    if (token !== pvpTurnTimerToken) return;
    void localPvpRankedDispatchAction({
      battleId,
      actorId: practiceSession?.getPlayerActorId() ?? '',
      turn,
      skillId: null,
      requestId: `timeout-${Date.now()}`,
    });
  }, delayMs);
}

function enrichPracticePayload(payload: CombatDispatchPayload): CombatDispatchPayload {
  if (!practiceSession) return payload;
  const playerId = practiceSession.getPlayerActorId();
  return enrichCombatDispatchTurnTimerUi(
    payload,
    playerId,
    pvpTurnWindows,
    payload.state.battleId || playerId,
  );
}

type Emit = (type: string, payload: unknown) => void;

let emit: Emit | null = null;
let unsubQueue: (() => void) | null = null;
let unsubMatch: (() => void) | null = null;
let practiceSession: PvpCombatSession | null = null;
let delivering = false;
let practiceStakeVolts = 0;
let botAutoReadyTimer: ReturnType<typeof setTimeout> | null = null;

export function bindLocalPvpRankedEmitter(next: Emit | null): void {
  emit = next;
  if (next) ensureQueueWired();
}

function send(type: string, payload: unknown): void {
  emit?.(type, payload);
}

function broadcastSnapshot(snapshot?: PvpRankedQueueSnapshot): void {
  send('pvp-ranked-queue-snapshot', snapshot ?? getPvpRankedQueueManager().getSnapshot());
}

function ensureQueueWired(): void {
  if (unsubQueue) return;
  const queue = getPvpRankedQueueManager();
  unsubQueue = queue.subscribe((snapshot) => {
    send('pvp-ranked-queue-snapshot', snapshot);
  });
  unsubMatch = queue.onMatchReady((match) => {
    void startLocalPracticeMatch(match);
  });
}

function resolveLocalIdentity(): {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly skinBundleId: PlayerSkinBundleId;
} {
  let playerId = 'local-player';
  let characterId = 1;
  try {
    const creds = resolveWorldLoreCredentials();
    playerId = creds.playerId;
    characterId = creds.characterId;
  } catch {
    const cid = getGameStore().getActiveCharacterId();
    if (cid !== null) {
      characterId = cid;
      playerId = `player:${cid}`;
    }
  }
  const profile = getPlayerProfileStore().getSnapshot();
  const skin = getActivePlayerSkinBundleId();
  return {
    playerId,
    characterId,
    displayName: profile.displayName?.trim() || 'Você',
    skinBundleId: isValidPlayerSkinBundleId(skin) ? skin : DEFAULT_PLAYER_SKIN_BUNDLE_ID,
  };
}

function syncPracticeBotStake(): void {
  const queue = getPvpRankedQueueManager();
  const human = queue.getMember(LOCAL_CONN);
  if (!human) return;
  const bot = queue.getMember(LOCAL_BOT_CONN);
  if (!bot || bot.stakeVolts === human.stakeVolts) return;
  queue.alignStake(LOCAL_BOT_CONN, human.stakeVolts);
}

function ensurePracticeBotSeated(): void {
  const queue = getPvpRankedQueueManager();
  const snap = queue.getSnapshot();
  if (snap.slots[0] && snap.slots[1]) {
    syncPracticeBotStake();
    return;
  }
  if (snap.phase === 'countdown' || snap.phase === 'starting' || snap.phase === 'in_battle') {
    return;
  }
  const duelist = PVP_DUELIST_REGISTRY[0]!;
  const human = queue.getMember(LOCAL_CONN);
  const result = queue.join({
    connectionId: LOCAL_BOT_CONN,
    playerId: LOCAL_BOT_PLAYER_ID,
    characterId: 0,
    displayName: `${duelist.displayName} (prática)`,
    skinBundleId: 'player_male_2',
    stakeVolts: human?.stakeVolts ?? 0,
  });
  if (!result.ok) {
    send('pvp-ranked-queue-error', { reason: result.reason });
  }
}

export function localPvpRankedJoin(payload: {
  readonly stationId: string;
  readonly displayName?: string;
  readonly skinBundleId?: string;
  readonly stakeVolts?: number;
}): void {
  ensureQueueWired();
  const id = resolveLocalIdentity();
  const skin =
    typeof payload.skinBundleId === 'string' && isValidPlayerSkinBundleId(payload.skinBundleId)
      ? payload.skinBundleId
      : id.skinBundleId;
  const stakeVolts = parsePvpRankedStakeVolts(payload.stakeVolts) ?? 0;
  const queue = getPvpRankedQueueManager();
  const result = queue.join(
    {
      connectionId: LOCAL_CONN,
      playerId: id.playerId,
      characterId: id.characterId,
      displayName: payload.displayName?.trim() || id.displayName,
      skinBundleId: skin,
      stakeVolts,
    },
    payload.stationId || PVP_RANKED_STATION_ID,
  );
  if (!result.ok) {
    send('pvp-ranked-queue-error', { reason: result.reason });
    broadcastSnapshot();
    return;
  }
  ensurePracticeBotSeated();
  broadcastSnapshot();
}

export async function localPvpRankedSetStake(payload: {
  readonly stationId: string;
  readonly stakeVolts?: number;
}): Promise<void> {
  ensureQueueWired();
  const stakeVolts = parsePvpRankedStakeVolts(payload.stakeVolts);
  if (stakeVolts === null) {
    send('pvp-ranked-queue-error', { reason: 'INVALID_STAKE' });
    return;
  }
  const queue = getPvpRankedQueueManager();
  const result = queue.setStake(LOCAL_CONN, stakeVolts);
  if (!result.ok) {
    send('pvp-ranked-queue-error', { reason: result.reason });
    broadcastSnapshot();
    return;
  }
  await refundPvpRankedStakeMembers(result.unlockMembers);
  ensurePracticeBotSeated();
  syncPracticeBotStake();
  broadcastSnapshot();
}

export async function localPvpRankedLeave(_payload: { readonly stationId: string }): Promise<void> {
  ensureQueueWired();
  const queue = getPvpRankedQueueManager();
  const humanLeave = queue.leave(LOCAL_CONN);
  if (humanLeave.ok) {
    await refundPvpRankedStakeMembers(humanLeave.unlockMembers);
  }
  queue.leave(LOCAL_BOT_CONN);
  queue.clearAfterBattle();
  practiceStakeVolts = 0;
  broadcastSnapshot();
}

export async function localPvpRankedReady(_payload: { readonly stationId: string }): Promise<void> {
  ensureQueueWired();
  ensurePracticeBotSeated();
  syncPracticeBotStake();
  const queue = getPvpRankedQueueManager();
  const member = queue.getMember(LOCAL_CONN);
  if (!member) {
    send('pvp-ranked-queue-error', { reason: 'NOT_IN_QUEUE' });
    broadcastSnapshot();
    return;
  }
  const lockResult = await lockQueuedPvpRankedStake(member);
  if (!lockResult.ok) {
    send('pvp-ranked-queue-error', { reason: lockResult.reason });
    broadcastSnapshot();
    return;
  }
  if (member.stakeVolts > 0) {
    queue.setStakeLocked(LOCAL_CONN, true);
  }
  const human = queue.setReady(LOCAL_CONN, true);
  if (!human.ok) {
    await refundPvpRankedStakeMembers([{ ...member, stakeLocked: true }]);
    queue.setStakeLocked(LOCAL_CONN, false);
    send('pvp-ranked-queue-error', { reason: human.reason });
    broadcastSnapshot();
    return;
  }
  broadcastSnapshot();
  if (botAutoReadyTimer) clearTimeout(botAutoReadyTimer);
  botAutoReadyTimer = setTimeout(() => {
    botAutoReadyTimer = null;
    const bot = queue.setReady(LOCAL_BOT_CONN, true);
    if (!bot.ok) {
      send('pvp-ranked-queue-error', { reason: bot.reason });
    }
    broadcastSnapshot();
  }, 400);
}

export async function localPvpRankedUnready(_payload: { readonly stationId: string }): Promise<void> {
  ensureQueueWired();
  if (botAutoReadyTimer) {
    clearTimeout(botAutoReadyTimer);
    botAutoReadyTimer = null;
  }
  const queue = getPvpRankedQueueManager();
  queue.setReady(LOCAL_BOT_CONN, false);
  const human = queue.setReady(LOCAL_CONN, false);
  if (!human.ok) {
    send('pvp-ranked-queue-error', { reason: human.reason });
    broadcastSnapshot();
    return;
  }
  await refundPvpRankedStakeMembers(human.unlockMembers);
  broadcastSnapshot();
}

async function startLocalPracticeMatch(match: PvpRankedMatchPair): Promise<void> {
  const human = match.peers.find((p) => p.connectionId === LOCAL_CONN);
  if (!human) {
    getPvpRankedQueueManager().clearAfterBattle();
    send('pvp-ranked-queue-error', { reason: 'MATCH_START_FAILED' });
    broadcastSnapshot();
    return;
  }

  practiceStakeVolts = human.stakeVolts ?? 0;

  const loadoutProvider = (globalThis as {
    __ALTERCADIA_LOCAL_PVP_LOADOUT__?: () => PlayerCombatLoadout | null;
  }).__ALTERCADIA_LOCAL_PVP_LOADOUT__;
  const loadout = loadoutProvider?.() ?? null;
  if (!loadout) {
    await refundPvpRankedStakeMembers([{ ...human, stakeLocked: true }]);
    getPvpRankedQueueManager().clearAfterBattle();
    send('pvp-ranked-queue-error', { reason: 'MATCH_START_FAILED' });
    send('combat-error', { reason: 'PROFILE_NOT_READY' });
    broadcastSnapshot();
    return;
  }

  const duelist = PVP_DUELIST_REGISTRY[0]!;
  const bootstrap = createPvpArenaBattleBootstrap(loadout, duelist);
  const botActorId =
    Object.keys(bootstrap.state.combatants).find((id) => id !== loadout.playerId) ?? '';
  if (!botActorId) {
    await refundPvpRankedStakeMembers([{ ...human, stakeLocked: true }]);
    getPvpRankedQueueManager().clearAfterBattle();
    send('pvp-ranked-queue-error', { reason: 'MATCH_START_FAILED' });
    broadcastSnapshot();
    return;
  }

  practiceSession = new PvpCombatSession(loadout.playerId, bootstrap.state, {
    characterId: loadout.characterId,
    ruleManifest: bootstrap.ruleManifest,
    loadout: bootstrap.loadout,
    duelistId: duelist.id,
    botActorId,
  });

  getPvpRankedQueueManager().markInBattle(match.matchId);
  const startPayload = practiceSession.start();
  send('START_COMBAT', {
    battleId: startPayload.state.battleId,
    matchId: match.matchId,
    battleType: 'PVP',
  });
  void deliverPracticePayload(startPayload);
}

export async function localPvpRankedDispatchAction(action: ActionRequest): Promise<void> {
  if (!practiceSession || delivering) return;
  delivering = true;
  clearPvpTurnTimer();
  try {
    const result = await practiceSession.dispatchPlayerAction(action);
    if (!result.ok) {
      send('combat-error', { reason: result.reason });
      return;
    }
    await deliverPracticePayload(result.payload);

    const state = practiceSession.getState();
    if (state.phase !== 'ENDED' && state.activeActorId === practiceSession.getBotActorId()) {
      const botAction = buildSimpleBotAction(practiceSession);
      if (botAction) {
        const botResult = await practiceSession.dispatchBotAction(botAction);
        if (botResult.ok) {
          await deliverPracticePayload(botResult.payload);
        }
      }
    }
  } finally {
    delivering = false;
  }
}

export async function localPvpRankedForfeit(battleId: string): Promise<void> {
  if (!practiceSession) return;
  if (practiceSession.getState().battleId !== battleId) {
    send('combat-error', { reason: 'INVALID_BATTLE' });
    return;
  }
  const result = await practiceSession.forfeitPlayer();
  if (!result.ok) {
    send('combat-error', { reason: result.reason });
    return;
  }
  await deliverPracticePayload(result.payload, true);
}

function buildSimpleBotAction(session: PvpCombatSession): ActionRequest | null {
  const state = session.getState();
  const botId = session.getBotActorId();
  const bot = state.combatants[botId];
  if (!bot || state.phase === 'ENDED') return null;
  const skill = bot.skills?.[0];
  if (!skill) return null;
  return {
    requestId: `local-bot-${Date.now()}`,
    battleId: state.battleId,
    actorId: botId,
    turn: state.turn,
    skillId: skill.id,
    targetId: session.getPlayerActorId(),
  };
}

async function deliverPracticePayload(
  payload: CombatDispatchPayload,
  forcedForfeit = false,
): Promise<void> {
  if (!practiceSession) return;
  if (payload.state.phase !== 'ENDED' && !forcedForfeit) {
    const enriched = enrichPracticePayload(payload);
    send('combat-event', enriched);
    schedulePvpTurnTimeout(enriched);
    return;
  }

  clearPvpTurnTimer();
  pvpTurnWindows.clear();

  const playerId = practiceSession.getPlayerActorId();
  const characterId = practiceSession.getCharacterId();
  const victory = forcedForfeit ? false : didPlayerWinBattle(payload.state, playerId);
  const rankingResult = applyPvpRankedRatingDelta(playerId, characterId, victory);
  const endReason = forcedForfeit ? 'FORFEIT' as const : victory ? 'VICTORY' as const : 'DEFEAT' as const;

  const finishedPayload: CombatFinishedPayload = {
    battleId: payload.state.battleId,
    victory,
    xpGain: 0,
    loot: null,
    lootReveal: buildEmptyLootRevealSlots(),
    battleType: BattleType.PVP,
    endReason,
    rankingResult,
  };

  const enriched: CombatDispatchPayload = {
    ...payload,
    events: [
      ...payload.events,
      { type: CombatEventType.COMBAT_FINISHED, payload: finishedPayload },
    ],
    ui: { ...payload.ui, actionsEnabled: false },
  };

  send('combat-event', enriched);
  send('BATTLE_ENDED', {
    battleId: enriched.state.battleId,
    victory,
    monsterInstanceId: '',
    lootGranted: false,
    hasLoot: false,
    endReason,
    battleType: BattleType.PVP,
    rankingResult,
  });

  const stakeVolts = practiceStakeVolts;
  practiceStakeVolts = 0;
  if (stakeVolts > 0) {
    const localId = resolveLocalIdentity();
    await settleQueuedPvpRankedPot({
      winner: victory
        ? { playerId: localId.playerId, characterId: localId.characterId }
        : { playerId: LOCAL_BOT_PLAYER_ID, characterId: 0 },
      loser: victory
        ? { playerId: LOCAL_BOT_PLAYER_ID, characterId: 0 }
        : { playerId: localId.playerId, characterId: localId.characterId },
      stakeVolts,
    });
  }

  practiceSession = null;
  getPvpRankedQueueManager().clearAfterBattle();
  pvpTurnWindows.clear();
  broadcastSnapshot();
}

export function resetLocalPvpRankedAuthority(): void {
  if (botAutoReadyTimer) {
    clearTimeout(botAutoReadyTimer);
    botAutoReadyTimer = null;
  }
  clearPvpTurnTimer();
  practiceSession = null;
  delivering = false;
  practiceStakeVolts = 0;
  pvpTurnWindows.clear();
  unsubQueue?.();
  unsubMatch?.();
  unsubQueue = null;
  unsubMatch = null;
  resetPvpRankedQueueManagerForTests();
}

export function bindLocalPvpLoadoutProvider(
  provider: (() => PlayerCombatLoadout | null) | null,
): void {
  const g = globalThis as {
    __ALTERCADIA_LOCAL_PVP_LOADOUT__?: (() => PlayerCombatLoadout | null) | null;
  };
  g.__ALTERCADIA_LOCAL_PVP_LOADOUT__ = provider;
}

export function hasLocalPvpPracticeSession(): boolean {
  return practiceSession !== null;
}
