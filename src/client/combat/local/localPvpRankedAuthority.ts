/**
 * Autoridade local da fila PvP rankeado — mesmo contrato WS do CombatWsHub.
 * Rankeado exige dois jogadores (sem bot). Em mock 1 jogador a fila espera o segundo slot.
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
  isLockablePvpRankedStakeVolts,
  parsePvpRankedLockStakeVolts,
  parsePvpRankedStakeVolts,
} from '../../../shared/combat/pvp/pvpRankedDuelStake.js';
import type { PvpRankedQueueSnapshot } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';
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
import { resolvePvpBattleProgressionGrant } from '../../../shared/progression/battleProgressionGrant.js';
import { getMutableDataStore } from '../../PlayerDataStore.js';
import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';
import { ensureMovesetMasteryForClass } from '../../../shared/progression/movesetMasterySeed.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import {
  lockQueuedPvpRankedStake,
  refundPvpRankedStakeMembers,
} from '../../../server/combat/pvp/pvpRankedDuelStakeService.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getGameStore } from '../../state/GameStore.js';

const LOCAL_CONN = 'local-pvp-human';
const LOCAL_BOT_CONN = 'local-pvp-practice-bot';
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
  /* Rankeado é só jogador vs jogador — sem bot de prática. */
}

function ensurePracticeBotSeated(): void {
  /* no-op */
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
  broadcastSnapshot();
}

export async function localPvpRankedSetStake(payload: {
  readonly stationId: string;
  readonly stakeVolts?: number;
}): Promise<void> {
  ensureQueueWired();
  const stakeVolts = parsePvpRankedLockStakeVolts(payload.stakeVolts);
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
  const queue = getPvpRankedQueueManager();
  const member = queue.getMember(LOCAL_CONN);
  if (!member) {
    send('pvp-ranked-queue-error', { reason: 'NOT_IN_QUEUE' });
    broadcastSnapshot();
    return;
  }
  if (!isLockablePvpRankedStakeVolts(member.stakeVolts)) {
    send('pvp-ranked-queue-error', { reason: 'INVALID_STAKE' });
    broadcastSnapshot();
    return;
  }
  const lockResult = await lockQueuedPvpRankedStake(member);
  if (!lockResult.ok) {
    send('pvp-ranked-queue-error', { reason: lockResult.reason });
    broadcastSnapshot();
    return;
  }
  queue.setStakeLocked(LOCAL_CONN, true);
  const human = queue.setReady(LOCAL_CONN, true);
  if (!human.ok) {
    await refundPvpRankedStakeMembers([{ ...member, stakeLocked: true }]);
    queue.setStakeLocked(LOCAL_CONN, false);
    send('pvp-ranked-queue-error', { reason: human.reason });
    broadcastSnapshot();
    return;
  }
  broadcastSnapshot();
}

export async function localPvpRankedUnready(_payload: { readonly stationId: string }): Promise<void> {
  ensureQueueWired();
  if (botAutoReadyTimer) {
    clearTimeout(botAutoReadyTimer);
    botAutoReadyTimer = null;
  }
  const queue = getPvpRankedQueueManager();
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
  // Contrato: só player vs player. Mock 1 jogador não inicia duelo sozinho.
  await refundPvpRankedStakeMembers(match.peers);
  getPvpRankedQueueManager().clearAfterBattle();
  send('pvp-ranked-queue-error', { reason: 'MATCH_START_FAILED' });
  broadcastSnapshot();
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

  const selfLevel = Math.max(1, getMutableDataStore().getCharacterLevel().level);
  const botId = practiceSession.getBotActorId();
  const botLevel = Math.max(1, Math.floor(payload.state.combatants[botId]?.level ?? selfLevel));
  const classId = getPlayerEquipmentStore().getSnapshot().classId;
  const movesetMastery = ensureMovesetMasteryForClass(
    getPlayerProgressionStore().getSnapshot().movesetMastery,
    classId,
  );
  const progressionGrant = forcedForfeit
    ? undefined
    : (() => {
        const grant = resolvePvpBattleProgressionGrant({
          victory,
          endReason,
          selfLevel,
          opponentLevel: botLevel,
          movesUsedInBattle: [],
          characterLevel: selfLevel,
          movesetMastery,
        });
        return grant.totalBattleXp > 0 ? grant : undefined;
      })();
  const xpGain = progressionGrant?.totalBattleXp ?? 0;

  const finishedPayload: CombatFinishedPayload = {
    battleId: payload.state.battleId,
    victory,
    xpGain,
    loot: null,
    lootReveal: buildEmptyLootRevealSlots(),
    battleType: BattleType.PVP,
    endReason,
    rankingResult,
    ...(progressionGrant ? { progressionGrant } : {}),
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
    ...(xpGain > 0 ? { xpGain } : {}),
  });

  const stakeVolts = practiceStakeVolts;
  practiceStakeVolts = 0;
  if (stakeVolts > 0) {
    // Mock local sem segundo jogador: só devolve a trava humana.
    const localId = resolveLocalIdentity();
    await refundPvpRankedStakeMembers([
      { playerId: localId.playerId, characterId: localId.characterId, stakeVolts, stakeLocked: true },
    ]);
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
