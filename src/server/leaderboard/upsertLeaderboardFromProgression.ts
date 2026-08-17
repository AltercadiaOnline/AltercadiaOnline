import type { ClassType } from '../../shared/types/classes.js';
import { isClassType } from '../../shared/progression/movesetMasterySeed.js';
import type { PersistedCharacterProfileSlice } from '../../shared/persistence/characterPersistenceRecord.js';
import { PVP_RANKED_DEFAULT_RATING } from '../combat/pvp/pvpRankedRating.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import type { LeaderboardStatRow } from '../../shared/leaderboard/leaderboardTypes.js';
import { getLeaderboardRow, upsertLeaderboardRow } from './leaderboardMemoryStore.js';

function sumMovesetXp(mastery: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const value of Object.values(mastery)) {
    if (Number.isFinite(value)) total += Math.max(0, Math.floor(value));
  }
  return total;
}

function resolveClassId(profile: PersistedCharacterProfileSlice): ClassType | null {
  return isClassType(profile.classId) ? profile.classId : null;
}

function resolveDisplayName(profile: PersistedCharacterProfileSlice, playerId: string): string {
  const name = profile.displayName?.trim();
  return name && name.length > 0 ? name : playerId.slice(0, 12);
}

function previousRow(playerId: string, characterId: number): LeaderboardStatRow | undefined {
  return getLeaderboardRow(playerId, characterId);
}

/**
 * Recalcula a linha do personagem a partir do store autoritativo.
 * reachedAt só avança quando o critério da board muda.
 */
export function upsertLeaderboardFromProgression(
  playerId: string,
  characterId: number,
  nowMs: number = Date.now(),
): void {
  const state = getAuthoritativeProgression(playerId, characterId);
  const profile = state.characterProfile;
  const prev = previousRow(playerId, characterId);
  const movesetXp = sumMovesetXp(state.progression.movesetMastery);
  const pvpRating = typeof profile.pvpRating === 'number' && Number.isFinite(profile.pvpRating)
    ? Math.max(0, Math.floor(profile.pvpRating))
    : PVP_RANKED_DEFAULT_RATING;
  const pvpWins = Math.max(0, Math.floor(profile.pvpWins ?? 0));
  const pvpLosses = Math.max(0, Math.floor(profile.pvpLosses ?? 0));
  const pvpMatches = Math.max(0, Math.floor(profile.pvpMatches ?? (pvpWins + pvpLosses)));
  const pveKills = Math.max(0, Math.floor(profile.pveKills ?? 0));
  const pveBossKills = Math.max(0, Math.floor(profile.pveBossKills ?? 0));
  const pveDungeonClears = Math.max(0, Math.floor(profile.pveDungeonClears ?? 0));
  const level = Math.max(1, Math.floor(profile.level));
  const xpCurrent = Math.max(0, Math.floor(profile.xpCurrent));

  const levelChanged = !prev || prev.level !== level;
  const movesetChanged = !prev || prev.movesetXp !== movesetXp;
  const pvpChanged = !prev || prev.pvpRating !== pvpRating;
  const pveChanged = !prev
    || prev.pveDungeonClears !== pveDungeonClears
    || prev.pveBossKills !== pveBossKills
    || prev.pveKills !== pveKills;

  upsertLeaderboardRow({
    playerId,
    characterId,
    displayName: resolveDisplayName(profile, playerId),
    classId: resolveClassId(profile),
    level,
    xpCurrent,
    levelReachedAt: levelChanged ? nowMs : (prev?.levelReachedAt ?? nowMs),
    movesetXp,
    movesetReachedAt: movesetChanged ? nowMs : (prev?.movesetReachedAt ?? nowMs),
    pvpRating,
    pvpWins,
    pvpLosses,
    pvpMatches,
    pvpRatingReachedAt: pvpChanged ? nowMs : (prev?.pvpRatingReachedAt ?? nowMs),
    pveDungeonClears,
    pveBossKills,
    pveKills,
    pveScoreReachedAt: pveChanged ? nowMs : (prev?.pveScoreReachedAt ?? nowMs),
    updatedAt: nowMs,
  });
}
