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
import type { PvpRankedQueueSnapshot } from '../../../shared/combat/pvp/pvpRankedQueueProtocol.js';
import { PVP_DUELIST_REGISTRY } from '../../../shared/world/pvpDuelistRegistry.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import { CombatEventType } from '../../../shared/events.js';
import { buildEmptyLootRevealSlots } from '../../../shared/loot/lootRevealSlots.js';
import type { CombatFinishedPayload } from '../../../shared/combat/combatFinished.js';
import { didPlayerWinBattle } from '../../../shared/items/combatCreatureRegistry.js';
import {
  getPvpRankedQueueManager,
  resetPvpRankedQueueManagerForTests,
  type PvpRankedMatchPair,
} from '../../../server/combat/pvp/PvpRankedQueueManager.js';
import { createPvpArenaBattleBootstrap } from '../../../server/combat/pvp/buildPvpArenaBattle.js';
import { PvpCombatSession } from '../../../server/combat/pvp/PvpCombatSession.js';
import { applyPvpRankedRatingDelta } from '../../../server/combat/pvp/pvpRankedRating.js';
import { getActivePlayerSkinBundleId } from '../../entities/player/activePlayerSkinBundle.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import { getGameStore } from '../../state/GameStore.js';

const LOCAL_CONN = 'local-pvp-human';
const LOCAL_BOT_CONN = 'local-pvp-practice-bot';
const LOCAL_BOT_PLAYER_ID = 'pvp_practice_bot';

type Emit = (type: string, payload: unknown) => void;

let emit: Emit | null = null;
let unsubQueue: (() => void) | null = null;
let unsubMatch: (() => void) | null = null;
let practiceSession: PvpCombatSession | null = null;
let delivering = false;
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

function ensurePracticeBotSeated(): void {
  const queue = getPvpRankedQueueManager();
  const snap = queue.getSnapshot();
  if (snap.slots[0] && snap.slots[1]) return;
  if (snap.phase === 'countdown' || snap.phase === 'starting' || snap.phase === 'in_battle') {
    return;
  }
  const duelist = PVP_DUELIST_REGISTRY[0]!;
  const result = queue.join({
    connectionId: LOCAL_BOT_CONN,
    playerId: LOCAL_BOT_PLAYER_ID,
    characterId: 0,
    displayName: `${duelist.displayName} (prática)`,
    skinBundleId: 'player_male_2',
  });
  if (!result.ok) {
    send('pvp-ranked-queue-error', { reason: result.reason });
  }
}

export function localPvpRankedJoin(payload: {
  readonly stationId: string;
  readonly displayName?: string;
  readonly skinBundleId?: string;
}): void {
  ensureQueueWired();
  const id = resolveLocalIdentity();
  const skin =
    typeof payload.skinBundleId === 'string' && isValidPlayerSkinBundleId(payload.skinBundleId)
      ? payload.skinBundleId
      : id.skinBundleId;
  const queue = getPvpRankedQueueManager();
  const result = queue.join(
    {
      connectionId: LOCAL_CONN,
      playerId: id.playerId,
      characterId: id.characterId,
      displayName: payload.displayName?.trim() || id.displayName,
      skinBundleId: skin,
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

export function localPvpRankedLeave(_payload: { readonly stationId: string }): void {
  ensureQueueWired();
  const queue = getPvpRankedQueueManager();
  queue.leave(LOCAL_CONN);
  queue.leave(LOCAL_BOT_CONN);
  queue.clearAfterBattle();
  broadcastSnapshot();
}

export function localPvpRankedReady(_payload: { readonly stationId: string }): void {
  ensureQueueWired();
  ensurePracticeBotSeated();
  const queue = getPvpRankedQueueManager();
  const human = queue.setReady(LOCAL_CONN, true);
  if (!human.ok) {
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

export function localPvpRankedUnready(_payload: { readonly stationId: string }): void {
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
  }
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

  const loadoutProvider = (globalThis as {
    __ALTERCADIA_LOCAL_PVP_LOADOUT__?: () => PlayerCombatLoadout | null;
  }).__ALTERCADIA_LOCAL_PVP_LOADOUT__;
  const loadout = loadoutProvider?.() ?? null;
  if (!loadout) {
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
  send('combat-event', startPayload);
}

export async function localPvpRankedDispatchAction(action: ActionRequest): Promise<void> {
  if (!practiceSession || delivering) return;
  delivering = true;
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
    send('combat-event', payload);
    return;
  }

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

  practiceSession = null;
  getPvpRankedQueueManager().clearAfterBattle();
  broadcastSnapshot();
}

export function resetLocalPvpRankedAuthority(): void {
  if (botAutoReadyTimer) {
    clearTimeout(botAutoReadyTimer);
    botAutoReadyTimer = null;
  }
  practiceSession = null;
  delivering = false;
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
