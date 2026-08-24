import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { hasFriend } from '../../social/friendListStore.js';
import { getPvpRankedQueueManager } from '../../combat/pvp/PvpRankedQueueManager.js';
import { isPlayerInBattle } from '../../models/playerSessionRegistry.js';
import {
  CASUAL_DUEL_MAX_RANGE_TILES,
  isWithinCasualDuelRange,
  isWithinPlayerInspectRange,
  isWithinPlayerTradeRange,
} from '../../../shared/social/playerSocialRange.js';
import type {
  InspectPlayerPayload,
  PlayerInspectBuild,
  PlayerInspectPvpStats,
  PlayerInspectView,
} from '../../../shared/social/playerInspectTypes.js';
import { getCasualDuelInviteStore } from '../../social/casualDuelInviteStore.js';
import {
  canPlayerEnterCasualDuel,
  casualDuelHpBlockedReason,
} from '../../social/casualDuelHpGate.js';
import { getPlayerTradeStore } from '../../social/playerTradeStore.js';
import { CLASS_CATALOG, type ClassType } from '../../../shared/types/classes.js';
import {
  allocatedStatsFromProfile,
  STAT_POINT_ATK_FLAT,
  STAT_POINT_DEF_FLAT,
} from '../../../shared/character/characterStatPoints.js';
import {
  PVP_RANKED_DEFAULT_RATING,
  readPvpRankedRating,
} from '../../combat/pvp/pvpRankedRating.js';
import type { PersistedCharacterProfileSlice } from '../../../shared/persistence/characterPersistenceRecord.js';

function findExploring(playerId: string, characterId: number) {
  return getWorldGameState().getByPlayer(playerId, characterId);
}

function resolveClassId(profile: PersistedCharacterProfileSlice): ClassType {
  const raw = profile.classId;
  if (raw === 'IMPETUS' || raw === 'COGITOR' || raw === 'TUTATOR' || raw === 'DISSOLUTUS') {
    return raw;
  }
  return 'IMPETUS';
}

/** Build sem SET: baseline da classe + pontos ATK/DEF da ficha. CRIT/AGIL = catálogo. */
function resolveInspectBuild(profile: PersistedCharacterProfileSlice): PlayerInspectBuild {
  const classId = resolveClassId(profile);
  const catalog = CLASS_CATALOG[classId];
  const allocated = allocatedStatsFromProfile(profile);
  return {
    atk: catalog.bonus.attack + allocated.atk * STAT_POINT_ATK_FLAT,
    def: catalog.bonus.defense + allocated.def * STAT_POINT_DEF_FLAT,
    crit: catalog.bonus.control,
    agil: catalog.bonus.agility,
  };
}

function resolveInspectPvp(profile: PersistedCharacterProfileSlice): PlayerInspectPvpStats {
  const ranked = readPvpRankedRating(profile);
  const matches = typeof profile.pvpMatches === 'number' && Number.isFinite(profile.pvpMatches)
    ? Math.max(0, Math.floor(profile.pvpMatches))
    : ranked.pvpWins + ranked.pvpLosses;
  return {
    rating: ranked.pvpRating ?? PVP_RANKED_DEFAULT_RATING,
    wins: ranked.pvpWins,
    losses: ranked.pvpLosses,
    matches,
  };
}

function resolveDuelInviteGate(
  viewerPlayerId: string,
  viewerCharacterId: number,
  targetPlayerId: string,
  targetCharacterId: number,
  viewer: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
): { readonly canInviteDuel: boolean; readonly duelInviteBlockReason: string | null } {
  const rankedQueue = getPvpRankedQueueManager();
  const duelStore = getCasualDuelInviteStore();
  const tradeStore = getPlayerTradeStore();

  if (rankedQueue.hasOccupant(viewerPlayerId, viewerCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'Saia do púlpito para desafiar.' };
  }
  if (rankedQueue.hasOccupant(targetPlayerId, targetCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'O jogador está no púlpito de PvP rankeado.' };
  }
  if (isPlayerInBattle(viewerPlayerId, viewerCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'Você está em batalha.' };
  }
  if (isPlayerInBattle(targetPlayerId, targetCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'O jogador está em batalha.' };
  }
  if (tradeStore.hasOpenTrade(viewerPlayerId, viewerCharacterId)
    || tradeStore.hasOpenTrade(targetPlayerId, targetCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'Não é possível duelar durante um trade.' };
  }
  if (duelStore.hasInvite(viewerPlayerId, viewerCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'Você já tem um desafio pendente.' };
  }
  if (duelStore.hasInvite(targetPlayerId, targetCharacterId)) {
    return { canInviteDuel: false, duelInviteBlockReason: 'Esse jogador já tem um desafio pendente.' };
  }
  const cooldownMs = duelStore.getRefuseCooldownRemainingMs(
    viewerPlayerId,
    viewerCharacterId,
    targetPlayerId,
    targetCharacterId,
  );
  if (cooldownMs > 0) {
    const seconds = Math.ceil(cooldownMs / 1000);
    return {
      canInviteDuel: false,
      duelInviteBlockReason: `Aguarde ${seconds}s (recusou recentemente).`,
    };
  }
  if (!isWithinCasualDuelRange(viewer.x, viewer.y, target.x, target.y)) {
    return {
      canInviteDuel: false,
      duelInviteBlockReason: `Chegue mais perto (${CASUAL_DUEL_MAX_RANGE_TILES} tiles).`,
    };
  }
  if (!canPlayerEnterCasualDuel(viewerPlayerId, viewerCharacterId)) {
    return {
      canInviteDuel: false,
      duelInviteBlockReason: casualDuelHpBlockedReason('self'),
    };
  }
  if (!canPlayerEnterCasualDuel(targetPlayerId, targetCharacterId)) {
    return {
      canInviteDuel: false,
      duelInviteBlockReason: casualDuelHpBlockedReason('target'),
    };
  }
  return { canInviteDuel: true, duelInviteBlockReason: null };
}

export function buildPlayerInspectView(
  viewerPlayerId: string,
  viewerCharacterId: number,
  targetPlayerId: string,
  targetCharacterId: number,
): { readonly ok: true; readonly view: PlayerInspectView } | { readonly ok: false; readonly reason: string } {
  if (!targetPlayerId || !Number.isFinite(targetCharacterId) || targetCharacterId < 1) {
    return { ok: false, reason: 'Alvo inválido.' };
  }
  if (targetPlayerId === viewerPlayerId && targetCharacterId === viewerCharacterId) {
    return { ok: false, reason: 'Não é possível inspecionar a si mesmo.' };
  }

  const viewer = findExploring(viewerPlayerId, viewerCharacterId);
  if (!viewer || viewer.status !== 'exploring') {
    return { ok: false, reason: 'Você precisa estar no mundo para inspecionar.' };
  }

  const target = findExploring(targetPlayerId, targetCharacterId);
  const online = Boolean(target && target.status === 'exploring');
  if (!target || !online) {
    return { ok: false, reason: 'Jogador indisponível ou fora do mundo.' };
  }
  if (target.mapId !== viewer.mapId) {
    return { ok: false, reason: 'O jogador não está no mesmo mapa.' };
  }
  if (!isWithinPlayerInspectRange(viewer.x, viewer.y, target.x, target.y)) {
    return { ok: false, reason: 'O jogador não está na sua tela.' };
  }

  const progression = getAuthoritativeProgression(targetPlayerId, targetCharacterId);
  const profile = progression.characterProfile;
  const displayName =
    profile.displayName?.trim()
    || target.displayName.trim()
    || 'Operative';
  const level = Math.max(1, Math.floor(profile.level || 1));
  const classId = resolveClassId(profile);
  const duelGate = resolveDuelInviteGate(
    viewerPlayerId,
    viewerCharacterId,
    targetPlayerId,
    targetCharacterId,
    viewer,
    target,
  );

  return {
    ok: true,
    view: {
      playerId: targetPlayerId,
      characterId: targetCharacterId,
      displayName,
      level,
      classId,
      online: true,
      build: resolveInspectBuild(profile),
      pvp: resolveInspectPvp(profile),
      canAddFriend: !hasFriend(viewerPlayerId, viewerCharacterId, targetPlayerId, targetCharacterId),
      canInviteDuel: duelGate.canInviteDuel,
      duelInviteBlockReason: duelGate.duelInviteBlockReason,
      canTrade: isWithinPlayerTradeRange(viewer.x, viewer.y, target.x, target.y),
    },
  };
}

export class InspectPlayerHandler extends BaseIntentHandler<InspectPlayerPayload> {
  readonly actionType = 'INSPECT_PLAYER';

  async execute(playerId: string, payload: InspectPlayerPayload, intentId: string): Promise<void> {
    const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId.trim() : '';
    const targetCharacterId = Number(payload.targetCharacterId);
    const built = buildPlayerInspectView(playerId, this.characterId, targetPlayerId, targetCharacterId);
    if (!built.ok) {
      this.sendResponse(playerId, intentId, false, built.reason);
      return;
    }
    this.sendResponse(playerId, intentId, true, { inspect: built.view });
  }
}

let handler: InspectPlayerHandler | null = null;

export function getInspectPlayerHandler(): InspectPlayerHandler {
  if (!handler) handler = new InspectPlayerHandler();
  return handler;
}
